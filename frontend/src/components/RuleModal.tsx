import { useState, useEffect } from 'react'
import { X, Bell, Phone } from 'lucide-react'
import type { AlertRule, Camera } from '../types'

interface RuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<AlertRule>) => Promise<void>
  initialData?: AlertRule | null
  cameras: Camera[]
}

const OBJECT_OPTIONS = [
  { id: 'person', label: 'Orang (Person)' },
  { id: 'car', label: 'Mobil (Car)' },
  { id: 'motorcycle', label: 'Motor (Motorcycle)' },
  { id: 'package', label: 'Paket / Kurir (Package)' },
  { id: 'dog', label: 'Hewan (Animal)' },
]

export function RuleModal({ isOpen, onClose, onSave, initialData, cameras }: RuleModalProps) {
  const [name, setName] = useState('')
  const [cameraId, setCameraId] = useState('')
  const [selectedObjects, setSelectedObjects] = useState<string[]>(['person'])
  const [minConfidence, setMinConfidence] = useState(0.5)
  const [startHour, setStartHour] = useState(0)
  const [endHour, setEndHour] = useState(23)
  const [whatsappNumber, setWhatsappNumber] = useState('628')
  const [cooldown, setCooldown] = useState(60)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setCameraId(initialData.camera_id || '')
      setSelectedObjects(initialData.object_classes.split(',').map((s) => s.trim()))
      setMinConfidence(initialData.min_confidence)
      setStartHour(initialData.start_hour)
      setEndHour(initialData.end_hour)
      setWhatsappNumber(initialData.whatsapp_number)
      setCooldown(initialData.cooldown_seconds)
    } else {
      setName('Peringatan Orang Malam Hari')
      setCameraId('')
      setSelectedObjects(['person', 'car'])
      setMinConfidence(0.5)
      setStartHour(21)
      setEndHour(5)
      setWhatsappNumber('6281234567890')
      setCooldown(60)
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const toggleObject = (id: string) => {
    if (selectedObjects.includes(id)) {
      if (selectedObjects.length > 1) {
        setSelectedObjects(selectedObjects.filter((o) => o !== id))
      }
    } else {
      setSelectedObjects([...selectedObjects, id])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        camera_id: cameraId || null,
        object_classes: selectedObjects.join(','),
        min_confidence: Number(minConfidence),
        start_hour: Number(startHour),
        end_hour: Number(endHour),
        whatsapp_number: whatsappNumber.trim(),
        cooldown_seconds: Number(cooldown),
        is_active: true,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-cyan-400" />
            {initialData ? 'Edit Peraturan Alert' : 'Tambah Peraturan Alert WhatsApp'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
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
              placeholder="Contoh: Deteksi Orang Jam Malam"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kamera Target
            </label>
            <select
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Semua Saluran Kamera (Global)</option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Jenis Objek yang Memicu Alert *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OBJECT_OPTIONS.map((obj) => (
                <label
                  key={obj.id}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                    selectedObjects.includes(obj.id)
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedObjects.includes(obj.id)}
                    onChange={() => toggleObject(obj.id)}
                    className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <span>{obj.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mulai Jam (WIB)
              </label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00 WIB
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sampai Jam (WIB)
              </label>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:59 WIB
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-emerald-400" />
              Nomor WhatsApp Penerima Alert *
            </label>
            <input
              required
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="6281234567890 (format internasional)"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Notifikasi dikirim otomatis via gateway <strong>WABridge</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Anti-spam Cooldown (Detik)
            </label>
            <select
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value={30}>30 Detik (Sensitif)</option>
              <option value={60}>60 Detik (1 Menit - Rekomendasi)</option>
              <option value={180}>180 Detik (3 Menit)</option>
              <option value={300}>300 Detik (5 Menit)</option>
            </select>
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
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Peraturan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

