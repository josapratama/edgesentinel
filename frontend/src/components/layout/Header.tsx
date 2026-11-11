import { Shield, Eye, Bell, Video, Volume2, VolumeX, Plus } from 'lucide-react'
import type { ArmingMode } from '../../types'
import { ArmingSelector } from './ArmingSelector'

interface HeaderProps {
  activeTab: 'grid' | 'events' | 'rules' | 'cameras'
  onSelectTab: (tab: 'grid' | 'events' | 'rules' | 'cameras') => void
  onAddCamera: () => void
  armingMode: ArmingMode
  onChangeArmingMode: (mode: ArmingMode) => void
  soundAlarm?: boolean
  onToggleSound?: () => void
}

export function Header({
  activeTab,
  onSelectTab,
  onAddCamera,
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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-md shadow-cyan-950/40">
            <Shield className="h-5 w-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight text-white">
              EdgeSentinel
            </span>
            <span className="rounded-md border border-cyan-800/50 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wide">
              AI NVR
            </span>
          </div>
        </div>

        {/* Center Navigation Tabs (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center rounded-xl border border-slate-800/80 bg-slate-900/70 p-1 shadow-inner">
          {tabs.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => onSelectTab(t.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
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
          {/* Arming Mode Dropdown */}
          <ArmingSelector mode={armingMode} onChange={onChangeArmingMode} variant="dropdown" />

          {/* Siren Sound Alarm Toggle */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              title={soundAlarm ? 'Suara Sirine Web: Aktif' : 'Suara Sirine Web: Bisu'}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
                soundAlarm
                  ? 'border-amber-500/60 bg-amber-950/60 text-amber-300 shadow-md shadow-amber-950/30'
                  : 'border-slate-800 bg-slate-900/80 text-slate-500 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              {soundAlarm ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          )}

          {/* Add Camera Button */}
          <button
            onClick={onAddCamera}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-950/40 hover:from-cyan-500 hover:to-blue-500 transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tambah Kamera</span>
          </button>
        </div>
      </div>
    </header>
  )
}
