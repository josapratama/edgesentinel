import { useState } from 'react'
import { Maximize2, Shield, ShieldOff, Settings, AlertTriangle } from 'lucide-react'
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

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl transition-all duration-300 hover:border-cyan-500/50 ${
        isFullscreen
          ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl border-cyan-500'
          : 'h-[320px]'
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
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-500/70" />
            <p className="text-xs font-medium">Kamera Sedang Offline / Tidak Terhubung</p>
            <p className="text-[10px] text-slate-600 font-mono max-w-[240px] truncate">
              {camera.stream_url}
            </p>
          </div>
        )}

        {/* Top Floating Overlay Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10">
            <span
              className={`h-2 w-2 rounded-full ${
                camera.is_active ? 'bg-red-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>{camera.is_active ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          {camera.detection_enabled && (
            <div className="flex items-center gap-1 rounded-md bg-cyan-950/80 px-2 py-1 text-[10px] font-semibold text-cyan-400 border border-cyan-700/50 backdrop-blur-md">
              <Shield className="h-3 w-3" />
              <span>AI DETECT</span>
            </div>
          )}
        </div>

        {/* Top Right Quick Actions */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 transition-opacity">
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
            <span>Target: {camera.fps_limit} FPS</span>
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

