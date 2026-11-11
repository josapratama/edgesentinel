import { Shield, Eye, Bell, Video, Cpu, HardDrive, RefreshCw, Moon, BellOff, ShieldAlert, Volume2, VolumeX } from 'lucide-react'
import type { SystemStats, ArmingMode } from '../types'
import { formatUptime } from '../lib/utils'

interface NavbarProps {
  stats: SystemStats | null
  activeTab: 'grid' | 'events' | 'rules' | 'cameras'
  onSelectTab: (tab: 'grid' | 'events' | 'rules' | 'cameras') => void
  onAddCamera: () => void
  onRefresh: () => void
  isRefreshing?: boolean
  armingMode: ArmingMode
  onChangeArmingMode: (mode: ArmingMode) => void
  soundAlarm?: boolean
  onToggleSound?: () => void
}

export function Navbar({
  stats,
  activeTab,
  onSelectTab,
  onAddCamera,
  onRefresh,
  isRefreshing,
  armingMode,
  onChangeArmingMode,
  soundAlarm,
  onToggleSound,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-900/30">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">
                EdgeSentinel
              </span>
              <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-800/60">
                AI NVR v1.2
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Raspberry Pi Vision Hub & WhatsApp Security
            </p>
          </div>
        </div>

        {/* System telemetry pills & Arming Mode */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          {/* Arming Mode Selector Pill */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            <button
              onClick={() => onChangeArmingMode('always')}
              title="Aktif 24 Jam: Notifikasi WhatsApp selalu menyala saat ada objek mencurigakan"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                armingMode === 'always'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="h-3 w-3" />
              <span>24 Jam</span>
            </button>
            <button
              onClick={() => onChangeArmingMode('night_only')}
              title="Hanya Malam (21:00 - 05:00 WIB)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                armingMode === 'night_only'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="h-3 w-3" />
              <span>Malam</span>
            </button>
            <button
              onClick={() => onChangeArmingMode('disarmed')}
              title="Disarmed (Senyap / Tanpa Notifikasi WA)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                armingMode === 'disarmed'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BellOff className="h-3 w-3" />
              <span>Senyap</span>
            </button>
          </div>

          {stats && (
            <>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-slate-300">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                <span>CPU: {stats.cpu_percent.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-slate-300">
                <HardDrive className="h-3.5 w-3.5 text-indigo-400" />
                <span>RAM: {stats.memory_percent.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{stats.active_cameras} Cams</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-slate-400">
                <span>Up: {formatUptime(stats.uptime_seconds)}</span>
              </div>
            </>
          )}
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            <button
              onClick={() => onSelectTab('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live CCTV</span>
            </button>
            <button
              onClick={() => onSelectTab('events')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'events'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Kejadian AI</span>
            </button>
            <button
              onClick={() => onSelectTab('rules')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'rules'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp Alert</span>
            </button>
            <button
              onClick={() => onSelectTab('cameras')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'cameras'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kamera</span>
            </button>
          </div>

          {onToggleSound && (
            <button
              onClick={onToggleSound}
              title={soundAlarm ? 'Suara Sirine Web: Aktif' : 'Suara Sirine Web: Bisu'}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                soundAlarm
                  ? 'border-amber-600/60 bg-amber-950/60 text-amber-400 hover:bg-amber-900/60'
                  : 'border-slate-800 bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {soundAlarm ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          )}

          <button
            onClick={onRefresh}
            title="Muat ulang data"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onAddCamera}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-cyan-500 hover:to-blue-500 transition-all active:scale-95"
          >
            + Kamera Baru
          </button>
        </div>
      </div>
    </header>
  )
}
