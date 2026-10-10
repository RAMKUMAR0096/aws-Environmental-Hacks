'use client';

import React, { useEffect, useState } from 'react';
import { Flame, Download, RefreshCw, AlertTriangle, ArrowLeft, History, Users, ShieldAlert } from 'lucide-react';
import { fetchHotspots, HotspotsResponse, HotspotItem, RecurringPoint } from '../lib/api';

interface HotspotsViewProps {
  demoMode: boolean;
  onBackToMap: () => void;
  onSelectSegmentId: (id: string) => void;
}

export const HotspotsView: React.FC<HotspotsViewProps> = ({
  demoMode,
  onBackToMap,
  onSelectSegmentId,
}) => {
  const [data, setData] = useState<HotspotsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchHotspots(demoMode);
      setData(res);
    } catch (e) {
      console.warn('Failed to fetch hotspots:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [demoMode]);

  const handleExportCsv = () => {
    if (!data?.topHotspots) return;
    const header = 'Rank,SegmentID,StreetName,Area,ElevationM,Score,Level,Confidence,ActiveReports\n';
    const lines = data.topHotspots.map(
      h => `${h.rank},"${h.segmentId}","${h.name}","${h.area}",${h.elevationM},${h.score},"${h.level}","${h.confidence}",${h.reportCount}`
    );
    const blob = new Blob([header + lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chennai-flood-hotspots-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Top Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMap}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/5 transition-colors"
            title="Return to Map"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Officials' Flood Hotspots
              </h1>
              <span className="rounded-full bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                Ward Priority
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Top 10 vulnerable street corridors ranked by transparent 3-hour flood index & citizen reports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 px-3 py-2 text-xs font-medium text-slate-300 border border-white/5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!data?.topHotspots}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 px-3 py-2 text-xs font-medium text-white shadow-md shadow-emerald-500/20 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 10 Ranked Cards Table */}
      <div className="glass-panel-elevated rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Top 10 Ranked Choke Points</h2>
          </div>
          <span className="text-xs text-slate-400">
            Updated {data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('en-IN') : 'just now'} IST
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="animate-spin h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2" />
            Loading ranked hotspots...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Street Segment</th>
                  <th className="py-3 px-3">Area</th>
                  <th className="py-3 px-3">Elevation</th>
                  <th className="py-3 px-3">Risk Score</th>
                  <th className="py-3 px-3">Rain (3h)</th>
                  <th className="py-3 px-3">Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data?.topHotspots.map(item => (
                  <tr
                    key={item.segmentId}
                    onClick={() => {
                      onSelectSegmentId(item.segmentId);
                      onBackToMap();
                    }}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-extrabold text-slate-400">
                      #{item.rank}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {item.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                        {item.area}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {item.elevationM}m
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] ${
                          item.score >= 80
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : item.score >= 60
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : item.score >= 30
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {item.score}/100 • {item.level}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {item.rainNext3h.toFixed(1)} mm
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {item.reportCount > 0 ? (
                        <span className="text-cyan-400 font-semibold">{item.reportCount}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Recurring Choke Points Section */}
      <div className="mt-8 glass-panel-elevated rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-bold text-white">Recurring Choke Points (Historical Inundation)</h2>
            <p className="text-xs text-slate-400">
              Corridors with documented chronic inundation during Cyclone Michaung (2023) and 2015 floods
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data?.recurringChokePoints.map((pt, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelectSegmentId(pt.segmentId);
                onBackToMap();
              }}
              className="bg-slate-900/60 rounded-2xl p-4 border border-white/5 hover:border-cyan-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{pt.name}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  {pt.area}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {pt.source}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-white/5 pt-2">
                <span>Elevation: {pt.elevationM}m</span>
                <span className="text-cyan-400 font-medium">Click to view on map →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
