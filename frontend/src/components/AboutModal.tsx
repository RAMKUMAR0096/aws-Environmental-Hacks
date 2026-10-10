'use client';

import React from 'react';
import { X, ShieldAlert, Cpu, Database, AlertCircle, Info, ExternalLink } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel-elevated w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">About Chennai Flood Pulse</h2>
              <p className="text-[11px] text-slate-400">Model methodology, data sources & transparency</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. Methodology: Rule-Based Index (Honesty) */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            Transparent Rule-Based Index (Not ML)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Chennai Flood Pulse uses a <strong>deterministic, rule-based index</strong> designed for maximum transparency. It is <strong>NOT a black-box machine learning model</strong>. The risk score (0–100) dynamically combines 4 physical parameters:
          </p>
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/5 font-mono text-[11px] text-slate-300 space-y-1">
            <p>intensity = clamp(maxHourlyMm / 30, 0, 1)</p>
            <p>accumulation = clamp((past24hMm + next3hMm) / 120, 0, 1)</p>
            <p>rainScore = 0.6 * intensity + 0.4 * accumulation</p>
            <p className="text-cyan-400">baseScore = 100 * rainScore * (0.40 + 0.35 * terrain + 0.25 * history)</p>
            <p className="text-emerald-400">finalScore = round(min(100, baseScore + 25 * reportScore))</p>
          </div>
          <p className="text-[11px] text-slate-400">
            * Edge rule: If rain is under 1mm over the next 3h and zero citizen reports exist, score is capped at 10 to prevent false alarms during dry weather.
          </p>
        </section>

        {/* 2. AWS Architecture */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            Built on AWS
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every AWS service performs a real production role:
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc">
            <li><strong>Amazon EventBridge:</strong> Runs 15-minute cron triggers for serverless risk compute.</li>
            <li><strong>AWS Lambda (Node 20 TS):</strong> Runs the pure mathematical risk engine and routing algorithms.</li>
            <li><strong>Amazon DynamoDB:</strong> On-demand storage for 32 street segments, risk states, and citizen reports.</li>
            <li><strong>Amazon Location Service:</strong> Map styles and routing with avoid-areas for waterlogged streets.</li>
            <li><strong>Amazon Bedrock (Converse API):</strong> Multimodal AI verifying citizen flood photos and depth class.</li>
            <li><strong>Amazon SNS:</strong> Automated email alerts when area risk crosses citizen-chosen thresholds.</li>
            <li><strong>Amazon S3:</strong> Presigned photo uploads with 30-day lifecycle auto-expiry.</li>
          </ul>
        </section>

        {/* 3. Data Sources */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-amber-400" />
            Verified Data Sources
          </h3>
          <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
            <li><strong>Weather:</strong> Open-Meteo Hourly Precipitation Forecast API (live 4-area centroids).</li>
            <li><strong>Elevation:</strong> Open-Meteo Elevation API (topographic baseline across pilot zone).</li>
            <li><strong>Flood History:</strong> Verified public news articles from <em>The Hindu</em>, <em>The Indian Express</em>, and <em>The New Indian Express</em> covering Cyclone Michaung (2023) and 2015 floods.</li>
          </ul>
        </section>

        {/* 4. Limitations & Honesty */}
        <section className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            Important Limitations & Safety Notice
          </h3>
          <ul className="text-xs text-amber-200/90 space-y-1 pl-4 list-disc leading-relaxed">
            <li>This is a hackathon pilot application for South Chennai (Velachery, Pallikaranai, Mudichur, Medavakkam) covering 32 representative street segments.</li>
            <li>It is <strong>NOT an official municipal early warning system</strong>. Do not rely on it for safety-critical emergency evacuations. Always follow instructions from Greater Chennai Corporation (GCC) and the Tamil Nadu Disaster Management Authority.</li>
            <li>Physical IoT sensors are not currently integrated (noted as future work).</li>
          </ul>
        </section>

        {/* 5. Disclosure */}
        <div className="pt-2 border-t border-white/10 text-[11px] text-slate-500 flex items-center justify-between">
          <span>AI tools disclosure: Built with Google Antigravity</span>
          <span>Version 1.0 • WeMakeDevs x AWS Bharat Builds Tour</span>
        </div>
      </div>
    </div>
  );
};
