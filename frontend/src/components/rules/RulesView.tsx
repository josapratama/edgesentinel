import { Plus, Bell, Clock, Phone, Trash2, Edit2, ShieldAlert } from 'lucide-react'
import type { AlertRule } from '../../types'

interface RulesViewProps {
  rules: AlertRule[]
  onAddRule: () => void
  onEditRule: (rule: AlertRule) => void
  onDeleteRule: (id: string) => void
  onToggleActive: (rule: AlertRule) => void
}

export function RulesView({
  rules,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onToggleActive,
}: RulesViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-cyan-400" />
            <span>Peraturan Notifikasi WhatsApp (WABridge)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasikan kapan dan ke nomor mana Edge AI harus mengirimkan peringatan otomatis.
          </p>
        </div>

        <button
          onClick={onAddRule}
          className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-950/40 hover:from-cyan-500 hover:to-blue-500 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Peraturan Alert</span>
        </button>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 py-16 text-center bg-slate-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 mb-3">
            <ShieldAlert className="h-6 w-6 text-slate-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">Belum Ada Peraturan Alert</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
            Buat peraturan agar sistem langsung memberitahu Anda lewat WhatsApp saat ada pergerakan orang atau kendaraan yang mencurigakan.
          </p>
          <button
            onClick={onAddRule}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            + Buat Peraturan Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-xl transition-all hover:border-slate-700"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div>
                    <h3 className="font-bold text-sm text-white">{rule.name}</h3>
                    <span className="inline-block mt-1 rounded-lg bg-cyan-950/80 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800/60">
                      Objek: {rule.object_classes.toUpperCase()}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={() => onToggleActive(rule)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 shadow-inner"></div>
                  </label>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>WhatsApp: <strong className="text-slate-100">{rule.whatsapp_number}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>
                      Jam Aktif: {String(rule.start_hour).padStart(2, '0')}:00 s/d{' '}
                      {String(rule.end_hour).padStart(2, '0')}:59 WIB
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Akurasi: {Math.round(rule.min_confidence * 100)}% • Cooldown: {rule.cooldown_seconds}s
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-800/70 pt-3 mt-4">
                <button
                  onClick={() => onEditRule(rule)}
                  className="rounded-xl border border-slate-700/80 bg-slate-800/80 p-2 text-slate-300 hover:text-white transition-colors"
                  title="Edit aturan"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteRule(rule.id)}
                  className="rounded-xl border border-rose-900/40 bg-rose-950/40 p-2 text-rose-400 hover:bg-rose-900/60 hover:text-white transition-colors"
                  title="Hapus aturan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

