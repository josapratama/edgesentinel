import { useState, useMemo } from 'react'
import { Filter, Search, FileSpreadsheet } from 'lucide-react'
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
  const [searchQuery, setSearchQuery] = useState<string>('')
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchClass = e.object_class.toLowerCase().includes(q)
      const matchCam = (e.camera_name || cameras.find((c) => c.id === e.camera_id)?.name || '').toLowerCase().includes(q)
      const matchPlate = (e.license_plate || '').toLowerCase().includes(q)
      const matchFace = (e.familiar_face || '').toLowerCase().includes(q)
      if (!matchClass && !matchCam && !matchPlate && !matchFace) return false
    }
    return true
  })

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return

    const headers = ['Event ID', 'Waktu', 'Kamera', 'Objek', 'Confidence (%)', 'Plat Nomor', 'Wajah / Persona', 'Snapshot File']
    const rows = filteredEvents.map((evt) => {
      const camName = evt.camera_name || cameras.find((c) => c.id === evt.camera_id)?.name || evt.camera_id
      const conf = evt.confidence ? `${(evt.confidence * 100).toFixed(1)}%` : 'N/A'
      const time = new Date(evt.created_at).toLocaleString('id-ID')
      const plate = evt.license_plate || '-'
      const face = evt.familiar_face ? `${evt.familiar_face} (Known)` : evt.is_stranger ? 'Stranger (Asing)' : '-'
      return [
        `"${evt.id}"`,
        `"${time}"`,
        `"${camName}"`,
        `"${evt.object_class}"`,
        `"${conf}"`,
        `"${plate}"`,
        `"${face}"`,
        `"${evt.snapshot_filename || ''}"`
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10)
    link.href = url
    link.setAttribute('download', `edgesentinel-events-${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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
        <div className="flex flex-wrap items-center gap-3 text-xs w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span>Filter:</span>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari objek / plat / kamera..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-8 pr-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
            />
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

        <div className="flex items-center gap-3 text-xs w-full lg:w-auto justify-between lg:justify-end">
          <div className="text-slate-400 font-semibold">
            Menampilkan <strong className="text-white font-bold">{filteredEvents.length}</strong> kejadian
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 font-bold text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Download CSV Audit Log"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
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

