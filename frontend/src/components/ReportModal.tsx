'use client';

import React, { useState, useRef } from 'react';
import { X, Camera, Upload, MapPin, CheckCircle2, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { getUploadUrl, submitReport } from '../lib/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onReportSubmitted,
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 12.9772,
    lng: 80.2195, // Default to Velachery Ram Nagar
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Compress image to max 1280px width
        const canvas = document.createElement('canvas');
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setPhotoPreview(compressedDataUrl);
        setPhotoBase64(compressedDataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        () => {
          alert('GPS location permission denied; using pilot zone default coordinates.');
        }
      );
    }
  };

  const handleSubmit = async () => {
    if (!photoBase64 || !coords) {
      setErrorMsg('Please attach a flood photo.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Get presigned upload URL
      const { uploadUrl, photoKey } = await getUploadUrl();

      // 2. Submit report with Bedrock analysis
      const res = await submitReport({
        photoKey,
        lat: coords.lat,
        lng: coords.lng,
        imageBase64: photoBase64,
      });

      if (res.error) {
        setErrorMsg(res.message || 'Report submission failed');
      } else {
        setResult(res);
        onReportSubmitted();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPhotoPreview(null);
    setPhotoBase64(null);
    setResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel-elevated w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Report Street Flooding</h2>
              <p className="text-[11px] text-slate-400">Verified by Amazon Bedrock Multimodal AI</p>
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

        {/* Form State */}
        {!result ? (
          <div className="mt-4 space-y-4">
            {/* Photo Uploader */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 hover:border-cyan-500/50 bg-slate-900/40 p-6 cursor-pointer transition-colors overflow-hidden group"
            >
              {photoPreview ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden">
                  <img
                    src={photoPreview}
                    alt="Flood report preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white font-medium bg-black/60 px-3 py-1.5 rounded-full">
                      Change Photo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-200">
                      Take or upload a street photo
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      JPEG or PNG (auto-compressed on device)
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Coordinates / Location */}
            <div className="flex items-center justify-between bg-slate-900/60 rounded-2xl p-3 border border-white/5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <span>
                  {coords
                    ? `Lat ${coords.lat.toFixed(4)}, Lng ${coords.lng.toFixed(4)}`
                    : 'Locating...'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleFetchLocation}
                className="text-cyan-400 hover:underline text-[11px] font-medium"
              >
                Use Current GPS
              </button>
            </div>

            {/* Privacy Notice */}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Privacy note: No account required. Only GPS coordinates and photo are submitted.
              Images auto-expire after 30 days via S3 lifecycle.
            </p>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !photoPreview}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Verifying with Amazon Bedrock...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Submit for AI Verification</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Result Card after Bedrock Analysis */
          <div className="mt-4 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  AI Verification Verdict
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    result.report.status === 'verified'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {result.report.status === 'verified' ? 'Verified' : 'Unverified'}
                </span>
              </div>

              {/* Depth class badge */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Depth</span>
                  <div className="text-sm font-bold text-white capitalize mt-0.5">
                    {result.report.aiVerdict?.depthClass || 'Unknown'}
                  </div>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Confidence</span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {Math.round((result.report.aiVerdict?.confidence || 0) * 100)}%
                  </div>
                </div>
              </div>

              {/* Note */}
              <p className="text-xs text-slate-300 italic bg-black/30 p-2.5 rounded-xl border border-white/5">
                "{result.report.aiVerdict?.note}"
              </p>

              {result.nearestSegment && (
                <div className="text-xs text-slate-400">
                  Mapped to nearest segment: <strong className="text-slate-200">{result.nearestSegment.name}</strong> ({result.nearestSegment.distanceMeters}m away)
                </div>
              )}

              {result.riskUpdated && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Street risk score updated with citizen report bump (+25 pts).</span>
                </div>
              )}
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
