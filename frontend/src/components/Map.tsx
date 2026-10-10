'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { SegmentWithRisk, RouteResponse } from '../lib/api';

interface MapProps {
  segments: SegmentWithRisk[];
  routeData: RouteResponse | null;
  onSelectSegment: (segment: SegmentWithRisk) => void;
  selectedSegment: SegmentWithRisk | null;
}

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

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Use dark style for high contrast in all conditions
    const mapStyle =
      process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
      'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      // Add Segments GeoJSON source
      map.addSource('segments', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
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
          'line-width': 10,
          'line-opacity': 0.35,
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

      // Add Routes GeoJSON sources
      map.addSource('default-route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addSource('safe-route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Default route layer (dashed slate)
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

      // Safe route glow layer
      map.addLayer({
        id: 'safe-route-glow',
        type: 'line',
        source: 'safe-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-width': 8,
          'line-color': '#10b981',
          'line-opacity': 0.4,
        },
      });

      // Safe route core line (vibrant emerald)
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
        const clickedSeg = segments.find(s => s.segmentId === segId);
        if (clickedSeg) {
          onSelectSegment(clickedSeg);
        }
      });

      // Cursor pointer changes
      map.on('mouseenter', 'segments-line', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'segments-line', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update segments layer when segments change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource('segments') as maplibregl.GeoJSONSource;
    if (!source) return;

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: segments.map(seg => ({
        type: 'Feature',
        properties: {
          segmentId: seg.segmentId,
          name: seg.name,
          area: seg.area,
          score: seg.risk.score,
          level: seg.risk.level,
        },
        geometry: {
          type: 'LineString',
          coordinates: seg.geometry,
        },
      })),
    };

    source.setData(geojsonData);
  }, [segments]);

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

    // Update route lines
    if (defaultSource) {
      defaultSource.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: routeData.defaultRoute.geometry,
          },
        ],
      });
    }

    if (safeSource) {
      safeSource.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: routeData.safeRoute.geometry,
          },
        ],
      });
    }

    // Add Start and Destination markers
    const coords = routeData.defaultRoute.geometry.coordinates;
    if (coords && coords.length >= 2) {
      const startCoord = coords[0];
      const endCoord = coords[coords.length - 1];

      // Start Marker (Blue Pin)
      const startEl = document.createElement('div');
      startEl.className = 'flex items-center justify-center h-7 w-7 rounded-full bg-blue-500 text-white font-bold text-xs shadow-lg border-2 border-white';
      startEl.innerText = 'A';
      startMarkerRef.current = new maplibregl.Marker({ element: startEl })
        .setLngLat(startCoord)
        .addTo(map);

      // Destination Marker (Emerald Pin)
      const endEl = document.createElement('div');
      endEl.className = 'flex items-center justify-center h-7 w-7 rounded-full bg-emerald-500 text-white font-bold text-xs shadow-lg border-2 border-white';
      endEl.innerText = 'B';
      endMarkerRef.current = new maplibregl.Marker({ element: endEl })
        .setLngLat(endCoord)
        .addTo(map);

      // Fit map bounds to encompass route
      const bounds = new maplibregl.LngLatBounds();
      coords.forEach(pt => bounds.extend(pt));
      map.fitBounds(bounds, { padding: 80, maxZoom: 14.5 });
    }
  }, [routeData]);

  // Pan to selected segment
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSegment) return;

    map.flyTo({
      center: [selectedSegment.midpoint.lng, selectedSegment.midpoint.lat],
      zoom: 14,
      essential: true,
    });
  }, [selectedSegment]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Floating Risk Legend (Bottom Right / Left) */}
      <div className="absolute bottom-6 left-4 z-20 pointer-events-auto">
        <div className="glass-panel rounded-2xl p-3 shadow-xl text-xs space-y-1.5 border border-white/10">
          <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-2">
            3-Hour Flood Risk
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
