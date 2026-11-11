import { useState, useEffect } from 'react'
import { X, Bell } from 'lucide-react'
import type { AlertRule } from '../../types'

interface RuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<AlertRule>) => Promise<void>
  initialData?: AlertRule | null
}

export function RuleModal({ isOpen, onClose, onSave, initialData }: RuleModalProps) {
  const [name, setName] = useState('')
  const [objectClasses, setObjectClasses] = useState('person,car,package')
  const [minConfidence, setMinConfidence] = useState(0.5)
  const [startHour, setStartHour] = useState(0)
  const [endHour, setEndHour] = useState(23)
  const [whatsappNumber, setWhatsappNumber] = useState('6281234567890')
  const [cooldownSeconds, setCooldownSeconds] = useState(60)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setObjectClasses(initialData.object_classes)
      setMinConfidence(initialData.min_confidence)
      setStartHour(initialData.start_hour)
      setEndHour(initialData.end_hour)
      setWhatsappNumber(initialData.whatsapp_number)
      setCooldownSeconds(initialData.cooldown_seconds)
    } else {
      setName('Peringatan Orang Malam Hari')
      setObjectClasses('person')
      setMinConfidence(0.5)
      setStartHour(21)
      setEndHour(5)
      setWhatsappNumber('6281234567890')
      setCooldownSeconds(60)
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        object_classes: objectClasses.trim(),
        min_confidence: Number(minConfidence),
        start_hour: Number(startHour),
        end_hour: Number(endHour),
        whatsapp_number: whatsappNumber.trim(),
        cooldown_seconds: Number(cooldownSeconds),
        is_active: true,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {initialData ? 'Edit Peraturan WhatsApp' : 'Tambah Peraturan Alert'}
              </h3>
              <p className="text-[11px] text-slate-400">Pemberitahuan otomatis ke WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nama Peraturan *
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Orang Masuk Halaman Malam"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nomor WhatsApp Penerima (Awalan 62) *
            </label>
            <input
              required
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Contoh: 6281234567890"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Objek Sasaran Deteksi
            </label>
            <input
              type="text"
              value={objectClasses}
              onChange={(e) => setObjectClasses(e.target.value)}
              placeholder="person,car,package,motorcycle"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Pisahkan dengan koma: person, car, motorcycle, package</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Mulai (WIB)</label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Berakhir (WIB)</label>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:59</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cooldown Anti-Spam (Detik)
            </label>
            <input
              type="number"
              min={10}
              max={600}
              value={cooldownSeconds}
              onChange={(e) => setCooldownSeconds(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-950/40 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Peraturan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

