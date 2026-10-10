import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { getAllSegments, getAllRiskRecords, getVerifiedReportsLast2Hours } from '../lib/ddb.js';
import { computeSegmentRisk, DEMO_HEAVY_RAIN_METRICS } from '../lib/risk.js';
import { calculateSafeRoute } from '../lib/location.js';
import { isInsidePilotZone } from '../lib/geo.js';
import { SegmentWithRisk } from '../lib/types.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const RouteRequestSchema = z.object({
  from: z.object({
    lat: z.number().min(12.0).max(14.0),
    lng: z.number().min(79.0).max(81.0),
  }),
  to: z.object({
    lat: z.number().min(12.0).max(14.0),
    lng: z.number().min(79.0).max(81.0),
  }),
  demo: z.boolean().optional(),
});

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'BadRequest', message: 'Missing request body' }),
      };
    }

    const parsed = RouteRequestSchema.safeParse(JSON.parse(event.body));
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'ValidationError', message: parsed.error.issues }),
      };
    }

    const { from, to, demo } = parsed.data;

    // Pilot-zone bounds verification
    const fromInPilot = isInsidePilotZone(from.lat, from.lng);
    const toInPilot = isInsidePilotZone(to.lat, to.lng);

    if (!fromInPilot || !toInPilot) {
      console.warn('Coordinates outside pilot zone warning:', { from, to });
    }

    const [segments, savedRisks, allReports] = await Promise.all([
      getAllSegments(),
      getAllRiskRecords(),
      getVerifiedReportsLast2Hours(),
    ]);

    const riskMap = new Map(savedRisks.map(r => [r.segmentId, r]));

    const segmentsWithRisk: SegmentWithRisk[] = segments.map(seg => {
      let risk;
      if (demo) {
        const segReports = allReports.filter(r => r.segmentId === seg.segmentId);
        risk = computeSegmentRisk(seg, DEMO_HEAVY_RAIN_METRICS, segReports.length, true, true);
      } else {
        risk = riskMap.get(seg.segmentId);
        if (!risk) {
          risk = computeSegmentRisk(seg, { next3hMm: 0, maxHourlyMm: 0, past24hMm: 0 }, 0, true, false);
        }
      }
      return { ...seg, risk };
    });

    const routeResult = await calculateSafeRoute(from, to, segmentsWithRisk);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ...routeResult,
        isSimulated: Boolean(demo),
      }),
    };
  } catch (err: any) {
    console.error('Error in getRoute handler:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'RoutingError', message: err.message }),
    };
  }
}
