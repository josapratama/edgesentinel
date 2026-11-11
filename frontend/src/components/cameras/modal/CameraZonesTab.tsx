import { useEffect, useRef, useState } from 'react'
import { Undo, RotateCcw, Check, EyeOff } from 'lucide-react'
import type { Camera } from '../../../types'

interface CameraZonesTabProps {
  initialData?: Camera | null
  exclusionZonesJson: string
  setExclusionZonesJson: (json: string) => void
  onDone: () => void
}

export function CameraZonesTab({
  initialData,
  exclusionZonesJson,
  setExclusionZonesJson,
  onDone,
}: CameraZonesTabProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [currentZone, setCurrentZone] = useState<Array<[number, number]>>([])
  const [completedZones, setCompletedZones] = useState<Array<Array<[number, number]>>>(() => {
    try {
      if (exclusionZonesJson) {
        const parsed = JSON.parse(exclusionZonesJson)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If 1D list of points, wrap in array
          if (typeof parsed[0][0] === 'number') {
            return [parsed]
          }
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return []
  })

  // Redraw canvas whenever currentZone or completedZones change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)

    // 1. Draw completed zones
    completedZones.forEach((zone, zIdx) => {
      if (zone.length < 3) return
      ctx.beginPath()
      ctx.moveTo(zone[0][0] * cw, zone[0][1] * ch)
      for (let i = 1; i < zone.length; i++) {
        ctx.lineTo(zone[i][0] * cw, zone[i][1] * ch)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)' // Translucent Red
      ctx.fill()
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.stroke()

      // Center label
      const avgX = zone.reduce((sum, p) => sum + p[0], 0) / zone.length
      const avgY = zone.reduce((sum, p) => sum + p[1], 0) / zone.length
      ctx.fillStyle = '#fca5a5'
      ctx.font = '10px sans-serif'
      ctx.fillText(`Mask ${zIdx + 1}`, avgX * cw - 16, avgY * ch)
    })

    // 2. Draw current active drawing zone
    if (currentZone.length > 0) {
      ctx.beginPath()
      ctx.moveTo(currentZone[0][0] * cw, currentZone[0][1] * ch)
      for (let i = 1; i < currentZone.length; i++) {
        ctx.lineTo(currentZone[i][0] * cw, currentZone[i][1] * ch)
      }
      if (currentZone.length >= 3) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.25)' // Purple
        ctx.fill()
      }
      ctx.strokeStyle = '#c084fc'
      ctx.lineWidth = 2
      ctx.stroke()

      // Handles
      currentZone.forEach(([px, py], index) => {
        ctx.beginPath()
        ctx.arc(px * cw, py * ch, 5, 0, 2 * Math.PI)
        ctx.fillStyle = index === 0 ? '#10b981' : '#c084fc'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
    }
  }, [currentZone, completedZones])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const rawX = e.clientX - rect.left
    const rawY = e.clientY - rect.top

    const normX = Math.max(0, Math.min(1, rawX / rect.width))
    const normY = Math.max(0, Math.min(1, rawY / rect.height))

    setCurrentZone((prev) => [...prev, [Number(normX.toFixed(3)), Number(normY.toFixed(3))]])
  }

  const handleFinishZone = () => {
    if (currentZone.length >= 3) {
      const updated = [...completedZones, currentZone]
      setCompletedZones(updated)
      setCurrentZone([])
      setExclusionZonesJson(JSON.stringify(updated))
    }
  }

  const handleUndo = () => {
    if (currentZone.length > 0) {
      setCurrentZone((prev) => prev.slice(0, -1))
    } else if (completedZones.length > 0) {
      const updated = completedZones.slice(0, -1)
      setCompletedZones(updated)
      setExclusionZonesJson(updated.length > 0 ? JSON.stringify(updated) : '')
    }
  }

  const handleReset = () => {
    setCurrentZone([])
    setCompletedZones([])
    setExclusionZonesJson('')
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
          <EyeOff className="h-3.5 w-3.5 text-rose-400" />
          <span>Area Diabaikan / Masking ({completedZones.length} zona tersimpan)</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={currentZone.length === 0 && completedZones.length === 0}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <Undo className="h-3 w-3" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={currentZone.length === 0 && completedZones.length === 0}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-rose-400 hover:bg-rose-950/40 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Hapus Semua</span>
          </button>
        </div>
      </div>

      {/* Drawing Canvas Area */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-inner">
        {initialData?.id ? (
          <img
            src={`/api/streams/${initialData.id}`}
            alt="Camera Preview"
            className="h-full w-full object-cover opacity-80"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
            Preview frame kamera demo
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          onClick={handleCanvasClick}
          className="absolute inset-0 h-full w-full cursor-crosshair"
        />

        {currentZone.length === 0 && completedZones.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <p className="rounded-xl border border-rose-500/30 bg-slate-900/90 px-3.5 py-2 text-center text-xs text-rose-200 shadow-xl">
              Klik pada layar (minimal 3 titik) untuk menandai area yang diabaikan AI
              <br />
              <span className="text-[10px] text-slate-400">
                (Contoh: pohon bergoyang, jalan umum di luar pagar, jemuran pakaian)
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-1">
        {currentZone.length >= 3 ? (
          <button
            type="button"
            onClick={handleFinishZone}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Selesai Gambar Zona Ini (+ Tambah ke Mask)</span>
          </button>
        ) : (
          <div className="text-[11px] text-slate-400">
            {currentZone.length > 0 ? `Klik ${3 - currentZone.length} titik lagi...` : 'AI akan mengabaikan objek di dalam area merah.'}
          </div>
        )}

        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-cyan-500 transition-colors ml-auto"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Selesai</span>
        </button>
      </div>
    </div>
  )
}

