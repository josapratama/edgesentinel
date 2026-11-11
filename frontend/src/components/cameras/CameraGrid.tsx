import { useState } from 'react'
import { Grid2X2, Square, LayoutGrid, Radio } from 'lucide-react'
import type { Camera } from '../../types'
import { CameraCard } from './CameraCard'

interface CameraGridProps {
  cameras: Camera[]
  onEditCamera: (camera: Camera) => void
  onToggleDetection: (camera: Camera) => void
}

export function CameraGrid({
  cameras,
  onEditCamera,
  onToggleDetection,
}: CameraGridProps) {
  const [columns, setColumns] = useState<1 | 2 | 3>(2)

  const activeCount = cameras.filter((c) => c.is_active).length

  return (
    <div className="space-y-4">
      {/* Grid Controller Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span>{activeCount} Kamera Aktif</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Memantau feed live secara real-time
          </span>
        </div>

        {/* Column layout switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden md:inline">Layout:</span>
          <div className="flex rounded-xl border border-slate-800 bg-slate-950/80 p-1">
            <button
              onClick={() => setColumns(1)}
              title="1 Kolom (Besar)"
              className={`rounded-lg p-1.5 transition-colors ${
                columns === 1 ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Square className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setColumns(2)}
              title="2 Kolom (Standar)"
              className={`rounded-lg p-1.5 transition-colors ${
                columns === 2 ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid2X2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setColumns(3)}
              title="3 Kolom (Multi-view)"
              className={`rounded-lg p-1.5 transition-colors ${
                columns === 3 ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 py-16 text-center bg-slate-900/30">
          <p className="text-sm font-semibold text-slate-300">Belum Ada Saluran Kamera Terdaftar</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Klik tombol "+ Tambah Kamera" di atas untuk menambahkan RTSP kamera CCTV Anda atau gunakan simulator demo.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 sm:gap-6 ${
            columns === 1
              ? 'grid-cols-1'
              : columns === 2
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          }`}
        >
          {cameras.map((camera) => (
            <CameraCard
              key={camera.id}
              camera={camera}
              onEdit={onEditCamera}
              onToggleDetection={onToggleDetection}
            />
          ))}
        </div>
      )}
    </div>
  )
}
