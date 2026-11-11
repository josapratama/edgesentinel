import { useEffect, useRef } from 'react'
import { Undo, RotateCcw, Check, PenTool } from 'lucide-react'
import type { Camera } from '../../../types'

interface CameraTripwireTabProps {
  initialData?: Camera | null
  drawnPoints: Array<[number, number]>
  setDrawnPoints: (pts: Array<[number, number]>) => void
  setRoiPolygonJson: (json: string) => void
  tripwireDirection: 'both' | 'inbound' | 'outbound'
  setTripwireDirection: (dir: 'both' | 'inbound' | 'outbound') => void
  onDone: () => void
}

export function CameraTripwireTab({
  initialData,
  drawnPoints,
  setDrawnPoints,
  setRoiPolygonJson,
  tripwireDirection,
  setTripwireDirection,
  onDone,
}: CameraTripwireTabProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Redraw canvas whenever points change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)

    if (drawnPoints.length === 0) return

    // Draw connecting lines
    ctx.beginPath()
    const [startX, startY] = drawnPoints[0]
    ctx.moveTo(startX * cw, startY * ch)
    for (let i = 1; i < drawnPoints.length; i++) {
      const [px, py] = drawnPoints[i]
      ctx.lineTo(px * cw, py * ch)
    }

    if (drawnPoints.length >= 3) {
      ctx.closePath()
      ctx.fillStyle = 'rgba(234, 179, 8, 0.25)' // Amber fill
      ctx.fill()
    }

    ctx.strokeStyle = '#eab308'
    ctx.lineWidth = 2.5
    ctx.stroke()

    // Draw handles
    drawnPoints.forEach(([px, py], index) => {
      ctx.beginPath()
      ctx.arc(px * cw, py * ch, 5, 0, 2 * Math.PI)
      ctx.fillStyle = index === 0 ? '#22c55e' : '#f59e0b'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }, [drawnPoints])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const rawX = e.clientX - rect.left
    const rawY = e.clientY - rect.top

    const normX = Math.max(0, Math.min(1, rawX / rect.width))
    const normY = Math.max(0, Math.min(1, rawY / rect.height))

    const newPoints: Array<[number, number]> = [...drawnPoints, [Number(normX.toFixed(3)), Number(normY.toFixed(3))]]
    setDrawnPoints(newPoints)
    setRoiPolygonJson(JSON.stringify(newPoints))
  }

  const handleUndo = () => {
    if (drawnPoints.length === 0) return
    const updated = drawnPoints.slice(0, -1)
    setDrawnPoints(updated)
    setRoiPolygonJson(updated.length >= 3 ? JSON.stringify(updated) : '')
  }

  const handleReset = () => {
    setDrawnPoints([])
    setRoiPolygonJson('')
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
          <PenTool className="h-3.5 w-3.5 text-amber-400" />
          <span>Klik layar untuk menggambar zona ({drawnPoints.length} titik)</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={drawnPoints.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-medium transition-colors"
            title="Batalkan titik terakhir"
          >
            <Undo className="h-3 w-3" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={drawnPoints.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-rose-400 hover:text-rose-300 disabled:opacity-40 text-xs font-medium transition-colors"
            title="Reset semua titik"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Canvas container with camera live backdrop */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-700 select-none shadow-inner">
        {initialData?.is_active ? (
          <img
            src={`/api/streams/${initialData.id}/live`}
            alt="Live preview"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-85"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs">
            Pratinjau Layar Kamera
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={480}
          height={270}
          onClick={handleCanvasClick}
          className="absolute inset-0 w-full h-full cursor-crosshair z-10"
        />
      </div>

      {/* Directional Tripwire Selector */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-xs">
        <span className="font-semibold text-slate-300">Arah Deteksi Alarm:</span>
        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
          <button
            type="button"
            onClick={() => setTripwireDirection('both')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              tripwireDirection === 'both'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua Arah ↔️
          </button>
          <button
            type="button"
            onClick={() => setTripwireDirection('inbound')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              tripwireDirection === 'inbound'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Masuk Saja ➡️
          </button>
          <button
            type="button"
            onClick={() => setTripwireDirection('outbound')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              tripwireDirection === 'outbound'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Keluar Saja ⬅️
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        💡 <b>Panduan:</b> Klik 3–5 titik di sekeliling area pagar atau lantai garasi. Pilih "Masuk Saja" jika hanya ingin alarm berbunyi saat ada orang menyeberang ke dalam halaman rumah.
      </p>

      <button
        type="button"
        onClick={onDone}
        className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-950/40"
      >
        <Check className="h-4 w-4" />
        <span>Terapkan Batas Zona Ini</span>
      </button>
    </div>
  )
}

