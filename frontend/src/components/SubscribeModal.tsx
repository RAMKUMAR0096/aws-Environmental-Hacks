'use client';

import React, { useState } from 'react';
import { X, Bell, CheckCircle2, AlertCircle, Mail, MapPin } from 'lucide-react';
import { AreaName, RiskLevel, subscribeToAlerts } from '../lib/api';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [area, setArea] = useState<AreaName>('Velachery');
  const [threshold, setThreshold] = useState<RiskLevel>('high');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await subscribeToAlerts({ email, area, threshold });
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Subscription failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setEmail('');
    setIsSuccess(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Area Flood Alerts</h2>
              <p className="text-[11px] text-slate-400">Powered by Amazon SNS notifications</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Your Email Address
              </label>
              <div className="flex items-center gap-2 bg-slate-900/70 rounded-2xl px-3 py-2.5 border border-white/5">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="resident@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-transparent text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Pilot Area
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Velachery', 'Pallikaranai', 'Mudichur', 'Medavakkam'] as AreaName[]).map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setArea(a)}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                      area === a
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Alert Threshold
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { level: 'moderate', label: 'Moderate (30+)' },
                  { level: 'high', label: 'High (60+)' },
                  { level: 'severe', label: 'Severe (80+)' },
                ].map(item => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setThreshold(item.level as RiskLevel)}
                    className={`p-2 rounded-xl text-[11px] font-medium border text-center transition-all ${
                      threshold === item.level
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Rate limited to max 1 email alert per 3 hours to avoid alert fatigue.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Registering with SNS...' : 'Subscribe to Alerts'}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4 text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Subscription Registered!</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Amazon SNS has sent a verification email to <strong>{email}</strong>.
                Please <strong>check your inbox and click "Confirm subscription"</strong> to activate alerts.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="w-full rounded-2xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
