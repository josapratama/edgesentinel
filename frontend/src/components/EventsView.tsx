import { useState, useMemo } from 'react'
import { Trash2, ExternalLink, CheckCircle2, XCircle, Search, Filter, Play, Film, Clock, AlertTriangle } from 'lucide-react'
import type { SecurityEvent, Camera } from '../types'
import { formatDateTime } from '../lib/utils'

interface EventsViewProps {
  events: SecurityEvent[]
  cameras: Camera[]
  onDeleteEvent: (id: string) => void
}

export function EventsView({ events, cameras, onDeleteEvent }: EventsViewProps) {
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)

  // Calculate 24-hour distribution for timeline
  const hourlyCounts = useMemo(() => {
    const counts = Array(24).fill(0)
    events.forEach((evt) => {
      try {
        const d = new Date(evt.created_at)
        const hr = d.getHours()
        counts[hr] += 1
      } catch {
        // ignore date parse err
      }
    })
    return counts
  }, [events])

  const maxHourlyCount = Math.max(1, ...hourlyCounts)

  const filteredEvents = events.filter((e) => {
    if (selectedCamera && e.camera_id !== selectedCamera) return false
    if (selectedClass && e.object_class.toLowerCase() !== selectedClass.toLowerCase()) return false
    if (selectedHour !== null) {
      try {
        const hr = new Date(e.created_at).getHours()
        if (hr !== selectedHour) return false
      } catch {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* 24-Hour Interactive Timeline Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span>Timeline Kejadian 24 Jam</span>
            {selectedHour !== null && (
              <span className="text-[11px] font-normal text-amber-400">
                (Memfilter Jam {selectedHour.toString().padStart(2, '0')}:00)
              </span>
            )}
          </div>
          {selectedHour !== null && (
            <button
              onClick={() => setSelectedHour(null)}
              className="text-[11px] text-cyan-400 hover:underline"
            >
              Reset ke Semua Jam
            </button>
          )}
        </div>

        {/* 24 hour bars */}
        <div className="grid grid-cols-24 gap-1 items-end h-14 pt-2 border-b border-slate-800/80">
          {hourlyCounts.map((count, hour) => {
            const heightPct = count > 0 ? Math.max(15, (count / maxHourlyCount) * 100) : 4
            const isSelected = selectedHour === hour
            return (
              <button
                key={hour}
                type="button"
                onClick={() => setSelectedHour(selectedHour === hour ? null : hour)}
                title={`Pukul ${hour.toString().padStart(2, '0')}:00 - ${count} Kejadian`}
                className={`group relative flex flex-col justify-end w-full h-full rounded-xs transition-all ${
                  isSelected
                    ? 'bg-amber-500 ring-2 ring-amber-400 shadow-md'
                    : count > 0
                    ? 'bg-cyan-600/70 hover:bg-cyan-500'
                    : 'bg-slate-800/50 hover:bg-slate-700/60'
                }`}
              >
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-xs transition-all ${
                    count > 0 ? (isSelected ? 'bg-amber-400' : 'bg-cyan-400') : 'bg-transparent'
                  }`}
                />
              </button>
            )
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:59</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span>Filter Kejadian:</span>
          </div>

          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Semua Kamera</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Semua Jenis Objek</option>
            <option value="person">Person (Orang)</option>
            <option value="car">Car (Mobil)</option>
            <option value="motorcycle">Motorcycle (Motor)</option>
            <option value="package">Package (Paket / Kurir)</option>
            <option value="dog">Animal (Hewan)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Menampilkan <strong className="text-white">{filteredEvents.length}</strong> kejadian
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-16 text-center">
          <Search className="h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">Belum Ada Kejadian Terdeteksi</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Edge AI sedang aktif memantau live camera feed. Setiap deteksi objek akan otomatis terekam di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className={`group flex flex-col overflow-hidden rounded-2xl border bg-slate-900/80 shadow-md transition-all ${
                evt.is_loitering
                  ? 'border-rose-500/80 hover:border-rose-400'
                  : 'border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              {/* Snapshot thumbnail */}
              <div
                className="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer"
                onClick={() => {
                  if (evt.video_url) {
                    setPlayingVideo(evt.video_url)
                  } else {
                    setPreviewImage(evt.snapshot_url)
                  }
                }}
              >
                <img
                  src={evt.snapshot_url}
                  alt={evt.object_class}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Video Play Button Overlay if video exists */}
                {evt.video_url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600/90 text-white shadow-lg backdrop-blur-xs group-hover:scale-110 transition-transform">
                      <Play className="h-5 w-5 fill-white ml-0.5" />
                    </div>
                  </div>
                )}

                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <div className="rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-md border border-white/10">
                    {evt.object_class} ({int(evt.confidence * 100)}%)
                  </div>
                  {evt.is_loitering && (
                    <div className="flex items-center gap-0.5 rounded-md bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      <span>LOITERING</span>
                    </div>
                  )}
                </div>

                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {evt.video_url && (
                    <div className="flex items-center gap-0.5 rounded-md bg-blue-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-blue-300 border border-blue-800/60 backdrop-blur-md">
                      <Film className="h-2.5 w-2.5" />
                      <span>10s MP4</span>
                    </div>
                  )}

                  {evt.notified_whatsapp ? (
                    <div className="flex items-center gap-1 rounded-md bg-emerald-950/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800/60 backdrop-blur-md">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>WA</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700 backdrop-blur-md">
                      <XCircle className="h-3 w-3" />
                      <span>Log</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Details */}
              <div className="flex flex-1 flex-col justify-between p-3.5">
                <div>
                  <h4 className="font-semibold text-xs text-white truncate">
                    {evt.camera_name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {formatDateTime(evt.created_at)}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewImage(evt.snapshot_url)}
                      className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" /> Foto
                    </button>
                    {evt.video_url && (
                      <button
                        onClick={() => setPlayingVideo(evt.video_url!)}
                        className="flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Play className="h-3 w-3" /> Klip
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteEvent(evt.id)}
                    title="Hapus kejadian"
                    className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Snapshot Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <img
              src={previewImage}
              alt="Bukti Keamanan"
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 rounded-full bg-black/70 p-2 text-white hover:bg-black/90 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Video Clip Playback Modal */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white">Pemutaran Rekaman Kejadian (10s MP4)</h3>
              </div>
              <button
                onClick={() => setPlayingVideo(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video
                src={playingVideo}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Durasi: ~10 Detik (Pre-buffer + Post-event)</span>
              <a
                href={playingVideo}
                download
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                Unduh Rekaman MP4
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function int(val: number): number {
  return Math.round(val)
}
