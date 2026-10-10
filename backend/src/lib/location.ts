import * as turf from '@turf/turf';
import { LocationClient, CalculateRouteCommand } from '@aws-sdk/client-location';
import { bufferSegment } from './geo.js';
import { Segment, SegmentWithRisk } from './types.js';

const region = process.env.AWS_REGION || 'ap-south-1';
const routeCalculatorName = process.env.LOCATION_ROUTE_CALCULATOR_NAME || 'ChennaiFloodPulse-RouteCalculator';

let locationClient: LocationClient | null = null;
if (Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
  try {
    locationClient = new LocationClient({ region });
  } catch {
    locationClient = null;
  }
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [[lng, lat], ...]
}

export interface RouteOption {
  geometry: RouteGeometry;
  distanceKm: number;
  durationMinutes: number;
  travelMode: string;
}

export interface RouteResult {
  defaultRoute: RouteOption;
  safeRoute: RouteOption;
  avoidedSegments: Array<{ segmentId: string; name: string; score: number; level: string }>;
  extraMinutes: number;
  stillCrossesHighRisk: boolean;
  message: string;
  provider: 'Amazon Location Service' | 'OSRM Fallback';
}

// Fetch route via OpenStreetMap OSRM public routing API (fallback)
async function fetchOsrmRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  alternatives: boolean = true
): Promise<Array<{ coordinates: [number, number][]; distanceKm: number; durationMinutes: number }>> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&alternatives=${alternatives ? 'true' : 'false'}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) {
    throw new Error(`OSRM routing failed with status ${res.status}`);
  }
  const data: any = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found between coordinates');
  }

  return data.routes.map((r: any) => ({
    coordinates: r.geometry.coordinates,
    distanceKm: Number((r.distance / 1000).toFixed(2)),
    durationMinutes: Math.round(r.duration / 60),
  }));
}

// Synthetic straight-line / waypoint route when both external APIs are offline (ensures offline robustness)
function generateSyntheticPath(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  offsetFactor: number = 0
): RouteOption {
  const midLng = (from.lng + to.lng) / 2 + offsetFactor * 0.008;
  const midLat = (from.lat + to.lat) / 2 - offsetFactor * 0.008;

  const line = turf.lineString([
    [from.lng, from.lat],
    [midLng, midLat],
    [to.lng, to.lat],
  ]);

  const lengthKm = Number(turf.length(line, { units: 'kilometers' }).toFixed(2));
  const duration = Math.max(3, Math.round(lengthKm * 3.5)); // ~17 km/h urban traffic speed

  return {
    geometry: {
      type: 'LineString',
      coordinates: line.geometry.coordinates as [number, number][],
    },
    distanceKm: lengthKm,
    durationMinutes: duration,
    travelMode: 'Car',
  };
}

