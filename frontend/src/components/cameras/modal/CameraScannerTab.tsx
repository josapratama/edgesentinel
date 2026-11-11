import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import type { DiscoveredDevice } from '../../../types'
import { api } from '../../../lib/api'

interface CameraScannerTabProps {
  onApplyDiscovered: (ip: string, channel: number, isSubStream: boolean) => void
}

export function CameraScannerTab({ onApplyDiscovered }: CameraScannerTabProps) {
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<DiscoveredDevice[]>([])
  const [scanMessage, setScanMessage] = useState('')
  const [dvrPassword, setDvrPassword] = useState('Admin123')

  const handleScan = async () => {
    setScanning(true)
    setScanMessage('Memindai subnet lokal (port 554 RTSP, 8000 Hikvision)...')
    try {
      const res = await api.scanCameras()
      setScanResults(res.devices || [])
      setScanMessage(
        res.devices.length > 0
          ? `Ditemukan ${res.devices.length} perangkat CCTV / DVR di LAN!`
          : 'Tidak ada perangkat RTSP baru ditemukan di subnet ini.'
      )
    } catch {
      setScanMessage('Gagal melakukan scan LAN. Pastikan server memiliki akses jaringan lokal.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
      {/* Scanner Control Bar */}
      <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-white">Auto-Discovery CCTV / DVR</p>
          <p className="text-[11px] text-slate-400">
            {scanMessage || 'Pindai subnet lokal untuk mendeteksi port RTSP 554 & SDK 8000.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-950/40"
        >
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          <span>{scanning ? 'Memindai...' : 'Mulai Scan'}</span>
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-300">Password DVR / RTSP untuk Auto-Fill</label>
        <input
          type="text"
          value={dvrPassword}
          onChange={(e) => setDvrPassword(e.target.value)}
          placeholder="Contoh: Admin123"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-300">Hasil Perangkat Ditemukan:</p>
        {scanResults.length === 0 && !scanning && (
          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
            Klik tombol "Mulai Scan" di atas untuk mencari DVR di jaringan rumah Anda.
          </div>
        )}

        {scanResults.map((dev) => (
          <div key={dev.ip} className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">{dev.device_type}</span>
                <p className="text-[11px] font-mono text-cyan-400 font-semibold">{dev.ip}</p>
              </div>
              <span className="rounded-lg bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 text-[10px] text-emerald-300 font-bold">
                Port 554 Terbuka
              </span>
            </div>

            <p className="text-[10px] text-slate-400">Pilih Saluran / Channel untuk Ditambahkan:</p>
            <div className="grid grid-cols-2 gap-2">
              {dev.channels.map((ch) => (
                <div
                  key={ch.channel}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-2.5 flex flex-col justify-between"
                >
                  <span className="text-[11px] font-bold text-white">Saluran {ch.channel}</span>
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => onApplyDiscovered(dev.ip, ch.channel, true)}
                      className="flex-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 py-1 text-[10px] text-cyan-300 font-semibold transition-colors"
                    >
                      Sub-Stream (AI)
                    </button>
                    <button
                      type="button"
                      onClick={() => onApplyDiscovered(dev.ip, ch.channel, false)}
                      className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 py-1 text-[10px] text-slate-300 font-semibold transition-colors"
                    >
                      Main-HD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

