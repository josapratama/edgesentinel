import { Video, Trash2, Edit2, Shield, MapPin, Gauge } from 'lucide-react'
import type { Camera } from '../../types'
import { Badge } from '../ui/Badge'

interface CamerasListViewProps {
  cameras: Camera[]
  onEditCamera: (camera: Camera) => void
  onDeleteCamera: (id: string) => void
  onToggleActive: (camera: Camera) => void
}

export function CamerasListView({
  cameras,
  onEditCamera,
  onDeleteCamera,
  onToggleActive,
}: CamerasListViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-cyan-400" />
            <span>Manajemen Saluran Kamera CCTV</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola saluran RTSP, batas FPS, dan status deteksi keamanan per kamera.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama & Posisi</th>
                <th className="px-5 py-3.5">Stream URL</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Deteksi AI</th>
                <th className="px-5 py-3.5">FPS</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {cameras.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-cyan-400" />
                      <span>{c.location}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] text-slate-400 max-w-[200px] truncate">
                    {c.stream_url}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => onToggleActive(c)}
                      className="cursor-pointer"
                    >
                      {c.is_active ? (
                        <Badge variant="emerald" dot pulse>Aktif</Badge>
                      ) : (
                        <Badge variant="slate" dot>Nonaktif</Badge>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    {c.detection_enabled ? (
                      <span className="flex items-center gap-1 text-cyan-400">
                        <Shield className="h-3.5 w-3.5" />
                        <span>Hidup</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">Mati</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-300">
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5 text-slate-500" />
                      <span>{c.fps_limit} FPS</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditCamera(c)}
                        title="Edit kamera"
                        className="rounded-xl border border-slate-700/80 bg-slate-800/80 p-2 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCamera(c.id)}
                        title="Hapus kamera"
                        className="rounded-xl border border-rose-900/40 bg-rose-950/40 p-2 text-rose-400 hover:bg-rose-900/60 hover:text-white transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