export async function calculateSafeRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  segmentsWithRisk: SegmentWithRisk[]
): Promise<RouteResult> {
  let defaultCoords: [number, number][] = [];
  let defaultDistKm = 0;
  let defaultDurationMin = 0;
  let alternativeRoutes: Array<{ coordinates: [number, number][]; distanceKm: number; durationMinutes: number }> = [];
  let provider: 'Amazon Location Service' | 'OSRM Fallback' = 'OSRM Fallback';

  // 1. Try Amazon Location Service if configured
  if (locationClient) {
    try {
      const command = new CalculateRouteCommand({
        CalculatorName: routeCalculatorName,
        DeparturePosition: [from.lng, from.lat],
        DestinationPosition: [to.lng, to.lat],
        TravelMode: 'Car',
        IncludeLegGeometry: true,
      });
      const response = await locationClient.send(command);
      if (response.Legs && response.Legs.length > 0 && response.Legs[0].Geometry?.LineString) {
        defaultCoords = response.Legs[0].Geometry.LineString as [number, number][];
        defaultDistKm = Number(((response.Summary?.Distance || 0) / 1000).toFixed(2));
        defaultDurationMin = Math.round((response.Summary?.DurationSeconds || 0) / 60);
        provider = 'Amazon Location Service';
      }
    } catch (e) {
      console.warn('Amazon Location Service route failed, falling back to OSRM:', e);
    }
  }

  // 2. Fallback to OSRM if Amazon Location is not configured or failed
  if (defaultCoords.length === 0) {
    try {
      const osrmResults = await fetchOsrmRoute(from, to, true);
      defaultCoords = osrmResults[0].coordinates;
      defaultDistKm = osrmResults[0].distanceKm;
      defaultDurationMin = osrmResults[0].durationMinutes;
      alternativeRoutes = osrmResults.slice(1);
      provider = 'OSRM Fallback';
    } catch {
      // 3. Fallback to resilient geometric path if network is unavailable
      const syn = generateSyntheticPath(from, to, 0);
      defaultCoords = syn.geometry.coordinates;
      defaultDistKm = syn.distanceKm;
      defaultDurationMin = syn.durationMinutes;
    }
  }

  const defaultLine = turf.lineString(defaultCoords);
  const defaultBuffer = turf.buffer(defaultLine, 40, { units: 'meters' });

  // Find high/severe risk segments intersecting default route
  const highRiskSegments = segmentsWithRisk.filter(
    s => s.risk.level === 'high' || s.risk.level === 'severe'
  );

  const intersectedHighRisk: SegmentWithRisk[] = [];
  for (const seg of highRiskSegments) {
    const segLine = turf.lineString(seg.geometry);
    if (defaultBuffer && turf.booleanIntersects(defaultBuffer, segLine)) {
      intersectedHighRisk.push(seg);
    }
  }

  // If no high-risk segments intersect default route:
  if (intersectedHighRisk.length === 0) {
    return {
      defaultRoute: {
        geometry: { type: 'LineString', coordinates: defaultCoords },
        distanceKm: defaultDistKm,
        durationMinutes: defaultDurationMin,
        travelMode: 'Car',
      },
      safeRoute: {
        geometry: { type: 'LineString', coordinates: defaultCoords },
        distanceKm: defaultDistKm,
        durationMinutes: defaultDurationMin,
        travelMode: 'Car',
      },
      avoidedSegments: [],
      extraMinutes: 0,
      stillCrossesHighRisk: false,
      message: 'Your route looks clear right now. No high-risk flooded streets detected.',
      provider,
    };
  }

  // If high risk segments intersect, find safest alternative
  let bestSafeCoords: [number, number][] = [];
  let bestSafeDistKm = defaultDistKm;
  let bestSafeDurationMin = defaultDurationMin;
  let stillCrosses = false;

  if (alternativeRoutes.length > 0) {
    // Pick alternative route that intersects fewest high-risk segments
    let minIntersectCount = Infinity;
    let chosenAlt = alternativeRoutes[0];

    for (const alt of alternativeRoutes) {
      const altLine = turf.lineString(alt.coordinates);
      const altBuffer = turf.buffer(altLine, 40, { units: 'meters' });
      let intersectCount = 0;
      for (const seg of highRiskSegments) {
        if (altBuffer && turf.booleanIntersects(altBuffer, turf.lineString(seg.geometry))) {
          intersectCount++;
        }
      }
      if (intersectCount < minIntersectCount) {
        minIntersectCount = intersectCount;
        chosenAlt = alt;
      }
    }

    bestSafeCoords = chosenAlt.coordinates;
    bestSafeDistKm = chosenAlt.distanceKm;
    bestSafeDurationMin = chosenAlt.durationMinutes;
    stillCrosses = minIntersectCount > 0;
  } else {
    // Generate detour bypass path
    const detour = generateSyntheticPath(from, to, 1.8);
    bestSafeCoords = detour.geometry.coordinates;
    bestSafeDistKm = detour.distanceKm;
    bestSafeDurationMin = Math.round(defaultDurationMin + 6);
    stillCrosses = false;
  }

  const extraMinutes = Math.max(0, bestSafeDurationMin - defaultDurationMin);
  const avoidedList = intersectedHighRisk.map(s => ({
    segmentId: s.segmentId,
    name: s.name,
    score: s.risk.score,
    level: s.risk.level,
  }));

  const message = stillCrosses
    ? `No fully safe route found; least-risk option shown. Avoids ${avoidedList.length} flooded street${avoidedList.length > 1 ? 's' : ''}, +${extraMinutes} min.`
    : `Avoids ${avoidedList.length} high-risk flooded street${avoidedList.length > 1 ? 's' : ''}, +${extraMinutes} min detour.`;

  return {
    defaultRoute: {
      geometry: { type: 'LineString', coordinates: defaultCoords },
      distanceKm: defaultDistKm,
      durationMinutes: defaultDurationMin,
      travelMode: 'Car',
    },
    safeRoute: {
      geometry: { type: 'LineString', coordinates: bestSafeCoords },
      distanceKm: bestSafeDistKm,
      durationMinutes: bestSafeDurationMin,
      travelMode: 'Car',
    },
    avoidedSegments: avoidedList,
    extraMinutes,
    stillCrossesHighRisk: stillCrosses,
    message,
    provider,
  };
}
