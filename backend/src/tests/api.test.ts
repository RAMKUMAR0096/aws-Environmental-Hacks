import { describe, it, expect } from 'vitest';
import { handler as getRiskHandler } from '../handlers/getRisk.js';
import { handler as getRouteHandler } from '../handlers/getRoute.js';
import { handler as getHotspotsHandler } from '../handlers/getHotspots.js';
import { handler as subscribeHandler } from '../handlers/subscribe.js';
import { handler as postReportHandler } from '../handlers/postReport.js';

describe('Slice 2 & Core Handlers Integration Tests', () => {
  it('GET /risk returns all seeded segments and risk scores', async () => {
    const res: any = await getRiskHandler({
      queryStringParameters: {},
    } as any);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.totalSegments).toBeGreaterThanOrEqual(25);
    expect(body.segments.length).toBeGreaterThanOrEqual(25);
    expect(body.isSimulated).toBe(false);
    expect(body.segments[0].risk).toBeDefined();
    expect(body.segments[0].risk.score).toBeGreaterThanOrEqual(0);
  });

  it('GET /risk?demo=heavy-rain returns simulated severe risk across segments', async () => {
    const res: any = await getRiskHandler({
      queryStringParameters: { demo: 'heavy-rain' },
    } as any);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.isSimulated).toBe(true);
    // Under heavy rain, high-risk or severe segments exist
    const highOrSevere = body.segments.filter((s: any) => s.risk.level === 'high' || s.risk.level === 'severe');
    expect(highOrSevere.length).toBeGreaterThan(0);
  });

  it('POST /route returns default and safe alternate routes with avoided streets', async () => {
    // Route from Velachery to Pallikaranai
    const res: any = await getRouteHandler({
      body: JSON.stringify({
        from: { lat: 12.985, lng: 80.218 },
        to: { lat: 12.940, lng: 80.215 },
        demo: true,
      }),
    } as any);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.defaultRoute).toBeDefined();
    expect(body.safeRoute).toBeDefined();
    expect(body.defaultRoute.geometry.coordinates.length).toBeGreaterThan(0);
    expect(Array.isArray(body.avoidedSegments)).toBe(true);
    expect(typeof body.extraMinutes).toBe('number');
  });

  it('GET /hotspots returns ranked top 10 choke points and recurring spots', async () => {
    const res: any = await getHotspotsHandler({
      queryStringParameters: {},
    } as any);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.topHotspots.length).toBeLessThanOrEqual(10);
    expect(body.topHotspots[0].rank).toBe(1);
    expect(body.recurringChokePoints.length).toBeGreaterThan(0);
  });

  it('GET /hotspots?format=csv returns CSV formatted content', async () => {
    const res: any = await getHotspotsHandler({
      queryStringParameters: { format: 'csv' },
    } as any);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toContain('text/csv');
    expect(res.body).toContain('Rank,SegmentID,StreetName');
  });

  it('POST /subscribe validates email format and returns confirmation', async () => {
    const res: any = await subscribeHandler({
      body: JSON.stringify({
        email: 'resident@example.com',
        area: 'Velachery',
        threshold: 'high',
      }),
    } as any);

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('pending_confirmation');
    expect(body.email).toBe('resident@example.com');
  });

  it('POST /report rejects coordinates outside the pilot zone', async () => {
    const res: any = await postReportHandler({
      body: JSON.stringify({
        photoKey: 'reports/test.jpg',
        lat: 13.50, // Far North Chennai / out of bounds
        lng: 80.25,
      }),
    } as any);

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('OutOfBounds');
  });
});
