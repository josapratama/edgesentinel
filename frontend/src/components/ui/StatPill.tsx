import React from 'react'

interface StatPillProps {
  icon: React.ReactNode
  label: string
  value: string | number
  highlight?: boolean
  className?: string
}

export function StatPill({ icon, label, value, highlight = false, className = '' }: StatPillProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs backdrop-blur-md transition-all ${
        highlight
          ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-200'
          : 'border-slate-800/80 bg-slate-900/60 text-slate-300'
      } ${className}`}
    >
      <span className="text-cyan-400">{icon}</span>
      <span className="text-slate-400">{label}:</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  )
}
