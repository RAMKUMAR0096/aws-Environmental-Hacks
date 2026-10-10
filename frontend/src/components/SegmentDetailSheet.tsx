'use client';

import React from 'react';
import { X, ExternalLink, CloudRain, Mountain, History, Users, AlertCircle, ShieldCheck } from 'lucide-react';
import { SegmentWithRisk } from '../lib/api';

interface SegmentDetailSheetProps {
  segment: SegmentWithRisk | null;
  onClose: () => void;
}

export const SegmentDetailSheet: React.FC<SegmentDetailSheetProps> = ({ segment, onClose }) => {
  if (!segment) return null;

  const { risk } = segment;

  const levelColorMap = {
    low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    severe: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const scoreColorMap = {
    low: 'text-emerald-400',
    moderate: 'text-amber-400',
    high: 'text-orange-400',
    severe: 'text-red-400',
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4 sm:p-6 flex justify-center pointer-events-none">
      <div className="glass-panel-elevated pointer-events-auto w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/10 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${levelColorMap[risk.level]}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                {risk.level} Risk
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-white/5">
                {segment.area}
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400 border border-white/5">
                {risk.confidence} confidence
              </span>
            </div>
            <h2 className="mt-2 text-lg sm:text-xl font-bold text-white tracking-tight">
              {segment.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close Sheet"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score and Plain English Summary */}
        <div className="mt-4 flex items-center gap-4 bg-slate-900/60 rounded-2xl p-4 border border-white/5">
          <div className="flex flex-col items-center justify-center border-r border-white/10 pr-4">
            <span className={`text-3xl font-extrabold tracking-tight ${scoreColorMap[risk.level]}`}>
              {risk.score}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Score / 100</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {risk.explanation || 'Rule-based evaluation incorporating current forecast, terrain elevation, and historical records.'}
          </p>
        </div>

        {/* Factor Breakdown Bars */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Transparent Risk Factors
          </h3>

          {/* 1. Rain Factor */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <CloudRain className="h-3.5 w-3.5 text-cyan-400" />
                Precipitation Forecast
              </span>
              <span className="text-slate-400">
                {risk.rain.next3hMm.toFixed(1)}mm (next 3h) • {risk.rain.past24hMm.toFixed(1)}mm (past 24h)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(risk.factors.rainScore * 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Terrain Factor */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Mountain className="h-3.5 w-3.5 text-emerald-400" />
                Topography / Elevation
              </span>
              <span className="text-slate-400">
                {segment.elevationM}m elevation • {Math.round(risk.factors.terrainScore * 100)}% vulnerability
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(risk.factors.terrainScore * 100)}%` }}
              />
            </div>
          </div>

          {/* 3. History Factor */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <History className="h-3.5 w-3.5 text-amber-400" />
                Historical Inundation History
              </span>
              <span className="text-slate-400">
                {segment.historyFlag ? 'Documented (+25 pts)' : 'No recorded flooding'}
              </span>
            </div>
            {segment.historySource && (
              <a
                href={segment.historySource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline mt-0.5"
              >
                <span>{segment.historySource.title} ({segment.historySource.year})</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* 4. Citizen Reports */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Users className="h-3.5 w-3.5 text-purple-400" />
                Verified Citizen Reports (past 2h)
              </span>
              <span className="text-slate-400">
                {risk.verifiedReports2h} verified report{risk.verifiedReports2h === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Formula: Rule-based index (Open-Meteo + Elevation + History)</span>
          <span>Updated {new Date(risk.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
        </div>
      </div>
    </div>
  );
};
