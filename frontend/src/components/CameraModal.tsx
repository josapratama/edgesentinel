import { useState, useEffect } from 'react'
import { X, Video, Search, Shield, Loader2 } from 'lucide-react'
import type { Camera, DiscoveredDevice } from '../types'
import { api } from '../lib/api'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Camera>) => Promise<void>
  initialData?: Camera | null
}

const ROI_PRESETS = [
  {
    name: 'Seluruh Layar (Tanpa Batas)',
    value: '',
  },
  {
    name: 'Jalanan / Separuh Bawah (50% - 100%)',
    value: JSON.stringify([[0.05, 0.5], [0.95, 0.5], [0.95, 0.95], [0.05, 0.95]]),
  },
  {
    name: 'Area Tengah / Akses Pintu Gerbang',
    value: JSON.stringify([[0.2, 0.3], [0.8, 0.3], [0.85, 0.9], [0.15, 0.9]]),
  },
  {
    name: 'Koridor Sempit / Jalur Masuk',
    value: JSON.stringify([[0.35, 0.2], [0.65, 0.2], [0.75, 0.95], [0.25, 0.95]]),
  },
]

export function CameraModal({ isOpen, onClose, onSave, initialData }: CameraModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'scanner'>('form')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [fpsLimit, setFpsLimit] = useState(5.0)
  const [detectionEnabled, setDetectionEnabled] = useState(true)
  const [roiPolygonJson, setRoiPolygonJson] = useState('')
  const [saving, setSaving] = useState(false)

  // Scanner state
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<DiscoveredDevice[]>([])
  const [scanMessage, setScanMessage] = useState('')
  const [dvrPassword, setDvrPassword] = useState('Admin123')

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setLocation(initialData.location)
      setStreamUrl(initialData.stream_url)
      setFpsLimit(initialData.fps_limit)
      setDetectionEnabled(initialData.detection_enabled)
      setRoiPolygonJson(initialData.roi_polygon_json || '')
    } else {
      setName('')
      setLocation('Gerbang Depan')
      setStreamUrl('demo://front_camera')
      setFpsLimit(5.0)
      setDetectionEnabled(true)
      setRoiPolygonJson('')
    }
    setActiveTab('form')
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleScanLAN = async () => {
    setScanning(true)
    setScanMessage('Memindai subnet lokal (port 554 RTSP, 8000 Hikvision)...')
    try {
      const res = await api.scanCameras()
      setScanResults(res.devices || [])
      setScanMessage(
        res.devices.length > 0
          ? `Ditemukan ${res.devices.length} perangkat CCTV / DVR di LAN!`
          : 'Tidak ada perangkat RTSP baru ditemukan di subnet ini.'
      )
    } catch {
      setScanMessage('Gagal melakukan scan LAN. Pastikan server memiliki akses jaringan lokal.')
    } finally {
      setScanning(false)
    }
  }

  const handleApplyDiscovered = (ip: string, channelNum: number, isSubStream = true) => {
    const streamChannel = isSubStream ? `${channelNum}02` : `${channelNum}01`
    const pwd = dvrPassword.trim() || 'Admin123'
    const generatedUrl = `rtsp://admin:${pwd}@${ip}:554/Streaming/Channels/${streamChannel}`

    setStreamUrl(generatedUrl)
    if (!name || name.startsWith('Kamera') || name.startsWith('Demo')) {
      setName(`Hikvision DVR Ch ${channelNum} (${isSubStream ? 'Sub' : 'Main'})`)
    }
    setActiveTab('form')
  }

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
        roi_polygon_json: roiPolygonJson.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              {initialData ? 'Edit Saluran Kamera' : 'Tambah Kamera Baru'}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 my-4 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'form' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Form Saluran
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('scanner')
              if (scanResults.length === 0) handleScanLAN()
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'scanner' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Scan LAN CCTV</span>
          </button>
        </div>

        {/* Tab Content: Scanner */}
        {activeTab === 'scanner' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-white">Auto-Discovery CCTV / DVR</p>
                <p className="text-[11px] text-slate-400">
                  {scanMessage || 'Pindai subnet lokal untuk mendeteksi port RTSP 554 & SDK 8000.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanLAN}
                disabled={scanning}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>{scanning ? 'Memindai...' : 'Scan Ulang'}</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Password DVR / RTSP untuk Auto-Fill</label>
              <input
                type="text"
                value={dvrPassword}
                onChange={(e) => setDvrPassword(e.target.value)}
                placeholder="Contoh: Admin123"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300">Hasil Perangkat Ditemukan:</p>
              {scanResults.length === 0 && !scanning && (
                <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  Tidak ada perangkat terdeteksi. Pastikan port 554 terbuka di router/DVR.
                </div>
              )}

              {scanResults.map((dev) => (
                <div key={dev.ip} className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{dev.device_type}</span>
                      <p className="text-[11px] font-mono text-cyan-400">{dev.ip}</p>
                    </div>
                    <span className="rounded-md bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 text-[10px] text-emerald-300 font-semibold">
                      Port 554 Terbuka
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400">Pilih Saluran / Channel untuk Ditambahkan:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {dev.channels.map((ch) => (
                      <div
                        key={ch.channel}
                        className="rounded-lg border border-slate-800 bg-slate-900/90 p-2 flex flex-col justify-between"
                      >
                        <span className="text-[11px] font-semibold text-white">Saluran {ch.channel}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleApplyDiscovered(dev.ip, ch.channel, true)}
                            className="flex-1 rounded bg-cyan-900/60 hover:bg-cyan-800/80 py-1 text-[9px] text-cyan-200 font-medium border border-cyan-700/40"
                          >
                            Sub-Stream (AI)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyDiscovered(dev.ip, ch.channel, false)}
                            className="flex-1 rounded bg-slate-800 hover:bg-slate-700 py-1 text-[9px] text-slate-300 font-medium"
                          >
                            Main-HD
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: Form */}
        {activeTab === 'form' && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-1">
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Stream URL (RTSP / Demo) *
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('scanner')}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-cyan-300 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                💡 Hikvision format: <code className="text-cyan-400">Channels/102</code> (Sub-stream hemat CPU) atau <code className="text-cyan-400">demo://kamera</code>.
              </p>
            </div>

            {/* Virtual Tripwire / ROI Area Preset */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span>Zona Proteksi / Virtual Tripwire (ROI)</span>
              </label>
              <select
                value={roiPolygonJson}
                onChange={(e) => setRoiPolygonJson(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {ROI_PRESETS.map((p) => (
                  <option key={p.name} value={p.value}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                AI hanya akan memicu alarm kejadian & WhatsApp jika objek melintasi zona terpilih.
              </p>
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
        )}
      </div>
    </div>
  )
}
