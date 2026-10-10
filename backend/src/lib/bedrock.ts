import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ReportAiVerdict } from './types.js';

const region = process.env.AWS_REGION || 'ap-south-1';
const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

let bedrockClient: BedrockRuntimeClient | null = null;
let s3Client: S3Client | null = null;

if (Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
  try {
    bedrockClient = new BedrockRuntimeClient({ region });
    s3Client = new S3Client({ region });
  } catch {
    bedrockClient = null;
    s3Client = null;
  }
}

const SYSTEM_PROMPT = `You verify citizen flood reports for a city flood-warning app.
Look at the photo. Respond ONLY with JSON:
{"floodingVisible": boolean, "depthClass": "none|ankle|knee|waist|unknown",
 "confidence": number between 0 and 1, "note": "one short sentence"}
Be conservative: if the image is unclear, not a street, or you cannot judge depth, use "unknown" and lower confidence.
Do not identify any person.`;

export async function analyzeFloodPhotoWithBedrock(
  photoKey: string,
  imageBytes?: Uint8Array,
  mimeType: string = 'image/jpeg'
): Promise<ReportAiVerdict> {
  // If Bedrock client or image bytes not available and S3 bucket configured, try reading bytes from S3
  let bytes = imageBytes;
  if (!bytes && s3Client && process.env.REPORTS_S3_BUCKET) {
    try {
      const s3Res = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.REPORTS_S3_BUCKET,
        Key: photoKey
      }));
      if (s3Res.Body) {
        const byteArr = await s3Res.Body.transformToByteArray();
        bytes = byteArr;
      }
    } catch (s3Err) {
      console.warn('Could not read image bytes from S3:', s3Err);
    }
  }

  // If Bedrock is not available, return honest unverified verdict (never fake!)
  if (!bedrockClient || !bytes) {
    console.log('Bedrock unavailable or image bytes not loaded; returning unverified status.');
    return {
      floodingVisible: false,
      depthClass: 'unknown',
      confidence: 0,
      note: 'Report saved; AI verification unavailable (Bedrock model access required).',
      source: 'unverified',
    };
  }

  try {
    const format = mimeType.includes('png') ? 'png' : 'jpeg';

    const command = new ConverseCommand({
      modelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: 'user',
          content: [
            {
              image: {
                format,
                source: {
                  bytes,
                },
              },
            },
            {
              text: 'Analyze this citizen report photo for street flooding and water depth.',
            },
          ],
        },
      ],
    });

    const response = await bedrockClient.send(command);
    const responseText = response.output?.message?.content?.[0]?.text || '';

    // Extract JSON block defensively
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Invalid Bedrock JSON output: ${responseText}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const floodingVisible = Boolean(parsed.floodingVisible);
    const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
    const depthClass = ['none', 'ankle', 'knee', 'waist', 'unknown'].includes(parsed.depthClass)
      ? parsed.depthClass
      : 'unknown';
    const note = typeof parsed.note === 'string' ? parsed.note : 'Bedrock photo analysis completed.';

    return {
      floodingVisible,
      depthClass,
      confidence,
      note,
      source: 'bedrock',
    };
  } catch (error: any) {
    console.warn('Amazon Bedrock Converse call failed:', error);
    return {
      floodingVisible: false,
      depthClass: 'unknown',
      confidence: 0,
      note: `Report saved; AI verification unavailable (${error.message || 'Bedrock invocation failed'}).`,
      source: 'unverified',
    };
  }
}
