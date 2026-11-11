import { Trash2, ExternalLink, CheckCircle2, XCircle, Play, Film, AlertTriangle } from 'lucide-react'
import type { SecurityEvent } from '../../types'
import { formatDateTime } from '../../lib/utils'
import { Badge } from '../ui/Badge'

interface EventCardProps {
  event: SecurityEvent
  onPreviewSnapshot: (url: string) => void
  onPlayVideo: (url: string) => void
  onDelete: (id: string) => void
}

export function EventCard({
  event,
  onPreviewSnapshot,
  onPlayVideo,
  onDelete,
}: EventCardProps) {
  const isLoitering = Boolean(event.is_loitering)

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-3xl border bg-slate-900/80 shadow-xl transition-all duration-300 ${
        isLoitering
          ? 'border-rose-500/80 hover:border-rose-400'
          : 'border-slate-800/80 hover:border-cyan-500/50'
      }`}
    >
      {/* Thumbnail area */}
      <div
        className="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer"
        onClick={() => {
          if (event.video_url) {
            onPlayVideo(event.video_url)
          } else {
            onPreviewSnapshot(event.snapshot_url)
          }
        }}
      >
        <img
          src={event.snapshot_url}
          alt={event.object_class}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Video Play Button Overlay if video clip exists */}
        {event.video_url && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/15 transition-colors">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600/90 text-white shadow-xl backdrop-blur-xs group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5 fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Top Left Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 z-10 max-w-[70%]">
          <Badge variant={isLoitering ? 'rose' : 'cyan'}>
            {event.object_class.toUpperCase()} ({Math.round(event.confidence * 100)}%)
          </Badge>

          {event.familiar_face && (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-md">
              <span>👤 {event.familiar_face}</span>
            </span>
          )}

          {event.is_stranger && (
            <span className="flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-md animate-pulse">
              <span>🚨 Orang Asing</span>
            </span>
          )}

          {event.license_plate && (
            <span className="flex items-center gap-1 rounded-lg bg-amber-500 text-slate-950 font-black px-2 py-0.5 text-[9px] shadow-md tracking-wider">
              <span>🚗 {event.license_plate}</span>
            </span>
          )}

          {isLoitering && (
            <span className="flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-md animate-pulse">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>LOITERING</span>
            </span>
          )}
        </div>

        {/* Top Right Badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {event.video_url && (
            <span className="flex items-center gap-1 rounded-lg bg-blue-950/80 border border-blue-700/60 px-2 py-0.5 text-[9px] font-bold text-blue-300 backdrop-blur-md">
              <Film className="h-2.5 w-2.5" />
              <span>10s MP4</span>
            </span>
          )}

          {event.notified_whatsapp ? (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md">
              <CheckCircle2 className="h-3 w-3" />
              <span>WA Sent</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-lg bg-slate-900/80 border border-slate-700 px-2 py-0.5 text-[9px] font-medium text-slate-400 backdrop-blur-md">
              <XCircle className="h-3 w-3" />
              <span>Terekam</span>
            </span>
          )}
        </div>
      </div>

      {/* Details Footer */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h4 className="font-bold text-xs text-white truncate">
            {event.camera_name}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {formatDateTime(event.created_at)}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/70 pt-3 mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPreviewSnapshot(event.snapshot_url)}
              className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> Foto
            </button>
            {event.video_url && (
              <button
                onClick={() => onPlayVideo(event.video_url!)}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Play className="h-3 w-3" /> Putar Video
              </button>
            )}
          </div>
          <button
            onClick={() => onDelete(event.id)}
            title="Hapus rekaman kejadian"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

