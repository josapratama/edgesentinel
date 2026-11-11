import { useState } from 'react'
import { X, UserCheck, Plus, Trash2, ShieldCheck, Upload } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { KnownFace } from '../../types'

interface KnownFacesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function KnownFacesModal({ isOpen, onClose }: KnownFacesModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('Keluarga')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: faces = [], isLoading } = useQuery({
    queryKey: ['known-faces'],
    queryFn: api.getFaces,
    enabled: isOpen,
  })

  const registerMutation = useMutation({
    mutationFn: (formData: FormData) => api.registerFace(formData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['known-faces'] })
      setName('')
      setRelation('Keluarga')
      setSelectedFile(null)
      setPreviewUrl(null)
      setErrorMsg(null)
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftarkan wajah')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteFace(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['known-faces'] })
    },
  })

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setErrorMsg(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setErrorMsg('Pilih foto wajah terlebih dahulu.')
      return
    }
    setIsUploading(true)
    setErrorMsg(null)
    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('relation', relation.trim())
    formData.append('photo', selectedFile)

    try {
      await registerMutation.mutateAsync(formData)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Daftar Wajah Dikenal (Whitelist)</h3>
              <p className="text-[11px] text-slate-400">AI mengenali keluarga agar tidak memicu alarm palsu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 my-4 pr-1">
          {/* Form Upload Wajah Baru */}
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Plus className="h-3.5 w-3.5 text-cyan-400" />
              <span>Daftarkan Wajah Baru</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-medium">Nama Anggota</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cth: Bpk. Josa / Ibu"
                  required
                  className="w-full mt-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-medium">Hubungan</label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Pemilik Rumah">Pemilik Rumah</option>
                  <option value="Keluarga">Keluarga</option>
                  <option value="Tamu Rutin">Tamu Rutin</option>
                  <option value="Staf / Karyawan">Staf / Karyawan</option>
                </select>
              </div>
            </div>

            {/* Photo upload picker */}
            <div>
              <label className="text-[11px] text-slate-400 font-medium">Foto Wajah (Tampak Depan Jelas)</label>
              <div className="mt-1 flex items-center gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 hover:border-cyan-500 hover:text-white cursor-pointer transition-colors">
                  <Upload className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Pilih Foto dari Galeri</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {previewUrl && (
                  <div className="flex items-center gap-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-9 w-9 rounded-xl object-cover border border-cyan-500"
                    />
                    <span className="text-[11px] text-emerald-400 font-semibold">Foto siap</span>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={isUploading || !name || !selectedFile}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-2 text-xs font-bold text-white shadow-md hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isUploading ? 'Menganalisis Wajah...' : 'Simpan & Daftarkan Wajah'}</span>
            </button>
          </form>

          {/* List Wajah yang Sudah Terdaftar */}
          <div>
            <div className="text-xs font-bold text-slate-300 mb-2.5">
              Wajah Terverifikasi ({faces.length})
            </div>

            {isLoading ? (
              <div className="text-center py-6 text-xs text-slate-500">Memuat data wajah...</div>
            ) : faces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                Belum ada wajah terdaftar. Tambahkan foto di atas agar AI dapat mengenali keluarga Anda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {faces.map((f: KnownFace) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={f.photo_url}
                        alt={f.name}
                        className="h-10 w-10 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{f.name}</div>
                        <div className="text-[10px] text-cyan-400 font-medium">{f.relation}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Hapus data wajah "${f.name}"?`)) {
                          deleteMutation.mutate(f.id)
                        }
                      }}
                      title="Hapus Wajah"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
