import { useState, useRef } from 'react'
import { Maximize2, Shield, ShieldOff, Settings, AlertTriangle, Lock, KeyRound, MapPin, Gauge, Mic } from 'lucide-react'
import type { Camera } from '../../types'
import { Badge } from '../ui/Badge'
import { api } from '../../lib/api'

interface CameraCardProps {
  camera: Camera
  onEdit: (camera: Camera) => void
  onToggleDetection: (camera: Camera) => void
}

export function CameraCard({ camera, onEdit, onToggleDetection }: CameraCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const streamSrc = `/api/streams/${camera.id}/live?t=${camera.updated_at}`
  const connStatus = camera.connection_status || (camera.is_active ? 'online' : 'offline')
  const isEncrypted = connStatus === 'encrypted_error'
  const isAuthError = connStatus === 'auth_error'
  const isDemo = connStatus === 'fallback_demo' || camera.stream_url.startsWith('demo://')

  const handleStartIntercom = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      audioChunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        if (audioBlob.size > 100) {
          setVoiceFeedback('Menyiarkan...')
          try {
            await api.broadcastIntercom(audioBlob)
            setVoiceFeedback('Suara tersiar! 🔊')
            setTimeout(() => setVoiceFeedback(null), 3000)
          } catch {
            setVoiceFeedback('Gagal mengirim suara')
            setTimeout(() => setVoiceFeedback(null), 3000)
          }
        }
      }

      mr.start()
      setIsRecordingVoice(true)
    } catch {
      alert('Izin mikrofon diperlukan untuk fitur Push-to-Talk Intercom.')
    }
  }

  const handleStopIntercom = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop()
      setIsRecordingVoice(false)
    }
  }

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-slate-900/90 shadow-2xl transition-all duration-300 ${
        isEncrypted
          ? 'border-purple-600/70 hover:border-purple-400'
          : isAuthError
          ? 'border-rose-600/70 hover:border-rose-400'
          : 'border-slate-800/90 hover:border-cyan-500/50'
      } ${
        isFullscreen
          ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl border-cyan-500'
          : 'h-[340px] sm:h-[360px]'
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
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
              <AlertTriangle className="h-6 w-6 text-amber-500/80" />
            </div>
            <p className="text-xs font-semibold text-slate-300">Kamera Sedang Offline / Tidak Terhubung</p>
            <p className="text-[10px] text-slate-500 font-mono max-w-[260px] truncate">
              {camera.stream_url}
            </p>
          </div>
        )}

        {/* Diagnostic Banner if stream has encryption or auth error */}
        {isEncrypted && (
          <div className="absolute inset-x-0 bottom-0 bg-purple-950/95 border-t border-purple-500/50 p-2.5 backdrop-blur-md z-20 flex items-start gap-2">
            <Lock className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-purple-200 leading-tight">
              <span className="font-semibold text-purple-300">Enkripsi Stream Terdeteksi (Hikvision):</span> Matikan <i>Stream Encryption</i> di menu Hikvision Guarding Vision / Platform Access agar feed dapat dibuka.
            </div>
          </div>
        )}

        {isAuthError && (
          <div className="absolute inset-x-0 bottom-0 bg-rose-950/95 border-t border-rose-500/50 p-2.5 backdrop-blur-md z-20 flex items-start gap-2">
            <KeyRound className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-rose-200 leading-tight">
              <span className="font-semibold text-rose-300">Autentikasi Gagal (401):</span> Pastikan username & password RTSP DVR sudah sesuai di pengaturan saluran kamera.
            </div>
          </div>
        )}

        {/* Top Left Status & Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-20">
          {!camera.is_active ? (
            <Badge variant="slate" dot>OFFLINE</Badge>
          ) : isEncrypted ? (
            <Badge variant="purple" dot pulse>ENKRIPSI AKTIF</Badge>
          ) : isAuthError ? (
            <Badge variant="rose" dot pulse>AUTH ERROR</Badge>
          ) : isDemo ? (
            <Badge variant="cyan" dot pulse>DEMO AI</Badge>
          ) : (
            <Badge variant="emerald" dot pulse>LIVE RTSP</Badge>
          )}

          {camera.detection_enabled && (
            <Badge variant="cyan">
              <Shield className="h-3 w-3 inline mr-1" />
              AI DETECT
            </Badge>
          )}

          {camera.roi_polygon_json && (
            <Badge variant="amber">
              ZONA ROI
            </Badge>
          )}
        </div>

        {/* Top Right Quick Actions */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 transition-opacity z-20">
          <button
            onClick={() => onToggleDetection(camera)}
            title={camera.detection_enabled ? 'Matikan Deteksi AI' : 'Aktifkan Deteksi AI'}
            className={`flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-md transition-colors ${
              camera.detection_enabled
                ? 'bg-cyan-600/90 text-white shadow-md hover:bg-cyan-500'
                : 'bg-black/60 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {camera.detection_enabled ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Perbesar Tampilan"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/60 text-slate-300 backdrop-blur-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(camera)}
            title="Pengaturan Kamera"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/60 text-slate-300 backdrop-blur-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Camera Footer Information Bar */}
      <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/90 px-4 py-3">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-white truncate max-w-[200px]">
            {camera.name}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5 text-cyan-400" />
              {camera.location}
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-0.5 font-mono">
              <Gauge className="h-2.5 w-2.5 text-slate-400" />
              {camera.resolution || `${camera.fps_limit} FPS`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Push-to-Talk Intercom Button */}
          <button
            type="button"
            onMouseDown={handleStartIntercom}
            onMouseUp={handleStopIntercom}
            onTouchStart={handleStartIntercom}
            onTouchEnd={handleStopIntercom}
            title="Tahan tombol untuk bicara ke speaker rumah"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
              isRecordingVoice
                ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-950/80 scale-105'
                : 'border border-slate-700/80 bg-slate-900/80 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span className="text-[11px]">{isRecordingVoice ? 'Merekam...' : voiceFeedback || 'Bicara'}</span>
          </button>

          <button
            onClick={() => onEdit(camera)}
            className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-xs"
          >
            Konfigurasi
          </button>
        </div>
      </div>
    </div>
  )
}

