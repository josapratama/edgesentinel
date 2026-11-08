import { useState, useEffect } from 'react'
import { X, Video } from 'lucide-react'
import type { Camera } from '../types'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Camera>) => Promise<void>
  initialData?: Camera | null
}

export function CameraModal({ isOpen, onClose, onSave, initialData }: CameraModalProps) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [fpsLimit, setFpsLimit] = useState(5.0)
  const [detectionEnabled, setDetectionEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setLocation(initialData.location)
      setStreamUrl(initialData.stream_url)
      setFpsLimit(initialData.fps_limit)
      setDetectionEnabled(initialData.detection_enabled)
    } else {
      setName('')
      setLocation('Gerbang Depan')
      setStreamUrl('demo://front_camera')
      setFpsLimit(5.0)
      setDetectionEnabled(true)
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        location: location.trim(),
        stream_url: streamUrl.trim(),
        fps_limit: Number(fpsLimit),
        detection_enabled: detectionEnabled,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-cyan-400" />
            {initialData ? 'Edit Saluran Kamera' : 'Tambah Kamera Baru'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
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
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Stream URL (RTSP / HTTP / Demo) *
            </label>
            <input
              required
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="rtsp://admin:pass@192.168.1.100:554/ch1 atau demo://name"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-cyan-300 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Ketik <code className="text-cyan-400">demo://kamera_name</code> untuk menggunakan simulator AI camera jika belum ada IP Cam fisik.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Frame Rate (FPS)
              </label>
              <select
                value={fpsLimit}
                onChange={(e) => setFpsLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value={3.0}>3 FPS (Hemat CPU Pi)</option>
                <option value={5.0}>5 FPS (Rekomendasi Edge)</option>
                <option value={10.0}>10 FPS (Standar CCTV)</option>
                <option value={15.0}>15 FPS (Smooth)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={detectionEnabled}
                  onChange={(e) => setDetectionEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                />
                <span>Deteksi AI Aktif</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Kamera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

