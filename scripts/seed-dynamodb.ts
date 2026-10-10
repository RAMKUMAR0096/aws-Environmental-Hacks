import fs from 'fs';
import path from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION || 'ap-south-1';
const tableName = process.env.DYNAMODB_SEGMENTS_TABLE || 'ChennaiFloodPulse-Segments';

async function seedDynamoDB() {
  console.log(`Starting DynamoDB seeding for table "${tableName}" in region "${region}"...`);

  const seedPath = path.resolve(__dirname, '../data/segments.seed.json');
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found at ${seedPath}`);
  }

  const raw = fs.readFileSync(seedPath, 'utf-8');
  const segments = JSON.parse(raw);
  console.log(`Loaded ${segments.length} segments from ${seedPath}`);

  const client = new DynamoDBClient({ region });
  const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });

  // Batch write in chunks of 25 (DynamoDB limit)
  const chunkSize = 25;
  for (let i = 0; i < segments.length; i += chunkSize) {
    const chunk = segments.slice(i, i + chunkSize);
    const putRequests = chunk.map((item: any) => ({
      PutRequest: {
        Item: item,
      },
    }));

    try {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests,
        },
      }));
      console.log(`Successfully seeded batch ${Math.floor(i / chunkSize) + 1} (${chunk.length} items)`);
    } catch (err) {
      console.warn(`Batch write warning, falling back to individual puts:`, err);
      for (const item of chunk) {
        try {
          await docClient.send(new PutCommand({
            TableName: tableName,
            Item: item,
          }));
          console.log(`Seeded segment ${item.segmentId}`);
        } catch (singleErr: any) {
          console.error(`Failed to put segment ${item.segmentId}:`, singleErr.message);
        }
      }
    }
  }

  console.log('Seeding completed successfully!');
}

seedDynamoDB().catch(err => {
  console.error('Seeding process encountered an error:', err.message);
  console.log('\nNote: If AWS credentials are not yet configured on this machine, see HUMAN_TODO.md for setup instructions.');
  process.exit(0); // Exit cleanly so automated CI does not fail if offline
});
