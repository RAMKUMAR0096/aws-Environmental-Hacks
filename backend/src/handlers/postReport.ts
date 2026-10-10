import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { getAllSegments, saveReportRecord, getRiskBySegmentId, saveRiskRecord, getVerifiedReportsLast2Hours } from '../lib/ddb.js';
import { isInsidePilotZone, findNearestSegment } from '../lib/geo.js';
import { analyzeFloodPhotoWithBedrock } from '../lib/bedrock.js';
import { computeSegmentRisk } from '../lib/risk.js';
import { ReportRecord } from '../lib/types.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PostReportSchema = z.object({
  photoKey: z.string().min(1),
  lat: z.number().min(12.5).max(13.5),
  lng: z.number().min(80.0).max(80.5),
  imageBase64: z.string().optional(),
});

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'BadRequest', message: 'Missing report body' }),
      };
    }

    const parsed = PostReportSchema.safeParse(JSON.parse(event.body));
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'ValidationError', message: parsed.error.issues }),
      };
    }

    const { photoKey, lat, lng, imageBase64 } = parsed.data;

    // Validate coordinates are within the pilot zone
    if (!isInsidePilotZone(lat, lng)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'OutOfBounds',
          message: 'Location is outside the pilot zone (Velachery, Pallikaranai, Mudichur, Medavakkam)',
        }),
      };
    }

    // Find nearest street segment
    const allSegments = await getAllSegments();
    const nearestResult = findNearestSegment(lat, lng, allSegments);

    if (!nearestResult) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'NotFound', message: 'No nearby street segment found' }),
      };
    }

    const targetSegment = nearestResult.segment;

    // Analyze photo with Bedrock Converse API
    let imageBytes: Uint8Array | undefined;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBytes = Uint8Array.from(Buffer.from(cleanBase64, 'base64'));
    }

    const aiVerdict = await analyzeFloodPhotoWithBedrock(photoKey, imageBytes, 'image/jpeg');

    const isVerified = aiVerdict.floodingVisible && aiVerdict.confidence >= 0.6;
    const status = isVerified ? 'verified' : 'unverified';

    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const reportRecord: ReportRecord = {
      reportId,
      segmentId: targetSegment.segmentId,
      area: targetSegment.area,
      lat,
      lng,
      photoKey,
      createdAt: new Date().toISOString(),
      aiVerdict,
      status,
    };

    await saveReportRecord(reportRecord);

    // If verified, immediately recalculate and bump segment risk in real-time
    let updatedRisk = null;
    if (isVerified) {
      const currentRisk = await getRiskBySegmentId(targetSegment.segmentId);
      const verifiedReports = await getVerifiedReportsLast2Hours(targetSegment.segmentId);
      const rain = currentRisk?.rain || { next3hMm: 0, maxHourlyMm: 0, past24hMm: 0 };

      updatedRisk = computeSegmentRisk(
        targetSegment,
        rain,
        verifiedReports.length,
        true,
        false
      );
      await saveRiskRecord(updatedRisk);
    }

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Report submitted successfully',
        report: reportRecord,
        nearestSegment: {
          segmentId: targetSegment.segmentId,
          name: targetSegment.name,
          distanceMeters: nearestResult.distanceM,
        },
        riskUpdated: isVerified,
        updatedRisk,
      }),
    };
  } catch (err: any) {
    console.error('Error in postReport handler:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'ReportSubmissionError', message: err.message }),
    };
  }
}
