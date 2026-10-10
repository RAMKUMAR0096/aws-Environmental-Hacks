export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type AreaName = 'Velachery' | 'Pallikaranai' | 'Mudichur' | 'Medavakkam';

export interface HistorySource {
  title: string;
  url: string;
  year: number;
}

export interface Segment {
  segmentId: string;
  name: string;
  area: AreaName;
  geometry: [number, number][]; // [[lng, lat], ...]
  midpoint: { lat: number; lng: number };
  elevationM: number;
  elevationNorm: number; // 0 = highest, 1 = lowest / most vulnerable
  historyFlag: boolean;
  historySource: HistorySource | null;
}

export interface RainMetrics {
  next3hMm: number;
  maxHourlyMm: number;
  past24hMm: number;
}

export interface RiskFactors {
  rainScore: number;     // 0..1
  terrainScore: number;  // 0..1
  historyScore: number;  // 0 or 1
  reportScore: number;   // 0..1
}

export interface RiskRecord {
  segmentId: string;
  score: number;         // 0..100
  level: RiskLevel;
  confidence: ConfidenceLevel;
  factors: RiskFactors;
  rain: RainMetrics;
  verifiedReports2h: number;
  updatedAt: string;     // ISO string
  isSimulated?: boolean;
  explanation?: string;  // Plain English why it's risky
}

export interface SegmentWithRisk extends Segment {
  risk: RiskRecord;
}

export type DepthClass = 'none' | 'ankle' | 'knee' | 'waist' | 'unknown';
export type ReportStatus = 'verified' | 'unverified' | 'rejected';

export interface ReportAiVerdict {
  floodingVisible: boolean;
  depthClass: DepthClass;
  confidence: number;
  note: string;
  source: 'bedrock' | 'unverified';
}

export interface ReportRecord {
  reportId: string;
  segmentId: string;
  area: AreaName;
  lat: number;
  lng: number;
  photoKey: string;
  photoUrl?: string;
  createdAt: string;
  aiVerdict: ReportAiVerdict;
  status: ReportStatus;
}

export interface SubscriptionRecord {
  email: string;
  area: AreaName;
  threshold: RiskLevel;
  createdAt: string;
  confirmed: boolean;
}

export interface RiskHistoryRecord {
  segmentId: string;
  ts: string;
  score: number;
  level: RiskLevel;
  ttl?: number;
}

export interface AreaCentroid {
  area: AreaName;
  lat: number;
  lng: number;
}

export const AREA_CENTROIDS: Record<AreaName, { lat: number; lng: number }> = {
  Velachery: { lat: 12.9815, lng: 80.2185 },
  Pallikaranai: { lat: 12.9431, lng: 80.2148 },
  Mudichur: { lat: 12.9185, lng: 80.0685 },
  Medavakkam: { lat: 12.9230, lng: 80.1885 },
};

// Pilot-zone bounding box (covers all 4 areas with margin)
export const PILOT_BOUNDS = {
  minLat: 12.880,
  maxLat: 13.020,
  minLng: 80.030,
  maxLng: 80.250,
};
