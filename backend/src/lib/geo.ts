import * as turf from '@turf/turf';
import { PILOT_BOUNDS, Segment } from './types.js';

export function isInsidePilotZone(lat: number, lng: number): boolean {
  return (
    lat >= PILOT_BOUNDS.minLat &&
    lat <= PILOT_BOUNDS.maxLat &&
    lng >= PILOT_BOUNDS.minLng &&
    lng <= PILOT_BOUNDS.maxLng
  );
}

export function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  return turf.distance(from, to, { units: 'meters' });
}

export function findNearestSegment(
  lat: number,
  lng: number,
  segments: Segment[]
): { segment: Segment; distanceM: number } | null {
  if (segments.length === 0) return null;

  const targetPoint = turf.point([lng, lat]);
  let closest: Segment = segments[0];
  let minDistance = Infinity;

  for (const seg of segments) {
    const line = turf.lineString(seg.geometry);
    const dist = turf.pointToLineDistance(targetPoint, line, { units: 'meters' });
    if (dist < minDistance) {
      minDistance = dist;
      closest = seg;
    }
  }

  return { segment: closest, distanceM: Math.round(minDistance) };
}

// Builds a buffer polygon around a segment's geometry
export function bufferSegment(segment: Segment, bufferMeters: number = 40): any {
  const line = turf.lineString(segment.geometry);
  return turf.buffer(line, bufferMeters, { units: 'meters' });
}
