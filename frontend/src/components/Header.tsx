'use client';

import React from 'react';
import { ShieldAlert, MapPin, AlertTriangle, CloudRain, Flame, Bell, Layers, Info } from 'lucide-react';
import { AreaName } from '../lib/api';

interface HeaderProps {
  lastUpdated: string;
  isSimulated: boolean;
  isStale: boolean;
  selectedArea: AreaName | 'All';
  onSelectArea: (area: AreaName | 'All') => void;
  onOpenReport: () => void;
  onOpenRoute: () => void;
  onOpenSubscribe: () => void;
  onOpenAbout: () => void;
  currentView: 'map' | 'hotspots';
  onToggleView: (view: 'map' | 'hotspots') => void;
  demoMode: boolean;
  onToggleDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  isSimulated,
  isStale,
  selectedArea,
  onSelectArea,
  onOpenReport,
  onOpenRoute,
  onOpenSubscribe,
  onOpenAbout,
  currentView,
  onToggleView,
  demoMode,
  onToggleDemo,
}) => {
  const areas: (AreaName | 'All')[] = ['All', 'Velachery', 'Pallikaranai', 'Mudichur', 'Medavakkam'];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
      {/* Simulation Warning Banner if demoMode is active */}
      {demoMode && (
        <div className="pointer-events-auto bg-amber-500/90 backdrop-blur-md px-4 py-1.5 text-center text-xs font-semibold text-slate-950 flex items-center justify-center gap-2 shadow-lg">
          <AlertTriangle className="h-4 w-4 animate-bounce" />
          <span>SIMULATED SCENARIO (DEMO ONLY) — Demonstrating torrential monsoon rain (28mm/h, 95mm past 24h)</span>
          <button
            onClick={onToggleDemo}
            className="ml-2 underline font-bold hover:text-white transition-colors"
          >
            Turn Off
          </button>
        </div>
      )}

      {/* Main Glass Header */}
      <div className="mx-3 mt-3 max-w-7xl lg:mx-auto">
        <div className="glass-panel-elevated pointer-events-auto rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
              <CloudRain className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Chennai Flood Pulse
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    demoMode
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : isStale
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${demoMode ? 'bg-amber-400' : isStale ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
                  {demoMode ? 'Simulated' : isStale ? 'Stale' : 'Live'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pilot Zone: South Chennai • Updated {lastUpdated || 'just now'} IST
              </p>
            </div>
          </div>

          {/* Area Filter Pills */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
            {areas.map(area => (
              <button
                key={area}
                onClick={() => onSelectArea(area)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  selectedArea === area
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleView(currentView === 'map' ? 'hotspots' : 'map')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700/80 border border-white/10 transition-colors"
              title="Toggle Officials Hotspots List"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>{currentView === 'map' ? 'Hotspots' : 'Live Map'}</span>
            </button>

            <button
              onClick={onOpenSubscribe}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700/80 border border-white/10 transition-colors"
              title="Subscribe to Area Alerts via SNS"
            >
              <Bell className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Alerts</span>
            </button>

            <button
              onClick={onOpenAbout}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              title="About & Data Sources"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
