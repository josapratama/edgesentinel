import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'purple' | 'slate'
  size?: 'sm' | 'md'
  dot?: boolean
  pulse?: boolean
  className?: string
}

export function Badge({
  children,
  variant = 'slate',
  size = 'sm',
  dot = false,
  pulse = false,
  className = '',
}: BadgeProps) {
  const variantStyles = {
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50',
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-700/50',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-700/50',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-700/50',
    slate: 'bg-slate-900/80 text-slate-300 border-slate-700/50',
  }

  const dotColors = {
    emerald: 'bg-emerald-400',
    cyan: 'bg-cyan-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    purple: 'bg-purple-400',
    slate: 'bg-slate-400',
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold backdrop-blur-md transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]} ${pulse ? 'animate-pulse' : ''}`}
        />
      )}
      <span>{children}</span>
    </span>
  )
}

