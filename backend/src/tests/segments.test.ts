import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

interface Segment {
  segmentId: string;
  name: string;
  area: string;
  geometry: [number, number][];
  midpoint: { lat: number; lng: number };
  elevationM: number;
  elevationNorm: number;
  historyFlag: boolean;
  historySource: {
    title: string;
    url: string;
    year: number;
  } | null;
}

describe('Slice 1: Seed Segments Data Integrity', () => {
  const seedPath = path.resolve(__dirname, '../../../data/segments.seed.json');
  expect(fs.existsSync(seedPath)).toBe(true);

  const raw = fs.readFileSync(seedPath, 'utf-8');
  const segments: Segment[] = JSON.parse(raw);

  it('contains between 25 and 40 seeded segments in the pilot zone', () => {
    expect(segments.length).toBeGreaterThanOrEqual(25);
    expect(segments.length).toBeLessThanOrEqual(40);
  });

  it('covers all 4 pilot zone areas', () => {
    const areas = new Set(segments.map(s => s.area));
    expect(areas).toContain('Velachery');
    expect(areas).toContain('Pallikaranai');
    expect(areas).toContain('Mudichur');
    expect(areas).toContain('Medavakkam');
  });

  it('validates elevation normalization within [0, 1]', () => {
    for (const seg of segments) {
      expect(seg.elevationNorm).toBeGreaterThanOrEqual(0);
      expect(seg.elevationNorm).toBeLessThanOrEqual(1);
      expect(typeof seg.elevationM).toBe('number');
    }
  });

  it('validates geometries as valid LineStrings within South Chennai bounding box', () => {
    // South Chennai bounding box roughly: lat [12.85, 13.05], lng [80.00, 80.30]
    for (const seg of segments) {
      expect(Array.isArray(seg.geometry)).toBe(true);
      expect(seg.geometry.length).toBeGreaterThanOrEqual(2);
      expect(seg.geometry.length).toBeLessThanOrEqual(15);

      for (const [lng, lat] of seg.geometry) {
        expect(lng).toBeGreaterThan(80.00);
        expect(lng).toBeLessThan(80.30);
        expect(lat).toBeGreaterThan(12.85);
        expect(lat).toBeLessThan(13.05);
      }

      // Midpoint matches
      expect(seg.midpoint.lat).toBeGreaterThan(12.85);
      expect(seg.midpoint.lat).toBeLessThan(13.05);
      expect(seg.midpoint.lng).toBeGreaterThan(80.00);
      expect(seg.midpoint.lng).toBeLessThan(80.30);
    }
  });

  it('ensures every historyFlag segment has a non-empty, valid public source URL', () => {
    for (const seg of segments) {
      if (seg.historyFlag) {
        expect(seg.historySource).not.toBeNull();
        expect(seg.historySource?.title.length).toBeGreaterThan(5);
        expect(seg.historySource?.url).toMatch(/^https?:\/\//);
        expect(seg.historySource?.year).toBeGreaterThanOrEqual(2015);
      }
    }
  });
});
