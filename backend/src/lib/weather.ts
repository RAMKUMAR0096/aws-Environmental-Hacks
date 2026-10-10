import { AreaName, AREA_CENTROIDS, RainMetrics } from './types.js';

export interface WeatherFetchResult {
  metrics: RainMetrics;
  success: boolean;
  fetchedAt: string;
}

export async function fetchAreaPrecipitation(area: AreaName): Promise<WeatherFetchResult> {
  const centroid = AREA_CENTROIDS[area];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${centroid.lat}&longitude=${centroid.lng}&hourly=precipitation&past_hours=24&forecast_hours=6&timezone=Asia%2FKolkata`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }
    const data: any = await res.json();
    const hourlyPrecip: number[] = data?.hourly?.precipitation || [];

    // The API returns past_hours (24) followed by current + forecast hours
    // Indices 0..23 = past 24 hours
    // Indices 24..26 = next 3 hours
    const past24hSlice = hourlyPrecip.slice(0, 24);
    const next3hSlice = hourlyPrecip.slice(24, 27);

    const past24hMm = Number(past24hSlice.reduce((sum, v) => sum + (v || 0), 0).toFixed(1));
    const next3hMm = Number(next3hSlice.reduce((sum, v) => sum + (v || 0), 0).toFixed(1));
    const maxHourlyMm = Number((Math.max(...(next3hSlice.length > 0 ? next3hSlice : [0])) || 0).toFixed(1));

    return {
      metrics: {
        next3hMm,
        maxHourlyMm,
        past24hMm
      },
      success: true,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.warn(`Weather fetch failed for area ${area}:`, error);
    // Safe fallback when weather API is unreachable
    return {
      metrics: {
        next3hMm: 0,
        maxHourlyMm: 0,
        past24hMm: 0
      },
      success: false,
      fetchedAt: new Date().toISOString()
    };
  }
}

export async function fetchAllAreasPrecipitation(): Promise<Record<AreaName, WeatherFetchResult>> {
  const areas: AreaName[] = ['Velachery', 'Pallikaranai', 'Mudichur', 'Medavakkam'];
  const results = await Promise.all(areas.map(a => fetchAreaPrecipitation(a)));

  const map: Partial<Record<AreaName, WeatherFetchResult>> = {};
  areas.forEach((area, i) => {
    map[area] = results[i];
  });

  return map as Record<AreaName, WeatherFetchResult>;
}
