import { useState } from 'react'
import { Maximize2, Shield, ShieldOff, Settings, AlertTriangle, Lock, KeyRound } from 'lucide-react'
import type { Camera } from '../types'

interface CameraCardProps {
  camera: Camera
  onEdit: (camera: Camera) => void
  onToggleDetection: (camera: Camera) => void
}

export function CameraCard({ camera, onEdit, onToggleDetection }: CameraCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasError, setHasError] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const streamSrc = `/api/streams/${camera.id}/live?t=${camera.updated_at}`
  const connStatus = camera.connection_status || (camera.is_active ? 'online' : 'offline')
  const isEncrypted = connStatus === 'encrypted_error'
  const isAuthError = connStatus === 'auth_error'
  const isDemo = connStatus === 'fallback_demo' || camera.stream_url.startsWith('demo://')

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-slate-900/90 shadow-xl transition-all duration-300 ${
        isEncrypted
          ? 'border-purple-600/70 hover:border-purple-500'
          : isAuthError
          ? 'border-red-600/70 hover:border-red-500'
          : 'border-slate-800 hover:border-cyan-500/50'
      } ${
        isFullscreen
          ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl border-cyan-500'
          : 'h-[340px]'
      }`}
    >
      {/* Video Stream Container */}
      <div className="relative flex-1 overflow-hidden bg-black flex items-center justify-center">
        {!hasError && camera.is_active ? (
          <img
            src={streamSrc}
            alt={camera.name}
            onError={() => setHasError(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500/70" />
            <p className="text-xs font-medium text-slate-300">Kamera Sedang Offline / Tidak Terhubung</p>
            <p className="text-[10px] text-slate-500 font-mono max-w-[240px] truncate">
              {camera.stream_url}
            </p>
          </div>
        )}

        {/* Diagnostic Banner if stream has encryption or authentication error */}
        {isEncrypted && (
          <div className="absolute inset-x-0 bottom-0 bg-purple-950/90 border-t border-purple-500/50 p-2.5 backdrop-blur-md z-10 flex items-start gap-2">
            <Lock className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-purple-200 leading-tight">
              <span className="font-semibold text-purple-300">Enkripsi Stream Terdeteksi (Hikvision):</span> Feed terenkripsi sehingga hanya muncul kotak abu-abu. Matikan <i>Stream Encryption</i> di menu Hikvision Guarding Vision atau Platform Access untuk membuka video.
            </div>
          </div>
        )}

        {isAuthError && (
          <div className="absolute inset-x-0 bottom-0 bg-red-950/90 border-t border-red-500/50 p-2.5 backdrop-blur-md z-10 flex items-start gap-2">
            <KeyRound className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-red-200 leading-tight">
              <span className="font-semibold text-red-300">Autentikasi Gagal (401):</span> Pastikan username & password RTSP DVR Anda sudah sesuai di pengaturan saluran kamera.
            </div>
          </div>
        )}

        {/* Top Floating Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
          {/* Main Status Badge */}
          <div className="flex items-center gap-1.5 rounded-md bg-black/75 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10">
            <span
              className={`h-2 w-2 rounded-full ${
                !camera.is_active
                  ? 'bg-slate-500'
                  : isEncrypted
                  ? 'bg-purple-500 animate-pulse'
                  : isAuthError
                  ? 'bg-rose-500 animate-pulse'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span>
              {!camera.is_active
                ? 'OFFLINE'
                : isEncrypted
                ? 'ENKRIPSI AKTIF'
                : isAuthError
                ? 'AUTH ERROR'
                : isDemo
                ? 'DEMO AI'
                : 'LIVE RTSP'}
            </span>
          </div>

          {/* AI Detect Badge */}
          {camera.detection_enabled && (
            <div className="flex items-center gap-1 rounded-md bg-cyan-950/80 px-2 py-1 text-[10px] font-semibold text-cyan-400 border border-cyan-700/50 backdrop-blur-md">
              <Shield className="h-3 w-3" />
              <span>AI DETECT</span>
            </div>
          )}

          {/* ROI Tripwire Badge */}
          {camera.roi_polygon_json && (
            <div className="flex items-center gap-1 rounded-md bg-amber-950/80 px-2 py-1 text-[10px] font-semibold text-amber-400 border border-amber-700/50 backdrop-blur-md">
              <span>TRIPWIRE ROI</span>
            </div>
          )}
        </div>

        {/* Top Right Quick Actions */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 transition-opacity z-10">
          <button
            onClick={() => onToggleDetection(camera)}
            title={camera.detection_enabled ? 'Matikan Deteksi AI' : 'Aktifkan Deteksi AI'}
            className={`flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-md transition-colors ${
              camera.detection_enabled
                ? 'bg-cyan-600/80 text-white hover:bg-cyan-500'
                : 'bg-black/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {camera.detection_enabled ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            title="Perbesar Tampilan"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-slate-300 backdrop-blur-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEdit(camera)}
            title="Pengaturan Kamera"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-slate-300 backdrop-blur-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Camera Footer Bar */}
      <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/90 px-3.5 py-2.5">
        <div>
          <h3 className="font-semibold text-xs text-white truncate max-w-[200px]">
            {camera.name}
          </h3>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <span>📍 {camera.location}</span>
            <span className="text-slate-600">•</span>
            <span>{camera.resolution || `${camera.fps_limit} FPS`}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(camera)}
            className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Konfigurasi
          </button>
        </div>
      </div>
    </div>
  )
}
