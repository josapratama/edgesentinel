import { useState } from 'react'
import { Delete, Lock, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'

interface PinLockScreenProps {
  onUnlocked: () => void
}

export function PinLockScreen({ onUnlocked }: PinLockScreenProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [changeMsg, setChangeMsg] = useState<string | null>(null)

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit
      setPin(nextPin)
      setError(null)
      if (nextPin.length === 6) {
        verify(nextPin)
      }
    }
  }

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1))
    setError(null)
  }

  const verify = async (code: string) => {
    setIsVerifying(true)
    setError(null)
    try {
      const res = await api.verifyPin(code)
      if (res.authenticated) {
        localStorage.setItem('edgesentinel_auth_token', res.token)
        onUnlocked()
      }
    } catch {
      setError('PIN Salah. Coba lagi atau gunakan PIN default.')
      setPin('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangeMsg(null)
    try {
      const res = await api.changePin(oldPin, newPin)
      if (res.success) {
        localStorage.setItem('edgesentinel_auth_token', res.token)
        setChangeMsg('PIN berhasil diperbarui!')
        setTimeout(() => {
          setShowChangeModal(false)
          onUnlocked()
        }, 800)
      }
    } catch (err: unknown) {
      setChangeMsg(err instanceof Error ? err.message : 'Gagal mengganti PIN')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14] p-4 text-slate-100 select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 h-72 w-72 rounded-full bg-cyan-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 h-72 w-72 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center">
        {/* Shield Icon */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-xl shadow-cyan-950/60 mb-4">
          <Lock className="h-8 w-8 text-white" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-4 ring-slate-900 animate-pulse" />
        </div>

        <h2 className="text-xl font-extrabold tracking-tight text-white">EdgeSentinel Security</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Masukkan 6 digit PIN untuk membuka akses NVR
        </p>

        {/* PIN Dots Display */}
        <div className="flex items-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = pin.length > idx
            return (
              <div
                key={idx}
                className={`h-3.5 w-3.5 rounded-full border transition-all duration-200 ${
                  isFilled
                    ? 'border-cyan-400 bg-cyan-400 shadow-md shadow-cyan-400/50 scale-110'
                    : 'border-slate-700 bg-slate-950/60'
                }`}
              />
            )
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 mb-4 animate-bounce">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Number Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={isVerifying}
              className="flex h-14 w-full items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/70 text-xl font-bold text-slate-200 hover:bg-slate-800 hover:text-white active:scale-95 transition-all shadow-sm"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            type="button"
            onClick={() => setPin('')}
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/40 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 active:scale-95 transition-all"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isVerifying}
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/70 text-xl font-bold text-slate-200 hover:bg-slate-800 hover:text-white active:scale-95 transition-all shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/40 text-slate-400 hover:bg-slate-800 hover:text-rose-400 active:scale-95 transition-all"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Footer info & Change PIN shortcut */}
        <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
          <span>PIN Default: <strong className="text-slate-300">123456</strong></span>
          <button
            type="button"
            onClick={() => setShowChangeModal(true)}
            className="text-cyan-400 hover:underline font-semibold"
          >
            Ganti PIN
          </button>
        </div>
      </div>

      {/* Change PIN Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <form
            onSubmit={handleChangePinSubmit}
            className="relative w-full max-w-xs rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-left"
          >
            <h3 className="text-sm font-bold text-white mb-1">Ganti PIN Keamanan</h3>
            <p className="text-xs text-slate-400 mb-4">Gunakan 4 - 8 angka yang mudah Anda ingat.</p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">PIN Lama</label>
                <input
                  type="password"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="PIN Lama (cth: 123456)"
                  maxLength={8}
                  className="w-full mt-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">PIN Baru</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="PIN Baru (4-8 angka)"
                  maxLength={8}
                  className="w-full mt-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            {changeMsg && (
              <p className="text-xs text-cyan-400 mt-3 font-semibold">{changeMsg}</p>
            )}

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowChangeModal(false)}
                className="flex-1 rounded-xl border border-slate-700 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-cyan-600 py-2 text-xs font-bold text-white hover:bg-cyan-500 shadow-md"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
