import { Plus, Video, Settings, Trash2, MapPin } from 'lucide-react'
import type { Camera } from '../types'
import { formatDateTime } from '../lib/utils'

interface CamerasViewProps {
  cameras: Camera[]
  onAddCamera: () => void
  onEditCamera: (camera: Camera) => void
  onDeleteCamera: (id: string) => void
  onToggleActive: (camera: Camera) => void
}

export function CamerasView({
  cameras,
  onAddCamera,
  onEditCamera,
  onDeleteCamera,
  onToggleActive,
}: CamerasViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-cyan-400" />
            Manajemen Saluran Kamera CCTV
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola URL stream RTSP, HTTP/MJPEG, Webcam USB, atau simulator demo camera.
          </p>
        </div>

        <button
          onClick={onAddCamera}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" /> Tambah Saluran Kamera
        </button>
      </div>

      {/* Camera Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg transition-all hover:border-slate-700"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-sm text-white">{cam.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{cam.location}</span>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                    cam.is_active
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {cam.is_active ? 'ONLINE' : 'DISABLED'}
                </span>
              </div>

              <div className="space-y-2 rounded-xl bg-slate-950/70 p-3 text-xs border border-slate-800/80 font-mono text-slate-300">
                <div className="truncate">
                  <span className="text-slate-500">Stream: </span>
                  <span className="text-cyan-300">{cam.stream_url}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Target FPS: {cam.fps_limit}</span>
                  <span>Deteksi AI: {cam.detection_enabled ? 'Aktif' : 'Non-aktif'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-4">
              <span className="text-[10px] text-slate-500">
                Dibuat: {formatDateTime(cam.created_at)}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleActive(cam)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    cam.is_active
                      ? 'bg-amber-950/50 text-amber-400 hover:bg-amber-900/50'
                      : 'bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/50'
                  }`}
                >
                  {cam.is_active ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => onEditCamera(cam)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteCamera(cam.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
