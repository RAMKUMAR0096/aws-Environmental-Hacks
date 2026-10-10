'use client';

import React, { useState } from 'react';
import { X, Navigation, ShieldCheck, Clock, AlertTriangle, ArrowRight, CornerUpRight, CheckCircle2 } from 'lucide-react';
import { RouteResponse } from '../lib/api';

interface RoutePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculateRoute: (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => Promise<void>;
  routeData: RouteResponse | null;
  isLoading: boolean;
  onClearRoute: () => void;
}

const ROUTE_PRESETS = [
  {
    name: 'Velachery -> Pallikaranai',
    from: { lat: 12.9815, lng: 80.2215, name: 'Vijaya Nagar Bus Terminus (Velachery)' },
    to: { lat: 12.9431, lng: 80.2148, name: 'Kamakoti Nagar (Pallikaranai)' },
  },
  {
    name: 'Mudichur -> Medavakkam',
    from: { lat: 12.9172, lng: 80.0682, name: 'Amudan Nagar (Mudichur)' },
    to: { lat: 12.9242, lng: 80.1885, name: 'Sri Sathya Sai Nagar (Medavakkam)' },
  },
  {
    name: 'Guindy Link -> Velachery Bypass',
    from: { lat: 12.9934, lng: 80.2163, name: 'Five Furlong Road' },
    to: { lat: 12.9772, lng: 80.2195, name: 'Ram Nagar (North)' },
  },
];

export const RoutePanel: React.FC<RoutePanelProps> = ({
  isOpen,
  onClose,
  onCalculateRoute,
  routeData,
  isLoading,
  onClearRoute,
}) => {
  const [fromPos, setFromPos] = useState({ lat: 12.9815, lng: 80.2215, label: 'Vijaya Nagar (Velachery)' });
  const [toPos, setToPos] = useState({ lat: 12.9431, lng: 80.2148, label: 'Kamakoti Nagar (Pallikaranai)' });

  if (!isOpen) return null;

  const handlePresetSelect = (preset: typeof ROUTE_PRESETS[0]) => {
    setFromPos({ lat: preset.from.lat, lng: preset.from.lng, label: preset.from.name });
    setToPos({ lat: preset.to.lat, lng: preset.to.lng, label: preset.to.name });
    onCalculateRoute(preset.from, preset.to);
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setFromPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'Current Location',
          });
        },
        () => {
          alert('Unable to retrieve your current location. Please select a preset.');
        }
      );
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4 sm:p-6 flex justify-center pointer-events-none">
      <div className="glass-panel-elevated pointer-events-auto w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/10 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Navigation className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Flood-Safe Navigation</h2>
              <p className="text-[11px] text-slate-400">Routes avoiding high-risk waterlogged streets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Origin / Destination inputs */}
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-2 bg-slate-900/70 rounded-2xl p-2.5 border border-white/5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-[11px]">
              A
            </span>
            <div className="flex-1">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Origin</span>
              <input
                type="text"
                readOnly
                value={fromPos.label}
                className="w-full bg-transparent text-xs font-medium text-white focus:outline-none"
              />
            </div>
            <button
              onClick={handleUseMyLocation}
              className="text-[11px] text-cyan-400 hover:underline px-2 py-1 rounded bg-white/5"
            >
              My GPS
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/70 rounded-2xl p-2.5 border border-white/5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-[11px]">
              B
            </span>
            <div className="flex-1">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Destination</span>
              <input
                type="text"
                readOnly
                value={toPos.label}
                className="w-full bg-transparent text-xs font-medium text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-3">
          <span className="text-[11px] font-semibold text-slate-400">Quick Test Routes in Pilot Zone:</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ROUTE_PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetSelect(p)}
                className="rounded-xl bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 text-[11px] text-slate-300 border border-white/5 transition-all"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate Button */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onCalculateRoute(fromPos, toPos)}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span>Calculate Safe Route</span>
          </button>
          {routeData && (
            <button
              onClick={onClearRoute}
              className="rounded-2xl bg-slate-800 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white border border-white/5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Route Results Card */}
        {routeData && (
          <div className="mt-4 space-y-3 pt-3 border-t border-white/10">
            {/* Status & Avoidance Banner */}
            <div
              className={`rounded-2xl p-3 border text-xs leading-relaxed flex items-start gap-2.5 ${
                routeData.stillCrossesHighRisk
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {routeData.stillCrossesHighRisk ? (
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{routeData.message}</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Routing provider: {routeData.provider}
                </p>
              </div>
            </div>

            {/* Comparison Cards: Default vs Safe */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Default Route */}
              <div className="bg-slate-900/60 rounded-2xl p-3 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Default Route
                </span>
                <div className="text-base font-bold text-slate-200">
                  {routeData.defaultRoute.durationMinutes} min
                </div>
                <div className="text-[11px] text-slate-400">
                  {routeData.defaultRoute.distanceKm} km (Direct)
                </div>
              </div>

              {/* Safe Route */}
              <div className="bg-emerald-950/30 rounded-2xl p-3 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Safe Alternative
                  </span>
                  {routeData.extraMinutes > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-400">
                      +{routeData.extraMinutes}m
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-emerald-300">
                  {routeData.safeRoute.durationMinutes} min
                </div>
                <div className="text-[11px] text-slate-400">
                  {routeData.safeRoute.distanceKm} km (Bypasses flood spots)
                </div>
              </div>
            </div>

            {/* List of Avoided Streets */}
            {routeData.avoidedSegments.length > 0 && (
              <div className="bg-slate-900/50 rounded-2xl p-3 border border-white/5 space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Avoided High-Risk Streets ({routeData.avoidedSegments.length}):
                </span>
                <ul className="space-y-1 text-xs">
                  {routeData.avoidedSegments.map((s, idx) => (
                    <li key={idx} className="flex items-center justify-between text-slate-300">
                      <span className="truncate pr-2">• {s.name}</span>
                      <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                        {s.level} ({s.score})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
