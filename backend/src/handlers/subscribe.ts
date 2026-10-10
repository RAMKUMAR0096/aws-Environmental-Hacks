import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { SNSClient, SubscribeCommand } from '@aws-sdk/client-sns';
import { saveSubscription } from '../lib/ddb.js';
import { AreaName, RiskLevel } from '../lib/types.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const region = process.env.AWS_REGION || 'ap-south-1';
const SNS_TOPIC_ARN = process.env.SNS_ALERTS_TOPIC_ARN;

let snsClient: SNSClient | null = null;
if (Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
  try {
    snsClient = new SNSClient({ region });
  } catch {
    snsClient = null;
  }
}

const SubscribeSchema = z.object({
  email: z.string().email(),
  area: z.enum(['Velachery', 'Pallikaranai', 'Mudichur', 'Medavakkam']),
  threshold: z.enum(['moderate', 'high', 'severe']).default('high'),
});

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'BadRequest', message: 'Missing subscription body' }),
      };
    }

    const parsed = SubscribeSchema.safeParse(JSON.parse(event.body));
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'ValidationError', message: parsed.error.issues }),
      };
    }

    const { email, area, threshold } = parsed.data;

    // Trigger Amazon SNS subscription if topic is configured
    let snsSubscriptionArn = 'mock-subscription-pending';
    if (snsClient && SNS_TOPIC_ARN) {
      try {
        const snsRes = await snsClient.send(new SubscribeCommand({
          TopicArn: SNS_TOPIC_ARN,
          Protocol: 'email',
          Endpoint: email,
          ReturnSubscriptionArn: true,
        }));
        snsSubscriptionArn = snsRes.SubscriptionArn || 'pending confirmation';
      } catch (snsErr) {
        console.warn('SNS subscribe warning:', snsErr);
      }
    }

    await saveSubscription({
      email,
      area: area as AreaName,
      threshold: threshold as RiskLevel,
      createdAt: new Date().toISOString(),
      confirmed: false,
    });

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Subscription created successfully. Please check your email inbox to confirm the SNS alert subscription.',
        email,
        area,
        threshold,
        status: 'pending_confirmation',
      }),
    };
  } catch (err: any) {
    console.error('Error in subscribe handler:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'SubscriptionError', message: err.message }),
    };
  }
}
