import { Film, Download, X } from 'lucide-react'

interface VideoPlayerModalProps {
  videoUrl: string | null
  onClose: () => void
}

export function VideoPlayerModal({ videoUrl, onClose }: VideoPlayerModalProps) {
  if (!videoUrl) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Pemutaran Rekaman Kejadian (10s MP4)</h3>
              <p className="text-[10px] text-slate-400">Rolling Buffer Pre-alarm & Kejadian Lapangan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 shadow-inner">
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>Durasi: ~10 Detik Format H.264 MP4</span>
          <a
            href={videoUrl}
            download
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh File MP4</span>
          </a>
        </div>
      </div>
    </div>
  )
}
