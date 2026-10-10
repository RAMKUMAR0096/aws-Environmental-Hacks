import { describe, it, expect } from 'vitest';
import {
  computeRiskFactors,
  computeRiskScore,
  computeConfidence,
  computeSegmentRisk,
  DEMO_HEAVY_RAIN_METRICS
} from '../lib/risk.js';
import { Segment } from '../lib/types.js';

const mockSegment: Segment = {
  segmentId: 'test-01',
  name: 'Test Road',
  area: 'Velachery',
  geometry: [[80.21, 12.98], [80.22, 12.99]],
  midpoint: { lat: 12.985, lng: 80.215 },
  elevationM: 3.5,
  elevationNorm: 0.85, // Low ground
  historyFlag: true,
  historySource: {
    title: 'Test Flood Article',
    url: 'https://example.com/test',
    year: 2023
  }
};

describe('Slice 2: Rule-Based Risk Engine', () => {
  it('caps risk score at 10 in dry weather with no reports', () => {
    const dryRain = { next3hMm: 0.2, maxHourlyMm: 0.2, past24hMm: 0.0 };
    const factors = computeRiskFactors(dryRain, mockSegment.elevationNorm, mockSegment.historyFlag, 0);
    const { score, level } = computeRiskScore(factors, dryRain, 0);

    expect(score).toBeLessThanOrEqual(10);
    expect(level).toBe('low');
  });

  it('computes severe risk during extreme torrential rainfall', () => {
    const torrentialRain = { next3hMm: 75, maxHourlyMm: 35, past24hMm: 110 };
    const factors = computeRiskFactors(torrentialRain, mockSegment.elevationNorm, mockSegment.historyFlag, 0);
    const { score, level } = computeRiskScore(factors, torrentialRain, 0);

    expect(score).toBeGreaterThanOrEqual(80);
    expect(level).toBe('severe');
  });

  it('boosts risk score when verified citizen reports exist even with moderate rain', () => {
    const moderateRain = { next3hMm: 12, maxHourlyMm: 6, past24hMm: 20 };
    const factorsNoReports = computeRiskFactors(moderateRain, mockSegment.elevationNorm, mockSegment.historyFlag, 0);
    const resultNoReports = computeRiskScore(factorsNoReports, moderateRain, 0);

    const factorsWithReports = computeRiskFactors(moderateRain, mockSegment.elevationNorm, mockSegment.historyFlag, 3);
    const resultWithReports = computeRiskScore(factorsWithReports, moderateRain, 3);

    expect(resultWithReports.score).toBeGreaterThan(resultNoReports.score);
    expect(resultWithReports.score - resultNoReports.score).toBeCloseTo(25, 0);
  });

  it('assigns confidence levels accurately based on forecast status and history', () => {
    // Forecast success + historyFlag true -> high confidence
    expect(computeConfidence(true, true, 0)).toBe('high');

    // Forecast success + historyFlag false + 1 report -> high confidence
    expect(computeConfidence(true, false, 1)).toBe('high');

    // Forecast success + historyFlag false + 0 reports -> medium confidence
    expect(computeConfidence(true, false, 0)).toBe('medium');

    // Forecast failure -> low confidence (stale data warning)
    expect(computeConfidence(false, true, 0)).toBe('low');
    expect(computeConfidence(false, false, 0)).toBe('low');
  });

  it('generates a full segment risk object with synthetic demo mode', () => {
    const demoRisk = computeSegmentRisk(mockSegment, DEMO_HEAVY_RAIN_METRICS, 1, true, true);

    expect(demoRisk.isSimulated).toBe(true);
    expect(demoRisk.score).toBeGreaterThanOrEqual(60);
    expect(demoRisk.factors.rainScore).toBeGreaterThan(0.5);
    expect(demoRisk.explanation).toBeDefined();
    expect(demoRisk.explanation).toContain('risk');
  });
});
