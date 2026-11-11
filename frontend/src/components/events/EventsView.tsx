import { useState, useMemo } from 'react'
import { Filter, Search } from 'lucide-react'
import type { SecurityEvent, Camera } from '../../types'
import { EventTimeline } from './EventTimeline'
import { EventCard } from './EventCard'
import { VideoPlayerModal } from './VideoPlayerModal'
import { SnapshotModal } from './SnapshotModal'

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
      {/* 24-Hour Visual Timeline */}
      <EventTimeline
        hourlyCounts={hourlyCounts}
        selectedHour={selectedHour}
        onSelectHour={setSelectedHour}
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md shadow-xl">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span>Filter Kejadian:</span>
          </div>

          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
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
            className="rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="">Semua Jenis Objek</option>
            <option value="person">Person (Orang)</option>
            <option value="car">Car (Mobil)</option>
            <option value="motorcycle">Motorcycle (Motor)</option>
            <option value="package">Package (Paket / Kurir)</option>
            <option value="dog">Animal (Hewan)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-semibold">
          Menampilkan <strong className="text-white font-bold">{filteredEvents.length}</strong> kejadian
        </div>
      </div>

      {/* Event Cards Grid */}
      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 py-16 text-center bg-slate-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 mb-3">
            <Search className="h-6 w-6 text-slate-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">Belum Ada Kejadian Terdeteksi</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Edge AI sedang aktif memantau live camera feed. Setiap deteksi objek akan otomatis tersimpan di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredEvents.map((evt) => (
            <EventCard
              key={evt.id}
              event={evt}
              onPreviewSnapshot={setPreviewImage}
              onPlayVideo={setPlayingVideo}
              onDelete={onDeleteEvent}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <SnapshotModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      <VideoPlayerModal
        videoUrl={playingVideo}
        onClose={() => setPlayingVideo(null)}
      />
    </div>
  )
}
