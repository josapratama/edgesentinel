import { Shield, Eye, Bell, Video, Cpu, HardDrive, RefreshCw, Volume2, VolumeX, Plus } from 'lucide-react'
import type { SystemStats, ArmingMode } from '../../types'
import { formatUptime } from '../../lib/utils'
import { ArmingSelector } from './ArmingSelector'
import { StatPill } from '../ui/StatPill'

interface HeaderProps {
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

export function Header({
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
}: HeaderProps) {
  const tabs = [
    { id: 'grid', label: 'Live CCTV', icon: Eye },
    { id: 'events', label: 'Kejadian AI', icon: Shield },
    { id: 'rules', label: 'Aturan WA', icon: Bell },
    { id: 'cameras', label: 'Kamera', icon: Video },
  ] as const

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-950/50">
            <Shield className="h-5 w-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">
                EdgeSentinel
              </span>
              <span className="rounded-full border border-cyan-800/60 bg-cyan-950/80 px-2 py-0.5 text-[9px] font-bold text-cyan-300 uppercase tracking-wider">
                AI Vision Hub
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Raspberry Pi Vision NVR & WhatsApp Security
            </p>
          </div>
        </div>

        {/* System Telemetry (Desktop only) */}
        {stats && (
          <div className="hidden xl:flex items-center gap-2">
            <StatPill icon={<Cpu className="h-3.5 w-3.5" />} label="CPU" value={`${stats.cpu_percent.toFixed(0)}%`} />
            <StatPill icon={<HardDrive className="h-3.5 w-3.5" />} label="RAM" value={`${stats.memory_percent.toFixed(0)}%`} />
            <StatPill
              icon={<span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
              label="Live"
              value={`${stats.active_cameras} Cams`}
            />
            <div className="text-[11px] text-slate-500 font-mono px-1">
              Up: {formatUptime(stats.uptime_seconds)}
            </div>
          </div>
        )}

        {/* Center / Navigation Tabs (Desktop/Tablet) */}
        <nav className="hidden md:flex items-center rounded-2xl border border-slate-800/90 bg-slate-900/90 p-1 shadow-inner">
          {tabs.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => onSelectTab(t.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2">
          {/* Arming Mode Switcher */}
          <div className="hidden sm:block">
            <ArmingSelector mode={armingMode} onChange={onChangeArmingMode} />
          </div>

          {/* Siren Sound Toggle */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              title={soundAlarm ? 'Suara Sirine Web: Aktif' : 'Suara Sirine Web: Bisu'}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                soundAlarm
                  ? 'border-amber-500/60 bg-amber-950/60 text-amber-300 shadow-md shadow-amber-950/30'
                  : 'border-slate-800 bg-slate-900/80 text-slate-500 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              {soundAlarm ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          )}

          {/* Refresh Data */}
          <button
            onClick={onRefresh}
            title="Muat ulang data"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Add Camera Button */}
          <button
            onClick={onAddCamera}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-950/40 hover:from-cyan-500 hover:to-blue-500 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah Kamera</span>
          </button>
        </div>
      </div>
    </header>
  )
}
