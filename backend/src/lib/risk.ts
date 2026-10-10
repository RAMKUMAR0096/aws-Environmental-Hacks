import {
  RainMetrics,
  RiskFactors,
  RiskLevel,
  ConfidenceLevel,
  RiskRecord,
  Segment
} from './types.js';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function computeRiskFactors(
  rain: RainMetrics,
  elevationNorm: number,
  historyFlag: boolean,
  verifiedReports2h: number
): RiskFactors {
  const intensity = clamp(rain.maxHourlyMm / 30, 0, 1);
  const accumulation = clamp((rain.past24hMm + rain.next3hMm) / 120, 0, 1);
  const rainScore = Number((0.6 * intensity + 0.4 * accumulation).toFixed(3));

  const terrainScore = Number(clamp(elevationNorm, 0, 1).toFixed(3));
  const historyScore = historyFlag ? 1 : 0;
  const reportScore = Number(clamp(verifiedReports2h / 3, 0, 1).toFixed(3));

  return {
    rainScore,
    terrainScore,
    historyScore,
    reportScore
  };
}

export function computeRiskScore(
  factors: RiskFactors,
  rain: RainMetrics,
  verifiedReports2h: number
): { score: number; level: RiskLevel } {
  // Base weighted risk:
  // base = 100 * rainScore * (0.40 + 0.35 * terrainScore + 0.25 * historyScore)
  const base = 100 * factors.rainScore * (0.40 + 0.35 * factors.terrainScore + 0.25 * factors.historyScore);

  let rawScore = Math.min(100, base + 25 * factors.reportScore);

  // Edge case: dry weather cap
  // If there is no rain (next3hMm < 1 and no verified citizen reports) -> capped at 10
  if (rain.next3hMm < 1 && verifiedReports2h === 0) {
    rawScore = Math.min(10, rawScore);
  }

  const score = Math.round(clamp(rawScore, 0, 100));

  let level: RiskLevel = 'low';
  if (score >= 80) {
    level = 'severe';
  } else if (score >= 60) {
    level = 'high';
  } else if (score >= 30) {
    level = 'moderate';
  } else {
    level = 'low';
  }

  return { score, level };
}

export function computeConfidence(
  forecastSuccess: boolean,
  historyFlag: boolean,
  verifiedReports2h: number
): ConfidenceLevel {
  if (!forecastSuccess) {
    return 'low';
  }
  if (historyFlag || verifiedReports2h >= 1) {
    return 'high';
  }
  return 'medium';
}

export function generateRiskExplanation(
  segment: Segment,
  score: number,
  level: RiskLevel,
  factors: RiskFactors,
  rain: RainMetrics,
  verifiedReports2h: number
): string {
  const parts: string[] = [];

  if (rain.next3hMm < 1 && verifiedReports2h === 0) {
    return `Low risk (${score}/100): Minimal precipitation forecast (<1mm over next 3h) and no active citizen flood reports. Terrain vulnerability is ${Math.round(factors.terrainScore * 100)}%.`;
  }

  parts.push(`${level.toUpperCase()} risk (${score}/100)`);

  if (rain.next3hMm >= 1) {
    parts.push(`Forecast predicts ${rain.next3hMm.toFixed(1)}mm rain over the next 3h (peak ${rain.maxHourlyMm.toFixed(1)}mm/h) on top of ${rain.past24hMm.toFixed(1)}mm past accumulation.`);
  }

  if (factors.terrainScore >= 0.6) {
    parts.push(`Low-lying topography (vulnerability index ${Math.round(factors.terrainScore * 100)}%) creates poor natural drainage.`);
  } else {
    parts.push(`Topography vulnerability is moderate (${Math.round(factors.terrainScore * 100)}%).`);
  }

  if (segment.historyFlag && segment.historySource) {
    parts.push(`Documented flood history: "${segment.historySource.title}" (${segment.historySource.year}).`);
  }

  if (verifiedReports2h > 0) {
    parts.push(`${verifiedReports2h} citizen flood report${verifiedReports2h > 1 ? 's' : ''} verified in the past 2 hours.`);
  }

  return parts.join(' ');
}

// Synthetic scenario for judging & demo (simulates torrential monsoon rain)
export const DEMO_HEAVY_RAIN_METRICS: RainMetrics = {
  next3hMm: 68.0,
  maxHourlyMm: 28.5,
  past24hMm: 95.0,
};

export function computeSegmentRisk(
  segment: Segment,
  rain: RainMetrics,
  verifiedReports2h: number = 0,
  forecastSuccess: boolean = true,
  isSimulated: boolean = false
): RiskRecord {
  const factors = computeRiskFactors(rain, segment.elevationNorm, segment.historyFlag, verifiedReports2h);
  const { score, level } = computeRiskScore(factors, rain, verifiedReports2h);
  const confidence = computeConfidence(forecastSuccess, segment.historyFlag, verifiedReports2h);
  const explanation = generateRiskExplanation(segment, score, level, factors, rain, verifiedReports2h);

  return {
    segmentId: segment.segmentId,
    score,
    level,
    confidence,
    factors,
    rain,
    verifiedReports2h,
    updatedAt: new Date().toISOString(),
    isSimulated,
    explanation,
  };
}
