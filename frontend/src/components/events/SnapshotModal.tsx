import { X } from 'lucide-react'

interface SnapshotModalProps {
  imageUrl: string | null
  onClose: () => void
}

export function SnapshotModal({ imageUrl, onClose }: SnapshotModalProps) {
  if (!imageUrl) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Bukti Keamanan"
          className="w-full h-full object-contain"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full bg-black/75 p-2 text-white hover:bg-black/90 transition-colors shadow-lg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

