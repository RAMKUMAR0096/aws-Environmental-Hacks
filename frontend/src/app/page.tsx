'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '../components/Header';
import { SegmentDetailSheet } from '../components/SegmentDetailSheet';
import { RoutePanel } from '../components/RoutePanel';
import { ReportModal } from '../components/ReportModal';
import { SubscribeModal } from '../components/SubscribeModal';
import { HotspotsView } from '../components/HotspotsView';
import { AboutModal } from '../components/AboutModal';
import {
  fetchRiskData,
  fetchRoute,
  SegmentWithRisk,
  RouteResponse,
  AreaName,
} from '../lib/api';
import { Navigation, Camera, AlertTriangle, Layers, CloudRain } from 'lucide-react';

// Dynamic import for MapLibre map component to avoid SSR window issues
const Map = dynamic(() => import('../components/Map').then(mod => mod.Map), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#090d16] text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <span className="text-xs font-medium">Loading Chennai Flood Pulse Map...</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const [segments, setSegments] = useState<SegmentWithRisk[]>([]);
  const [selectedArea, setSelectedArea] = useState<AreaName | 'All'>('All');
  const [selectedSegment, setSelectedSegment] = useState<SegmentWithRisk | null>(null);

  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isSimulated, setIsSimulated] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Modal view states
  const [currentView, setCurrentView] = useState<'map' | 'hotspots'>('map');
  const [isRouteOpen, setIsRouteOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const loadData = async (isDemo: boolean) => {
    try {
      const res = await fetchRiskData(isDemo);
      setSegments(res.segments || []);
      setIsSimulated(res.isSimulated);
      if (res.updatedAt) {
        const d = new Date(res.updatedAt);
        setLastUpdated(d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      setIsStale(true);
    }
  };

  useEffect(() => {
    loadData(demoMode);
  }, [demoMode]);

  const handleToggleDemo = () => {
    setDemoMode(prev => !prev);
    // If route is active, re-calculate under new mode
    if (routeData) {
      setRouteData(null);
    }
  };

  const handleCalculateRoute = async (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ) => {
    setIsRouteLoading(true);
    try {
      const res = await fetchRoute(from, to, demoMode);
      setRouteData(res);
    } catch (e) {
      console.warn('Route calculation error:', e);
    } finally {
      setIsRouteLoading(false);
    }
  };

  const filteredSegments = selectedArea === 'All'
    ? segments
    : segments.filter(s => s.area === selectedArea);

  return (
    <main className="relative min-h-screen w-screen overflow-hidden bg-[#090d16]">
      {/* Top Header */}
      <Header
        lastUpdated={lastUpdated}
        isSimulated={isSimulated}
        isStale={isStale}
        selectedArea={selectedArea}
        onSelectArea={setSelectedArea}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenRoute={() => setIsRouteOpen(true)}
        onOpenSubscribe={() => setIsSubscribeOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        currentView={currentView}
        onToggleView={setCurrentView}
        demoMode={demoMode}
        onToggleDemo={handleToggleDemo}
      />

      {/* Main Content: Map or Hotspots */}
      {currentView === 'map' ? (
        <div className="relative h-screen w-screen">
          <Map
            segments={filteredSegments}
            routeData={routeData}
            onSelectSegment={seg => setSelectedSegment(seg)}
            selectedSegment={selectedSegment}
          />

          {/* Floating Action Buttons (Mobile-first, bottom center / right) */}
          <div className="fixed bottom-6 right-4 sm:right-6 z-30 pointer-events-auto flex flex-col items-end gap-3">
            {/* Demo Mode Toggle Button */}
            <button
              onClick={handleToggleDemo}
              className={`rounded-2xl px-3.5 py-2 text-xs font-semibold shadow-xl border backdrop-blur-md transition-all flex items-center gap-2 ${
                demoMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-900/80 text-amber-300 border-amber-500/30 hover:bg-slate-800'
              }`}
              title="Simulate heavy monsoon rain (28mm/h)"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{demoMode ? 'Exit Demo Rain' : 'Simulate Heavy Rain (Demo)'}</span>
            </button>

            {/* Check Route Button */}
            <button
              onClick={() => setIsRouteOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all"
            >
              <Navigation className="h-4 w-4" />
              <span>Check My Route</span>
            </button>

            {/* Report Flooding Button */}
            <button
              onClick={() => setIsReportOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition-all"
            >
              <Camera className="h-4 w-4" />
              <span>Report Flooding</span>
            </button>
          </div>
        </div>
      ) : (
        <HotspotsView
          demoMode={demoMode}
          onBackToMap={() => setCurrentView('map')}
          onSelectSegmentId={id => {
            const seg = segments.find(s => s.segmentId === id);
            if (seg) setSelectedSegment(seg);
          }}
        />
      )}

      {/* Segment Detail Sheet (on segment tap) */}
      <SegmentDetailSheet
        segment={selectedSegment}
        onClose={() => setSelectedSegment(null)}
      />

      {/* Route Navigation Panel */}
      <RoutePanel
        isOpen={isRouteOpen}
        onClose={() => setIsRouteOpen(false)}
        onCalculateRoute={handleCalculateRoute}
        routeData={routeData}
        isLoading={isRouteLoading}
        onClearRoute={() => setRouteData(null)}
      />

      {/* Photo Flood Reporting Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onReportSubmitted={() => loadData(demoMode)}
      />

      {/* Area Alert Subscribe Modal */}
      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
      />

      {/* About & Methodology Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </main>
  );
}
