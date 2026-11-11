import { useState, useRef, useEffect } from 'react'
import { ShieldCheck, Moon, BellOff, ChevronDown, Check } from 'lucide-react'
import type { ArmingMode } from '../../types'

interface ArmingSelectorProps {
  mode: ArmingMode
  onChange: (mode: ArmingMode) => void
  variant?: 'dropdown' | 'segmented'
  compact?: boolean
}

const MODES: Array<{
  id: ArmingMode
  label: string
  shortLabel: string
  icon: typeof ShieldCheck
  activeColor: string
  badgeColor: string
  desc: string
}> = [
  {
    id: 'always',
    label: '24 Jam Penuh',
    shortLabel: '24 Jam',
    icon: ShieldCheck,
    activeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-600/40',
    badgeColor: 'bg-emerald-500',
    desc: 'Alarm & AI deteksi selalu menyala',
  },
  {
    id: 'night_only',
    label: 'Malam Saja',
    shortLabel: 'Malam',
    icon: Moon,
    activeColor: 'text-amber-400 bg-amber-950/60 border-amber-600/40',
    badgeColor: 'bg-amber-500',
    desc: 'Hanya aktif 21:00 - 05:00 WIB',
  },
  {
    id: 'disarmed',
    label: 'Mode Senyap',
    shortLabel: 'Senyap',
    icon: BellOff,
    activeColor: 'text-rose-400 bg-rose-950/60 border-rose-600/40',
    badgeColor: 'bg-rose-500',
    desc: 'Alarm dinonaktifkan sementara',
  },
]

export function ArmingSelector({
  mode,
  onChange,
  variant = 'dropdown',
  compact = false,
}: ArmingSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentMode = MODES.find((m) => m.id === mode) || MODES[0]
  const CurrentIcon = currentMode.icon

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Dropdown variant (compact & neat for topbar)
  if (variant === 'dropdown') {
    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${currentMode.activeColor} hover:brightness-110 shadow-sm`}
        >
          <span className={`h-2 w-2 rounded-full ${currentMode.badgeColor} animate-pulse`} />
          <CurrentIcon className="h-3.5 w-3.5" />
          <span className="font-semibold">{currentMode.shortLabel}</span>
          <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Mode Proteksi AI
            </div>
            <div className="space-y-1">
              {MODES.map((opt) => {
                const Icon = opt.icon
                const isSelected = mode === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id)
                      setIsOpen(false)
                    }}
                    className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-slate-800 text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{opt.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Segmented variant (for mobile nav or compact bar)
  return (
    <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/80 p-0.5">
      {MODES.map((opt) => {
        const Icon = opt.icon
        const isSelected = mode === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            title={opt.desc}
            className={`flex items-center gap-1.5 rounded-lg font-medium transition-all ${
              compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
            } ${
              isSelected
                ? `${opt.activeColor} font-bold shadow-xs`
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            <span>{opt.shortLabel}</span>
          </button>
        )
      })}
    </div>
  )
}
