import { useState, useEffect } from 'react'
import { X, Video, Search, PenTool } from 'lucide-react'
import type { Camera } from '../../../types'
import { CameraFormTab } from './CameraFormTab'
import { CameraTripwireTab } from './CameraTripwireTab'
import { CameraScannerTab } from './CameraScannerTab'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Camera>) => Promise<void>
  initialData?: Camera | null
}

export function CameraModal({ isOpen, onClose, onSave, initialData }: CameraModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'tripwire' | 'scanner'>('form')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [fpsLimit, setFpsLimit] = useState(5.0)
  const [detectionEnabled, setDetectionEnabled] = useState(true)
  const [roiPolygonJson, setRoiPolygonJson] = useState('')
  const [drawnPoints, setDrawnPoints] = useState<Array<[number, number]>>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setLocation(initialData.location)
      setStreamUrl(initialData.stream_url)
      setFpsLimit(initialData.fps_limit)
      setDetectionEnabled(initialData.detection_enabled)
      setRoiPolygonJson(initialData.roi_polygon_json || '')
      try {
        if (initialData.roi_polygon_json) {
          setDrawnPoints(JSON.parse(initialData.roi_polygon_json))
        } else {
          setDrawnPoints([])
        }
      } catch {
        setDrawnPoints([])
      }
    } else {
      setName('')
      setLocation('Gerbang Depan')
      setStreamUrl('demo://front_camera')
      setFpsLimit(5.0)
      setDetectionEnabled(true)
      setRoiPolygonJson('')
      setDrawnPoints([])
    }
    setActiveTab('form')
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleApplyDiscovered = (ip: string, channelNum: number, isSubStream: boolean) => {
    const streamChannel = isSubStream ? `${channelNum}02` : `${channelNum}01`
    const generatedUrl = `rtsp://admin:Admin123@${ip}:554/Streaming/Channels/${streamChannel}`

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {initialData ? 'Konfigurasi Saluran Kamera' : 'Tambah Kamera Baru'}
              </h3>
              <p className="text-[11px] text-slate-400">RTSP Stream, Vision AI & Zona Proteksi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 my-4 bg-slate-950/90 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'form'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Form Saluran
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tripwire')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'tripwire'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="h-3 w-3" />
            <span>Gambar Zona ROI</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'scanner'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="h-3 w-3" />
            <span>Scan LAN</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'form' && (
          <CameraFormTab
            name={name}
            setName={setName}
            location={location}
            setLocation={setLocation}
            streamUrl={streamUrl}
            setStreamUrl={setStreamUrl}
            fpsLimit={fpsLimit}
            setFpsLimit={setFpsLimit}
            detectionEnabled={detectionEnabled}
            setDetectionEnabled={setDetectionEnabled}
            roiPolygonJson={roiPolygonJson}
            setRoiPolygonJson={setRoiPolygonJson}
            onOpenScanner={() => setActiveTab('scanner')}
            onOpenTripwire={() => setActiveTab('tripwire')}
            onSubmit={handleSubmit}
            onClose={onClose}
            saving={saving}
          />
        )}

        {activeTab === 'tripwire' && (
          <CameraTripwireTab
            initialData={initialData}
            drawnPoints={drawnPoints}
            setDrawnPoints={setDrawnPoints}
            setRoiPolygonJson={setRoiPolygonJson}
            onDone={() => setActiveTab('form')}
          />
        )}

        {activeTab === 'scanner' && (
          <CameraScannerTab onApplyDiscovered={handleApplyDiscovered} />
        )}
      </div>
    </div>
  )
}

