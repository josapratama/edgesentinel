import { Clock, RotateCcw } from 'lucide-react'

interface EventTimelineProps {
  hourlyCounts: number[]
  selectedHour: number | null
  onSelectHour: (hour: number | null) => void
}

export function EventTimeline({
  hourlyCounts,
  selectedHour,
  onSelectHour,
}: EventTimelineProps) {
  const maxCount = Math.max(1, ...hourlyCounts)

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md space-y-2 shadow-xl">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <Clock className="h-4 w-4 text-cyan-400" />
          <span>Timeline Aktivitas 24 Jam</span>
          {selectedHour !== null && (
            <span className="rounded-md bg-amber-950/80 border border-amber-700/50 px-2 py-0.5 text-[10px] text-amber-300 font-semibold">
              Filter: Pukul {selectedHour.toString().padStart(2, '0')}:00
            </span>
          )}
        </div>
        {selectedHour !== null && (
          <button
            onClick={() => onSelectHour(null)}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline font-semibold"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Tampilkan Semua Jam</span>
          </button>
        )}
      </div>

      {/* 24-Hour Vertical Bars */}
      <div className="grid grid-cols-24 gap-1 items-end h-14 pt-2 border-b border-slate-800/80">
        {hourlyCounts.map((count, hour) => {
          const heightPct = count > 0 ? Math.max(16, (count / maxCount) * 100) : 4
          const isSelected = selectedHour === hour
          return (
            <button
              key={hour}
              type="button"
              onClick={() => onSelectHour(selectedHour === hour ? null : hour)}
              title={`Pukul ${hour.toString().padStart(2, '0')}:00 - ${count} Kejadian Terdeteksi`}
              className={`group relative flex flex-col justify-end w-full h-full rounded-xs transition-all ${
                isSelected
                  ? 'bg-amber-500 ring-2 ring-amber-400 shadow-lg'
                  : count > 0
                  ? 'bg-cyan-600/70 hover:bg-cyan-400'
                  : 'bg-slate-800/40 hover:bg-slate-700/60'
              }`}
            >
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full rounded-xs transition-all ${
                  count > 0 ? (isSelected ? 'bg-amber-300' : 'bg-cyan-400') : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:59</span>
      </div>
    </div>
  )
}
