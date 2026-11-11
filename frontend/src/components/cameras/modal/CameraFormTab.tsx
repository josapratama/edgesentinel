import React from 'react'
import { Search, PenTool, Shield } from 'lucide-react'

interface CameraFormTabProps {
  name: string
  setName: (v: string) => void
  location: string
  setLocation: (v: string) => void
  streamUrl: string
  setStreamUrl: (v: string) => void
  fpsLimit: number
  setFpsLimit: (v: number) => void
  detectionEnabled: boolean
  setDetectionEnabled: (v: boolean) => void
  roiPolygonJson: string
  setRoiPolygonJson: (v: string) => void
  onOpenScanner: () => void
  onOpenTripwire: () => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  saving: boolean
}

const ROI_PRESETS = [
  { name: 'Seluruh Layar (Tanpa Batas)', value: '' },
  { name: 'Jalanan / Separuh Bawah (50% - 100%)', value: JSON.stringify([[0.05, 0.5], [0.95, 0.5], [0.95, 0.95], [0.05, 0.95]]) },
  { name: 'Area Tengah / Akses Pintu Gerbang', value: JSON.stringify([[0.2, 0.3], [0.8, 0.3], [0.85, 0.9], [0.15, 0.9]]) },
  { name: 'Koridor Sempit / Jalur Masuk', value: JSON.stringify([[0.35, 0.2], [0.65, 0.2], [0.75, 0.95], [0.25, 0.95]]) },
]

export function CameraFormTab({
  name,
  setName,
  location,
  setLocation,
  streamUrl,
  setStreamUrl,
  fpsLimit,
  setFpsLimit,
  detectionEnabled,
  setDetectionEnabled,
  roiPolygonJson,
  setRoiPolygonJson,
  onOpenScanner,
  onOpenTripwire,
  onSubmit,
  onClose,
  saving,
}: CameraFormTabProps) {
  return (
    <form onSubmit={onSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          Nama Kamera *
        </label>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: CCTV Halaman Depan"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          Lokasi / Posisi
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Pintu Gerbang / Garasi / Gudang"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-300">
            Stream URL (RTSP / Demo) *
          </label>
          <button
            type="button"
            onClick={onOpenScanner}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium"
          >
            <Search className="h-3 w-3" />
            <span>Scan DVR Otomatis</span>
          </button>
        </div>
        <input
          required
          type="text"
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          placeholder="rtsp://admin:pass@192.168.100.23:554/Streaming/Channels/102"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-cyan-300 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          💡 Hikvision format: <code className="text-cyan-400">Channels/102</code> (Sub-stream) atau <code className="text-cyan-400">demo://kamera</code>.
        </p>
      </div>

      {/* Virtual Tripwire / ROI Area Selector with Canvas Button */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span>Zona Proteksi / Virtual Tripwire (ROI)</span>
          </label>
          <button
            type="button"
            onClick={onOpenTripwire}
            className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-medium"
          >
            <PenTool className="h-3 w-3" />
            <span>Gambar Sendiri di Layar</span>
          </button>
        </div>

        <select
          value={roiPolygonJson}
          onChange={(e) => setRoiPolygonJson(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
        >
          {ROI_PRESETS.map((p) => (
            <option key={p.name} value={p.value}>
              {p.name}
            </option>
          ))}
          {roiPolygonJson && !ROI_PRESETS.some((p) => p.value === roiPolygonJson) && (
            <option value={roiPolygonJson}>Custom Gambar Titik Sendiri (Aktif)</option>
          )}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Target FPS AI
          </label>
          <select
            value={fpsLimit}
            onChange={(e) => setFpsLimit(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            <option value={3.0}>3 FPS (Hemat CPU Pi)</option>
            <option value={5.0}>5 FPS (Rekomendasi Edge)</option>
            <option value={8.0}>8 FPS (Cepat)</option>
            <option value={10.0}>10 FPS (Real-time)</option>
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-300 hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={detectionEnabled}
              onChange={(e) => setDetectionEnabled(e.target.checked)}
              className="rounded border-slate-700 text-cyan-600 focus:ring-0"
            />
            <span className="font-medium">Deteksi AI Aktif</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-950/40 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan Kamera'}
        </button>
      </div>
    </form>
  )
}

