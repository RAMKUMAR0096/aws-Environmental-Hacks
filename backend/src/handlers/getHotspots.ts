import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getAllSegments, getAllRiskRecords, getVerifiedReportsLast2Hours, getAllRiskHistory } from '../lib/ddb.js';
import { computeSegmentRisk, DEMO_HEAVY_RAIN_METRICS } from '../lib/risk.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const isDemo = event.queryStringParameters?.demo === 'heavy-rain' || event.queryStringParameters?.demo === 'true';
  const format = event.queryStringParameters?.format;

  try {
    const [segments, savedRisks, allReports, history] = await Promise.all([
      getAllSegments(),
      getAllRiskRecords(),
      getVerifiedReportsLast2Hours(),
      getAllRiskHistory(),
    ]);

    const riskMap = new Map(savedRisks.map(r => [r.segmentId, r]));

    // Build segment rows with current risk
    const rows = segments.map(seg => {
      let risk;
      const segReports = allReports.filter(r => r.segmentId === seg.segmentId);
      if (isDemo) {
        risk = computeSegmentRisk(seg, DEMO_HEAVY_RAIN_METRICS, segReports.length, true, true);
      } else {
        risk = riskMap.get(seg.segmentId) || computeSegmentRisk(seg, { next3hMm: 0, maxHourlyMm: 0, past24hMm: 0 }, 0, true, false);
      }

      return {
        segmentId: seg.segmentId,
        name: seg.name,
        area: seg.area,
        elevationM: seg.elevationM,
        score: risk.score,
        level: risk.level,
        confidence: risk.confidence,
        reportCount: segReports.length,
        rainNext3h: risk.rain.next3hMm,
        historyFlag: seg.historyFlag,
      };
    });

    // Rank top 10 by risk score descending, then by reportCount descending
    rows.sort((a, b) => b.score - a.score || b.reportCount - a.reportCount);
    const top10 = rows.slice(0, 10).map((item, idx) => ({ rank: idx + 1, ...item }));

    // Recurring choke points from RiskHistory (or historical flags if history table is new)
    const historyCounts: Record<string, number> = {};
    for (const h of history) {
      historyCounts[h.segmentId] = (historyCounts[h.segmentId] || 0) + 1;
    }

    const recurring = segments
      .filter(s => s.historyFlag || (historyCounts[s.segmentId] || 0) >= 2)
      .map(s => ({
        segmentId: s.segmentId,
        name: s.name,
        area: s.area,
        elevationM: s.elevationM,
        eventsCount: (historyCounts[s.segmentId] || 0) + (s.historyFlag ? 3 : 0),
        source: s.historySource?.title || 'Documented monsoon inundation point',
      }))
      .slice(0, 10);

    // CSV format export support
    if (format === 'csv') {
      const csvHeader = 'Rank,SegmentID,StreetName,Area,ElevationM,Score,Level,Confidence,ActiveReports\n';
      const csvLines = top10.map(
        r => `${r.rank},"${r.segmentId}","${r.name}","${r.area}",${r.elevationM},${r.score},"${r.level}","${r.confidence}",${r.reportCount}`
      );
      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="chennai-flood-hotspots.csv"',
        },
        body: csvHeader + csvLines.join('\n'),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        isSimulated: isDemo,
        updatedAt: new Date().toISOString(),
        topHotspots: top10,
        recurringChokePoints: recurring,
      }),
    };
  } catch (err: any) {
    console.error('Error in getHotspots handler:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'HotspotsError', message: err.message }),
    };
  }
}
