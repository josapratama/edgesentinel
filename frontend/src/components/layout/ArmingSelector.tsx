import { ShieldAlert, Moon, BellOff } from 'lucide-react'
import type { ArmingMode } from '../../types'

interface ArmingSelectorProps {
  mode: ArmingMode
  onChange: (mode: ArmingMode) => void
  compact?: boolean
}

export function ArmingSelector({ mode, onChange, compact = false }: ArmingSelectorProps) {
  const options: Array<{ id: ArmingMode; label: string; icon: typeof ShieldAlert; color: string; desc: string }> = [
    {
      id: 'always',
      label: '24 Jam',
      icon: ShieldAlert,
      color: 'bg-emerald-600 text-white shadow-emerald-900/40',
      desc: 'Alarm selalu menyala',
    },
    {
      id: 'night_only',
      label: 'Malam',
      icon: Moon,
      color: 'bg-amber-600 text-white shadow-amber-900/40',
      desc: 'Malam saja (21:00-05:00 WIB)',
    },
    {
      id: 'disarmed',
      label: 'Senyap',
      icon: BellOff,
      color: 'bg-rose-600 text-white shadow-rose-900/40',
      desc: 'Alarm dinonaktifkan',
    },
  ]

  return (
    <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/80 p-1 shadow-inner">
      {options.map((opt) => {
        const Icon = opt.icon
        const isSelected = mode === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            title={opt.desc}
            className={`flex items-center gap-1.5 rounded-lg font-semibold transition-all ${
              compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
            } ${
              isSelected
                ? `${opt.color} shadow-sm font-bold scale-[1.02]`
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
