import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  getAllSegments,
  getSegmentById,
  getAllRiskRecords,
  getRiskBySegmentId,
  getVerifiedReportsLast2Hours
} from '../lib/ddb.js';
import { computeSegmentRisk, DEMO_HEAVY_RAIN_METRICS } from '../lib/risk.js';
import { SegmentWithRisk } from '../lib/types.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const isDemo =
    event.queryStringParameters?.demo === 'heavy-rain' ||
    event.queryStringParameters?.demo === 'true';

  const segmentId = event.pathParameters?.segmentId;

  try {
    // Branch 1: Single segment by ID
    if (segmentId) {
      const segment = await getSegmentById(segmentId);
      if (!segment) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'NotFound', message: `Segment ${segmentId} not found` }),
        };
      }

      let risk;
      if (isDemo) {
        risk = computeSegmentRisk(segment, DEMO_HEAVY_RAIN_METRICS, 1, true, true);
      } else {
        risk = await getRiskBySegmentId(segmentId);
        if (!risk) {
          // If not precomputed yet, compute on demand with dry baseline
          risk = computeSegmentRisk(segment, { next3hMm: 0, maxHourlyMm: 0, past24hMm: 0 }, 0, true, false);
        }
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          segment,
          risk,
        }),
      };
    }

    // Branch 2: All segments with current risk
    const [segments, savedRisks, allReports] = await Promise.all([
      getAllSegments(),
      getAllRiskRecords(),
      getVerifiedReportsLast2Hours(),
    ]);

    const riskMap = new Map(savedRisks.map(r => [r.segmentId, r]));

    const result: SegmentWithRisk[] = segments.map(seg => {
      let risk;
      if (isDemo) {
        const segReports = allReports.filter(r => r.segmentId === seg.segmentId);
        risk = computeSegmentRisk(seg, DEMO_HEAVY_RAIN_METRICS, segReports.length, true, true);
      } else {
        risk = riskMap.get(seg.segmentId);
        if (!risk) {
          // Baseline if database doesn't have computed row yet
          risk = computeSegmentRisk(seg, { next3hMm: 0, maxHourlyMm: 0, past24hMm: 0 }, 0, true, false);
        }
      }

      return {
        ...seg,
        risk,
      };
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        isSimulated: isDemo,
        updatedAt: new Date().toISOString(),
        totalSegments: result.length,
        segments: result,
      }),
    };
  } catch (err: any) {
    console.error('Error in getRisk handler:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'InternalServerError', message: err.message }),
    };
  }
}
