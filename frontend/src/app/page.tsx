import React from "react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="glass-panel max-w-lg rounded-2xl p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Chennai Flood Pulse
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Street-Level Flood Risk & Safe Navigation
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Pilot Zone: Velachery • Pallikaranai • Mudichur • Medavakkam
        </p>
      </div>
    </main>
  );
}
