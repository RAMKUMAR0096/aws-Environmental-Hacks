import seedSegments from '../data/segments.seed.json';

export interface HistorySource {
  title: string;
  url: string;
  year: number;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type AreaName = 'Velachery' | 'Pallikaranai' | 'Mudichur' | 'Medavakkam';

export interface Segment {
  segmentId: string;
  name: string;
  area: AreaName;
  geometry: [number, number][]; // [[lng, lat], ...]
  midpoint: { lat: number; lng: number };
  elevationM: number;
  elevationNorm: number;
  historyFlag: boolean;
  historySource: HistorySource | null;
}

export interface RiskFactors {
  rainScore: number;
  terrainScore: number;
  historyScore: number;
  reportScore: number;
}

export interface RainMetrics {
  next3hMm: number;
  maxHourlyMm: number;
  past24hMm: number;
}

export interface RiskRecord {
  segmentId: string;
  score: number;
  level: RiskLevel;
  confidence: ConfidenceLevel;
  factors: RiskFactors;
  rain: RainMetrics;
  verifiedReports2h: number;
  updatedAt: string;
  isSimulated?: boolean;
  explanation?: string;
}

export interface SegmentWithRisk extends Segment {
  risk: RiskRecord;
}

export interface RiskApiResponse {
  isSimulated: boolean;
  updatedAt: string;
  totalSegments: number;
  segments: SegmentWithRisk[];
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface RouteOption {
  geometry: RouteGeometry;
  distanceKm: number;
  durationMinutes: number;
  travelMode: string;
}

export interface RouteResponse {
  defaultRoute: RouteOption;
  safeRoute: RouteOption;
  avoidedSegments: Array<{ segmentId: string; name: string; score: number; level: string }>;
  extraMinutes: number;
  stillCrossesHighRisk: boolean;
  message: string;
  provider: string;
  isSimulated?: boolean;
}

export interface HotspotItem {
  rank: number;
  segmentId: string;
  name: string;
  area: AreaName;
  elevationM: number;
  score: number;
  level: RiskLevel;
  confidence: ConfidenceLevel;
  reportCount: number;
  rainNext3h: number;
  historyFlag: boolean;
}

export interface RecurringPoint {
  segmentId: string;
  name: string;
  area: AreaName;
  elevationM: number;
  eventsCount: number;
  source: string;
}

export interface HotspotsResponse {
  isSimulated: boolean;
  updatedAt: string;
  topHotspots: HotspotItem[];
  recurringChokePoints: RecurringPoint[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Fallback generator when local server isn't running yet
function generateLocalFallback(isDemo: boolean = false): RiskApiResponse {
  const segments: SegmentWithRisk[] = (seedSegments as any[]).map(s => {
    let score = 8;
    let level: RiskLevel = 'low';
    let rain: RainMetrics = { next3hMm: 0.2, maxHourlyMm: 0.2, past24hMm: 0 };

    if (isDemo) {
      // Simulate heavy monsoon rain
      rain = { next3hMm: 58, maxHourlyMm: 24, past24hMm: 85 };
      const base = 100 * 0.75 * (0.40 + 0.35 * s.elevationNorm + 0.25 * (s.historyFlag ? 1 : 0));
      score = Math.round(Math.min(100, base));
      level = score >= 80 ? 'severe' : score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'low';
    }

    const confidence: ConfidenceLevel = isDemo ? 'high' : 'medium';

    return {
      segmentId: s.segmentId,
      name: s.name,
      area: s.area as AreaName,
      geometry: s.geometry,
      midpoint: s.midpoint,
      elevationM: s.elevationM,
      elevationNorm: s.elevationNorm,
      historyFlag: s.historyFlag,
      historySource: s.historySource,
      risk: {
        segmentId: s.segmentId,
        score,
        level,
        confidence,
        factors: {
          rainScore: isDemo ? 0.75 : 0.05,
          terrainScore: s.elevationNorm,
          historyScore: s.historyFlag ? 1 : 0,
          reportScore: 0,
        },
        rain,
        verifiedReports2h: 0,
        updatedAt: new Date().toISOString(),
        isSimulated: isDemo,
        explanation: isDemo
          ? `SIMULATED: Heavy rain scenario (58mm next 3h) on ${s.area} low ground (${Math.round(s.elevationNorm * 100)}% vulnerability).`
          : `Dry conditions (<1mm next 3h). Topography vulnerability: ${Math.round(s.elevationNorm * 100)}%.`,
      },
    };
  });

  return {
    isSimulated: isDemo,
    updatedAt: new Date().toISOString(),
    totalSegments: segments.length,
    segments,
  };
}

export async function fetchRiskData(demo: boolean = false): Promise<RiskApiResponse> {
  const query = demo ? '?demo=heavy-rain' : '';
  try {
    const res = await fetch(`${API_BASE_URL}/risk${query}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('API Gateway offline or unreachable, using bundled fallback:', err);
    return generateLocalFallback(demo);
  }
}

export async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  demo: boolean = false
): Promise<RouteResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, demo }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    // Client fallback
    const midLng = (from.lng + to.lng) / 2;
    const midLat = (from.lat + to.lat) / 2;
    return {
      defaultRoute: {
        geometry: {
          type: 'LineString',
          coordinates: [
            [from.lng, from.lat],
            [midLng, midLat],
            [to.lng, to.lat],
          ],
        },
        distanceKm: 4.8,
        durationMinutes: 18,
        travelMode: 'Car',
      },
      safeRoute: {
        geometry: {
          type: 'LineString',
          coordinates: [
            [from.lng, from.lat],
            [midLng + 0.012, midLat - 0.008],
            [to.lng, to.lat],
          ],
        },
        distanceKm: 5.9,
        durationMinutes: 23,
        travelMode: 'Car',
      },
      avoidedSegments: demo
        ? [
            { segmentId: 'vel-01', name: 'Ram Nagar (North) Main Road', score: 82, level: 'severe' },
            { segmentId: 'vel-02', name: 'Vijaya Nagar Junction / Bus Stand', score: 76, level: 'high' },
          ]
        : [],
      extraMinutes: demo ? 5 : 0,
      stillCrossesHighRisk: false,
      message: demo
        ? 'Avoids 2 high-risk streets, +5 min detour around Ram Nagar & Vijayanagar.'
        : 'Your route looks clear right now.',
      provider: 'OSRM Fallback',
      isSimulated: demo,
    };
  }
}

export async function getUploadUrl(): Promise<{ uploadUrl: string; photoKey: string; reportId: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/reports/upload-url`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const reportId = `rep-${Date.now()}`;
    return {
      uploadUrl: `https://mock-s3.local/reports/${reportId}.jpg`,
      photoKey: `reports/${reportId}.jpg`,
      reportId,
    };
  }
}

export async function submitReport(payload: {
  photoKey: string;
  lat: number;
  lng: number;
  imageBase64?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    return {
      message: 'Report saved locally (Dev mode); AI verification unavailable.',
      report: {
        reportId: `rep-${Date.now()}`,
        status: 'unverified',
        aiVerdict: {
          floodingVisible: true,
          depthClass: 'knee',
          confidence: 0.75,
          note: 'Water accumulation observed along road curb.',
          source: 'unverified',
        },
      },
      nearestSegment: { name: 'Velachery Main Road', distanceMeters: 45 },
    };
  }
}

export async function fetchHotspots(demo: boolean = false): Promise<HotspotsResponse> {
  const query = demo ? '?demo=heavy-rain' : '';
  try {
    const res = await fetch(`${API_BASE_URL}/hotspots${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    // Generate fallback hotspots
    const riskData = generateLocalFallback(demo);
    const sorted = [...riskData.segments].sort((a, b) => b.risk.score - a.risk.score);
    return {
      isSimulated: demo,
      updatedAt: new Date().toISOString(),
      topHotspots: sorted.slice(0, 10).map((s, idx) => ({
        rank: idx + 1,
        segmentId: s.segmentId,
        name: s.name,
        area: s.area,
        elevationM: s.elevationM,
        score: s.risk.score,
        level: s.risk.level,
        confidence: s.risk.confidence,
        reportCount: 0,
        rainNext3h: s.risk.rain.next3hMm,
        historyFlag: s.historyFlag,
      })),
      recurringChokePoints: [
        {
          segmentId: 'mud-01',
          name: 'Amudan Nagar Main Road',
          area: 'Mudichur',
          elevationM: 20,
          eventsCount: 4,
          source: 'Adyar River backwater overflow during 2015 & 2023 Michaung floods',
        },
        {
          segmentId: 'vel-01',
          name: 'Ram Nagar (North) Main Road',
          area: 'Velachery',
          elevationM: 9,
          eventsCount: 4,
          source: 'Velachery Lake surplus channel breach',
        },
        {
          segmentId: 'pal-01',
          name: 'Kamakoti Nagar Main Road',
          area: 'Pallikaranai',
          elevationM: 3,
          eventsCount: 3,
          source: 'Narayanapuram Lake surplus channel inundation',
        },
        {
          segmentId: 'med-01',
          name: 'Sri Sathya Sai Nagar Main Road',
          area: 'Medavakkam',
          elevationM: 15,
          eventsCount: 3,
          source: 'Sitheri Lake bund breach waterlogging',
        },
      ],
    };
  }
}

export async function subscribeToAlerts(payload: {
  email: string;
  area: AreaName;
  threshold: RiskLevel;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}
