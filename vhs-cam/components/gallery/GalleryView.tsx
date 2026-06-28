'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAllCaptures, deleteCapture } from '@/lib/db/gallery'
import type { CaptureItem } from '@/types'

export function GalleryView() {
  const router = useRouter()
  const [items, setItems]     = useState<CaptureItem[]>([])
  const [loaded, setLoaded]   = useState(false)
  const [preview, setPreview] = useState<CaptureItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    getAllCaptures()
      .then(all => { setItems([...all].reverse()); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!preview) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(preview.blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview])

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteCapture(id)
    setItems(prev => prev.filter(i => i.id !== id))
    if (preview?.id === id) setPreview(null)
  }, [preview])

  const handleDownload = useCallback((item: CaptureItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = URL.createObjectURL(item.blob)
    const a   = document.createElement('a')
    const ext = item.type === 'video' ? 'mp4' : 'jpg'
    a.href     = url
    a.download = `VHS_${item.filter}_${item.id}.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }, [])

  return (
    <div
      className="bg-black font-mono flex flex-col"
      style={{ height: '100dvh', overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 shrink-0">
        <button
          onClick={() => router.push('/camera')}
          className="text-zinc-500 text-sm tracking-widest active:text-zinc-300 transition-colors px-1 py-1"
        >
          ← BACK
        </button>
        <span className="text-zinc-600 text-xs tracking-widest">GALLERY</span>
        <span className="text-zinc-700 text-xs">{items.length} ITEMS</span>
      </div>

      {/* Loading */}
      {!loaded && (
        <div className="flex-1 flex items-center justify-center text-zinc-700 text-xs tracking-widest">
          LOADING...
        </div>
      )}

      {/* Empty */}
      {loaded && items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-zinc-700 text-xs tracking-widest">NO CAPTURES YET</p>
          <button
            onClick={() => router.push('/camera')}
            className="border border-zinc-800 text-zinc-500 text-xs px-5 py-2.5 rounded-lg active:border-zinc-600 active:text-zinc-300 transition-colors tracking-widest"
          >
            OPEN CAMERA
          </button>
        </div>
      )}

      {/* Grid */}
      {loaded && items.length > 0 && (
        <div
          className="grid grid-cols-3 gap-px p-px"
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => setPreview(item)}
              className="relative bg-zinc-950 active:opacity-80 transition-opacity"
              style={{ aspectRatio: '16/9' }}
            >
              <img
                src={item.thumbnail}
                alt={item.filter}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-1 left-1 text-[8px] text-yellow-400/80 tracking-widest bg-black/60 px-1.5 py-0.5 rounded font-mono">
                {item.filter.toUpperCase()}
              </div>
              {item.type === 'video' && (
                <div className="absolute bottom-1 left-1 text-[8px] text-red-400/80 tracking-widest bg-black/60 px-1.5 py-0.5 rounded font-mono">
                  ▶ VID
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && previewUrl && (
        <div
          className="absolute inset-0 bg-black/95 flex flex-col z-50"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreview(null)}
              className="text-zinc-400 text-sm tracking-widest px-1 py-1 active:text-white"
            >
              ✕ CLOSE
            </button>
            <span className="text-zinc-600 text-[10px] tracking-widest font-mono">
              {preview.filter.toUpperCase()} · {preview.type.toUpperCase()}
            </span>
            <div className="flex gap-4">
              <button
                onClick={e => handleDownload(preview, e)}
                className="text-yellow-400 text-xs tracking-widest active:text-yellow-200 py-1"
              >
                ↓ SAVE
              </button>
              <button
                onClick={e => handleDelete(preview.id, e)}
                className="text-red-500 text-xs tracking-widest active:text-red-300 py-1"
              >
                DELETE
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-4 min-h-0"
            onClick={e => e.stopPropagation()}
          >
            {preview.type === 'photo' ? (
              <img
                src={previewUrl}
                alt="preview"
                className="max-w-full max-h-full object-contain rounded"
              />
            ) : (
              <video
                src={previewUrl}
                controls
                playsInline
                autoPlay
                className="max-w-full max-h-full rounded"
                style={{ maxHeight: 'calc(100dvh - 120px)' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}