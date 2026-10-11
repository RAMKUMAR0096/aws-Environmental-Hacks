'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { SegmentWithRisk, RouteResponse } from '../lib/api';
import { Layers, Globe, Moon, Sun, Navigation, Check } from 'lucide-react';

interface MapProps {
  segments: SegmentWithRisk[];
  routeData: RouteResponse | null;
  onSelectSegment: (segment: SegmentWithRisk) => void;
  selectedSegment: SegmentWithRisk | null;
}

export type MapStyleKey = 'streets' | 'satellite' | 'dark' | 'light';

interface StyleOption {
  key: MapStyleKey;
  label: string;
  description: string;
  badge: string;
  style: string | maplibregl.StyleSpecification;
}

const MAP_STYLES: StyleOption[] = [
  {
    key: 'streets',
    label: 'Detailed Streets',
    description: 'Clear road names, lanes & landmarks',
    badge: 'Recommended',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  {
    key: 'satellite',
    label: 'Satellite Imagery',
    description: 'High-res aerial terrain & wetlands',
    badge: 'ESRI Aerial',
    style: {
      version: 8,
      sources: {
        'esri-imagery': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '© Esri, Maxar, Earthstar Geographics',
        },
      },
      layers: [
        {
          id: 'esri-imagery-layer',
          type: 'raster',
          source: 'esri-imagery',
        },
      ],
    },
  },
  {
    key: 'dark',
    label: 'Dark Radar',
    description: 'Night view with glowing risk corridors',
    badge: 'Night Mode',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  {
    key: 'light',
    label: 'Clean Light',
    description: 'High-contrast daylight road layout',
    badge: 'Clean Day',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
];

const DEFAULT_CENTER: [number, number] = [80.180, 12.950]; // South Chennai
const DEFAULT_ZOOM = 12.2;

export const Map: React.FC<MapProps> = ({
  segments,
  routeData,
  onSelectSegment,
  selectedSegment,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const startMarkerRef = useRef<maplibregl.Marker | null>(null);
  const endMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [currentStyleKey, setCurrentStyleKey] = useState<MapStyleKey>('streets');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  // Keep references to latest segments and routes to rehydrate layers after style swap
  const segmentsRef = useRef<SegmentWithRisk[]>(segments);
  segmentsRef.current = segments;

  const routeDataRef = useRef<RouteResponse | null>(routeData);
  routeDataRef.current = routeData;

  const onSelectSegmentRef = useRef(onSelectSegment);
  onSelectSegmentRef.current = onSelectSegment;

  const getSegmentsGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: (segmentsRef.current || []).map(seg => ({
        type: 'Feature',
        properties: {
          segmentId: seg.segmentId,
          name: seg.name,
          area: seg.area,
          score: seg.risk?.score ?? 0,
          level: seg.risk?.level ?? 'low',
        },
        geometry: {
          type: 'LineString',
          coordinates: seg.geometry,
        },
      })),
    };
  }, []);

  const getDefaultRouteGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    if (!routeDataRef.current?.defaultRoute?.geometry) {
      return { type: 'FeatureCollection', features: [] };
    }
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: routeDataRef.current.defaultRoute.geometry,
        },
      ],
    };
  }, []);

  const getSafeRouteGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    if (!routeDataRef.current?.safeRoute?.geometry) {
      return { type: 'FeatureCollection', features: [] };
    }
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: routeDataRef.current.safeRoute.geometry,
        },
      ],
    };
  }, []);

  // Add custom flood risk layers & routes to the active style
  const setupCustomLayers = useCallback((map: maplibregl.Map) => {
    if (map.getSource('segments')) return;

    // Segments GeoJSON source
    map.addSource('segments', {
      type: 'geojson',
      data: getSegmentsGeoJSON(),
    });

    // Segment glow layer
    map.addLayer({
      id: 'segments-glow',
      type: 'line',
      source: 'segments',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-width': 12,
        'line-opacity': 0.45,
        'line-color': [
          'match',
          ['get', 'level'],
          'severe', '#ef4444',
          'high', '#f97316',
          'moderate', '#f59e0b',
          'low', '#10b981',
          '#64748b',
        ],
      },
    });

    // Segment core line layer
    map.addLayer({
      id: 'segments-line',
      type: 'line',
      source: 'segments',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-width': 5,
        'line-color': [
          'match',
          ['get', 'level'],
          'severe', '#ef4444',
          'high', '#f97316',
          'moderate', '#f59e0b',
          'low', '#10b981',
          '#64748b',
        ],
      },
    });

    // Default route source & layer
    map.addSource('default-route', {
      type: 'geojson',
      data: getDefaultRouteGeoJSON(),
    });

    map.addLayer({
      id: 'default-route-line',
      type: 'line',
      source: 'default-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-width': 4,
        'line-color': '#64748b',
        'line-dasharray': [2, 2],
      },
    });

    // Safe route source & layers
    map.addSource('safe-route', {
      type: 'geojson',
      data: getSafeRouteGeoJSON(),
    });

    map.addLayer({
      id: 'safe-route-glow',
      type: 'line',
      source: 'safe-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-width': 10,
        'line-color': '#10b981',
        'line-opacity': 0.45,
      },
    });

    map.addLayer({
      id: 'safe-route-line',
      type: 'line',
      source: 'safe-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-width': 5,
        'line-color': '#34d399',
      },
    });

    // Segment click interaction
    map.on('click', 'segments-line', (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const segId = feature.properties?.segmentId;
      const clickedSeg = segmentsRef.current.find(s => s.segmentId === segId);
      if (clickedSeg) {
        onSelectSegmentRef.current(clickedSeg);
      }
    });

    map.on('mouseenter', 'segments-line', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'segments-line', () => {
      map.getCanvas().style.cursor = '';
    });
  }, [getSegmentsGeoJSON, getDefaultRouteGeoJSON, getSafeRouteGeoJSON]);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initialOption = MAP_STYLES.find(s => s.key === currentStyleKey) || MAP_STYLES[0];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: initialOption.style as any,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      setupCustomLayers(map);
    });

    map.on('style.load', () => {
      setupCustomLayers(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setupCustomLayers]);

  // Handle switching map styles
  const handleStyleChange = (key: MapStyleKey) => {
    const map = mapRef.current;
    if (!map || key === currentStyleKey) return;
    const target = MAP_STYLES.find(s => s.key === key);
    if (!target) return;

    setCurrentStyleKey(key);
    setIsLayerMenuOpen(false);
    map.setStyle(target.style as any);
  };

  // Update segments layer when segments change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('segments') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(getSegmentsGeoJSON());
    }
  }, [segments, getSegmentsGeoJSON]);

  // Update routes and markers when routeData changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const defaultSource = map.getSource('default-route') as maplibregl.GeoJSONSource;
    const safeSource = map.getSource('safe-route') as maplibregl.GeoJSONSource;

    if (startMarkerRef.current) startMarkerRef.current.remove();
    if (endMarkerRef.current) endMarkerRef.current.remove();

    if (!routeData) {
      if (defaultSource) defaultSource.setData({ type: 'FeatureCollection', features: [] });
      if (safeSource) safeSource.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    if (defaultSource) defaultSource.setData(getDefaultRouteGeoJSON());
    if (safeSource) safeSource.setData(getSafeRouteGeoJSON());

    const coords = routeData.defaultRoute.geometry.coordinates;
    if (coords && coords.length >= 2) {
      const startCoord = coords[0];
      const endCoord = coords[coords.length - 1];

      const startEl = document.createElement('div');
      startEl.className = 'flex items-center justify-center h-7 w-7 rounded-full bg-blue-500 text-white font-bold text-xs shadow-lg border-2 border-white';
      startEl.innerText = 'A';
      startMarkerRef.current = new maplibregl.Marker({ element: startEl })
        .setLngLat(startCoord)
        .addTo(map);

      const endEl = document.createElement('div');
      endEl.className = 'flex items-center justify-center h-7 w-7 rounded-full bg-emerald-500 text-white font-bold text-xs shadow-lg border-2 border-white';
      endEl.innerText = 'B';
      endMarkerRef.current = new maplibregl.Marker({ element: endEl })
        .setLngLat(endCoord)
        .addTo(map);

      const bounds = new maplibregl.LngLatBounds();
      coords.forEach(pt => bounds.extend(pt));
      map.fitBounds(bounds, { padding: 80, maxZoom: 14.5 });
    }
  }, [routeData, getDefaultRouteGeoJSON, getSafeRouteGeoJSON]);

  // Pan to selected segment
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSegment) return;

    map.flyTo({
      center: [selectedSegment.midpoint.lng, selectedSegment.midpoint.lat],
      zoom: 14.2,
      essential: true,
    });
  }, [selectedSegment]);

  const activeOption = MAP_STYLES.find(s => s.key === currentStyleKey) || MAP_STYLES[0];

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Floating Map Layer Switcher (Top Right, under Header) */}
      <div className="absolute top-20 right-4 sm:right-6 z-20 pointer-events-auto">
        <div className="relative">
          {/* Layer Toggle Button */}
          <button
            onClick={() => setIsLayerMenuOpen(prev => !prev)}
            className="flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-xl border border-white/15 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-95"
            title="Toggle Map Style (Streets / Satellite / Dark)"
          >
            <Layers className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline font-medium">Layer:</span>
            <span className="text-cyan-300 font-semibold">{activeOption.label}</span>
          </button>

          {/* Layer Dropdown Panel */}
          {isLayerMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900/95 backdrop-blur-xl p-2.5 shadow-2xl border border-white/15 space-y-1.5 animate-in fade-in zoom-in-95 duration-150 z-30">
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                <span>Select Map Style</span>
                <span className="text-[10px] text-cyan-400 font-normal">All roads visible</span>
              </div>

              {MAP_STYLES.map(opt => {
                const isSelected = opt.key === currentStyleKey;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleStyleChange(opt.key)}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 text-white border border-cyan-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg ${
                      isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {opt.key === 'streets' && <Navigation className="h-4 w-4" />}
                      {opt.key === 'satellite' && <Globe className="h-4 w-4" />}
                      {opt.key === 'dark' && <Moon className="h-4 w-4" />}
                      {opt.key === 'light' && <Sun className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{opt.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400 ml-1 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Risk Legend (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-20 pointer-events-auto">
        <div className="glass-panel rounded-2xl p-3 shadow-xl text-xs space-y-1.5 border border-white/10 bg-slate-900/90 backdrop-blur-md">
          <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>3-Hour Flood Risk</span>
            <span className="text-[10px] text-emerald-400 font-normal">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300 font-medium">Low (0–29)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300 font-medium">Moderate (30–59)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
            <span className="text-slate-300 font-medium">High (60–79)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <span className="text-slate-300 font-medium">Severe (80–100)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

