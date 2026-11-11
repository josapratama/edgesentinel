import { useState } from 'react'
import { Grid2X2, Square, LayoutGrid, Radio, Cpu, HardDrive, RefreshCw, Siren } from 'lucide-react'
import type { Camera, SystemStats } from '../../types'
import { formatUptime } from '../../lib/utils'
import { api } from '../../lib/api'
import { CameraCard } from './CameraCard'

interface CameraGridProps {
  cameras: Camera[]
  onEditCamera: (camera: Camera) => void
  onToggleDetection: (camera: Camera) => void
  stats?: SystemStats | null
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function CameraGrid({
  cameras,
  onEditCamera,
  onToggleDetection,
  stats,
  onRefresh,
  isRefreshing,
}: CameraGridProps) {
  const [columns, setColumns] = useState<1 | 2 | 3>(2)
  const [sirenPlaying, setSirenPlaying] = useState(false)

  const activeCount = cameras.filter((c) => c.is_active).length

  const handleToggleSiren = async () => {
    if (sirenPlaying) {
      await api.stopSiren()
      setSirenPlaying(false)
    } else {
      if (window.confirm('Bunyikan sirine darurat di speaker rumah selama 10 detik untuk menakuti penyusup?')) {
        await api.triggerSiren(10)
        setSirenPlaying(true)
        setTimeout(() => setSirenPlaying(false), 10000)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Grid Controller Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 backdrop-blur-md">
        {/* Left: Active Camera pill & System Performance */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span>{activeCount} Kamera Aktif</span>
          </div>

          {stats && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
                <Cpu className="h-3 w-3 text-cyan-400" />
                <span className="text-slate-400">CPU</span>
                <span className="font-bold text-slate-200">{stats.cpu_percent.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
                <HardDrive className="h-3 w-3 text-purple-400" />
                <span className="text-slate-400">RAM</span>
                <span className="font-bold text-slate-200">{stats.memory_percent.toFixed(0)}%</span>
              </div>
              <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 font-mono pl-1">
                <span>Up: {formatUptime(stats.uptime_seconds)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Refresh & Column layout switcher */}
        <div className="flex items-center gap-2">
          {/* Physical Siren Trigger Button */}
          <button
            onClick={handleToggleSiren}
            title={sirenPlaying ? 'Hentikan Sirine Fisik' : 'Bunyikan Sirine Fisik di Rumah'}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition-all ${
              sirenPlaying
                ? 'border-rose-500 bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-950/60'
                : 'border-slate-800 bg-slate-950/80 text-rose-400 hover:border-rose-700/60 hover:bg-rose-950/40'
            }`}
          >
            <Siren className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{sirenPlaying ? 'Stop Sirine' : 'Sirine Speaker'}</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Segarkan data kamera"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/80 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}

          <div className="hidden sm:block h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 hidden md:inline">Layout:</span>
            <div className="flex rounded-xl border border-slate-800 bg-slate-950/80 p-0.5">
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
