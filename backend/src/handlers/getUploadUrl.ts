import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const region = process.env.AWS_REGION || 'ap-south-1';
const bucketName = process.env.REPORTS_S3_BUCKET;

let s3Client: S3Client | null = null;
if (Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
  try {
    s3Client = new S3Client({ region });
  } catch {
    s3Client = null;
  }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const photoKey = `reports/${reportId}.jpg`;

    let uploadUrl = '';

    if (s3Client && bucketName) {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: photoKey,
        ContentType: 'image/jpeg',
      });
      uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes
    } else {
      // Local development mock URL
      uploadUrl = `https://mock-s3.local/${photoKey}`;
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        reportId,
        photoKey,
        uploadUrl,
        expiresInSeconds: 300,
      }),
    };
  } catch (err: any) {
    console.error('Error in getUploadUrl handler:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'UploadUrlError', message: err.message }),
    };
  }
}
