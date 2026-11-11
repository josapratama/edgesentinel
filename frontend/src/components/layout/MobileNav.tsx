import { Eye, Shield, Bell, Video } from 'lucide-react'
import type { ArmingMode } from '../../types'
import { ArmingSelector } from './ArmingSelector'

interface MobileNavProps {
  activeTab: 'grid' | 'events' | 'rules' | 'cameras'
  onSelectTab: (tab: 'grid' | 'events' | 'rules' | 'cameras') => void
  armingMode: ArmingMode
  onChangeArmingMode: (mode: ArmingMode) => void
}

export function MobileNav({
  activeTab,
  onSelectTab,
  armingMode,
  onChangeArmingMode,
}: MobileNavProps) {
  const tabs = [
    { id: 'grid', label: 'Live CCTV', icon: Eye },
    { id: 'events', label: 'Kejadian', icon: Shield },
    { id: 'rules', label: 'Aturan WA', icon: Bell },
    { id: 'cameras', label: 'Kamera', icon: Video },
  ] as const

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl md:hidden px-3 py-2 flex flex-col gap-2">
      {/* Mobile Arming Mode selector */}
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-[10px] font-semibold text-slate-400">Proteksi Keamanan:</span>
        <ArmingSelector mode={armingMode} onChange={onChangeArmingMode} compact />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-around">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onSelectTab(t.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                  isActive ? 'bg-cyan-950/80 border border-cyan-700/60 shadow-sm' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[10px]">{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

