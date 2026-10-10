import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { fetchAllAreasPrecipitation } from '../lib/weather.js';
import { computeSegmentRisk } from '../lib/risk.js';
import {
  getAllSegments,
  saveRiskRecord,
  saveRiskHistory,
  getVerifiedReportsLast2Hours,
  getAllSubscriptions
} from '../lib/ddb.js';
import { AreaName, RiskLevel } from '../lib/types.js';

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const SNS_TOPIC_ARN = process.env.SNS_ALERTS_TOPIC_ARN;

// In-memory alert cache for 3-hour deduplication per area
const lastAlertSentTime: Record<string, number> = {};

const RISK_WEIGHTS: Record<RiskLevel, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  severe: 4,
};

export async function handler(): Promise<APIGatewayProxyResultV2> {
  console.log('Starting risk computation job at', new Date().toISOString());

  try {
    const [segments, weatherMap, allReports, subscriptions] = await Promise.all([
      getAllSegments(),
      fetchAllAreasPrecipitation(),
      getVerifiedReportsLast2Hours(),
      getAllSubscriptions(),
    ]);

    console.log(`Processing ${segments.length} segments across 4 pilot areas...`);

    const areaMaxRisk: Record<AreaName, RiskLevel> = {
      Velachery: 'low',
      Pallikaranai: 'low',
      Mudichur: 'low',
      Medavakkam: 'low',
    };

    for (const segment of segments) {
      const weather = weatherMap[segment.area] || {
        metrics: { next3hMm: 0, maxHourlyMm: 0, past24hMm: 0 },
        success: false
      };

      const segReports = allReports.filter(r => r.segmentId === segment.segmentId);
      const riskRecord = computeSegmentRisk(
        segment,
        weather.metrics,
        segReports.length,
        weather.success,
        false // live run, not simulated
      );

      // Save updated risk record
      await saveRiskRecord(riskRecord);

      // Update area max risk tracking
      if (RISK_WEIGHTS[riskRecord.level] > RISK_WEIGHTS[areaMaxRisk[segment.area]]) {
        areaMaxRisk[segment.area] = riskRecord.level;
      }

      // Record recurring choke points in RiskHistory if high or severe
      if (riskRecord.level === 'high' || riskRecord.level === 'severe') {
        await saveRiskHistory({
          segmentId: segment.segmentId,
          ts: new Date().toISOString(),
          score: riskRecord.score,
          level: riskRecord.level
        });
      }
    }

    // Process area alerts with 3-hour deduplication
    const now = Date.now();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

    for (const sub of subscriptions) {
      const currentAreaLevel = areaMaxRisk[sub.area];
      const thresholdMet = RISK_WEIGHTS[currentAreaLevel] >= RISK_WEIGHTS[sub.threshold];

      if (thresholdMet) {
        const lastSent = lastAlertSentTime[`${sub.email}#${sub.area}`] || 0;
        if (now - lastSent >= THREE_HOURS_MS) {
          lastAlertSentTime[`${sub.email}#${sub.area}`] = now;
          if (SNS_TOPIC_ARN) {
            try {
              await snsClient.send(new PublishCommand({
                TopicArn: SNS_TOPIC_ARN,
                Subject: `[Chennai Flood Pulse] ${sub.area} Flood Risk Alert: ${currentAreaLevel.toUpperCase()}`,
                Message: `Hello,\n\nThe current 3-hour flood risk index for ${sub.area} has reached "${currentAreaLevel.toUpperCase()}".\nPlease exercise caution and avoid low-lying street corridors.\n\nLive Map: https://chennaifloodpulse.amplifyapp.com\n- Chennai Flood Pulse Team`,
              }));
              console.log(`Alert published to SNS for ${sub.area} (${sub.email})`);
            } catch (snsErr) {
              console.warn('SNS publish failed:', snsErr);
            }
          }
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Risk recomputation complete',
        timestamp: new Date().toISOString(),
        segmentCount: segments.length,
        areaRiskSummary: areaMaxRisk
      }),
    };
  } catch (err: any) {
    console.error('Fatal error during risk recomputation:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'RiskComputationError', message: err.message }),
    };
  }
}
