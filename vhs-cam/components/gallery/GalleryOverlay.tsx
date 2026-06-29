'use client'
import { useEffect, useState, useCallback } from 'react'
import { getAllCaptures, deleteCapture } from '@/lib/db/gallery'
import type { CaptureItem } from '@/types'

interface Props {
  visible: boolean
  onClose: () => void
}

export function GalleryOverlay({ visible, onClose }: Props) {
  const [items, setItems]           = useState<CaptureItem[]>([])
  const [loaded, setLoaded]         = useState(false)
  const [preview, setPreview]       = useState<CaptureItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setLoaded(false)
    setPreview(null)
    getAllCaptures()
      .then(all => { setItems([...all].reverse()); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [visible])

  useEffect(() => {
    if (!preview) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(preview.blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview])

  const handleDelete = useCallback(async (id: string) => {
    await deleteCapture(id)
    setItems(prev => prev.filter(i => i.id !== id))
    if (preview?.id === id) setPreview(null)
  }, [preview])

  const handleDownload = useCallback((item: CaptureItem) => {
    const url = URL.createObjectURL(item.blob)
    const a   = document.createElement('a')
    const ext = item.type === 'video' ? 'mp4' : 'jpg'
    a.href     = url
    a.download = `VHS_${item.filter}_${item.id}.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }, [])

  if (!visible) return null

  return (
    <div className="absolute inset-0 z-40 bg-black font-mono flex flex-col" style={{ height: '100%' }}>

      {/* Header */}
      <div
        className="shrink-0 border-b border-zinc-900 bg-black"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
      >
        <div className="flex items-center justify-between px-2 pb-2">
          <button
            onClick={onClose}
            className="text-zinc-300 tracking-widest active:text-white"
            style={{ padding: '12px 16px', fontSize: 15, minWidth: 80 }}
          >
            ← BACK
          </button>
          <span className="text-zinc-600 text-xs tracking-widest">GALLERY</span>
          <span className="text-zinc-700 text-xs" style={{ minWidth: 80, textAlign: 'right', paddingRight: 16 }}>
            {items.length} ITEMS
          </span>
        </div>
      </div>

      {/* Loading */}
      {!loaded && (
        <div className="flex-1 flex items-center justify-center text-zinc-700 text-xs tracking-widest">
          LOADING...
        </div>
      )}

      {/* Empty */}
      {loaded && items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <p className="text-zinc-700 text-xs tracking-widest">NO CAPTURES YET</p>
          <button
            onClick={onClose}
            className="border border-zinc-800 text-zinc-400 text-sm px-6 rounded-xl tracking-widest active:text-white active:border-zinc-500"
            style={{ paddingTop: 14, paddingBottom: 14 }}
          >
            BACK TO CAMERA
          </button>
        </div>
      )}

      {/* Grid */}
      {loaded && items.length > 0 && (
        <div
          className="grid grid-cols-3 gap-px p-px"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'scroll',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            alignContent: 'start',
          } as React.CSSProperties}
        >
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => setPreview(item)}
              className="relative bg-zinc-950 active:opacity-60"
              style={{ aspectRatio: '16/9', display: 'block' }}
            >
              <img
                src={item.thumbnail}
                alt={item.filter}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-1 left-1 text-[7px] text-yellow-400/90 tracking-widest bg-black/70 px-1 py-0.5 rounded font-mono">
                {item.filter.toUpperCase()}
              </div>
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                    <span className="text-white text-xs" style={{ marginLeft: 2 }}>▶</span>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Preview */}
      {preview && previewUrl && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">

          {/* Preview header */}
          <div
            className="shrink-0 border-b border-zinc-900 bg-zinc-950"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <button
                onClick={() => setPreview(null)}
                className="text-zinc-300 tracking-widest active:text-white"
                style={{ padding: '12px 16px', fontSize: 15, minWidth: 80 }}
              >
                ← BACK
              </button>
              <span className="text-zinc-600 text-[10px] tracking-widest">
                {preview.filter.toUpperCase()} · {preview.type.toUpperCase()}
              </span>
              <div style={{ minWidth: 80 }} />
            </div>
          </div>

          {/* Media */}
          <div className="flex-1 flex items-center justify-center min-h-0 bg-black p-3">
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

          {/* Bottom action bar — full width, large tap targets */}
          <div
            className="shrink-0 bg-zinc-950 border-t border-zinc-900 flex"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
          >
            <button
              onClick={() => setPreview(null)}
              className="flex-1 text-zinc-400 text-sm tracking-widest active:text-white active:bg-zinc-900 transition-colors"
              style={{ paddingTop: 18, paddingBottom: 18 }}
            >
              ← GALLERY
            </button>
            <div className="w-px bg-zinc-800" />
            <button
              onClick={() => handleDownload(preview)}
              className="flex-1 text-yellow-400 text-sm tracking-widest active:text-yellow-200 active:bg-zinc-900 transition-colors"
              style={{ paddingTop: 18, paddingBottom: 18 }}
            >
              ↓ SAVE
            </button>
            <div className="w-px bg-zinc-800" />
            <button
              onClick={() => handleDelete(preview.id)}
              className="flex-1 text-red-500 text-sm tracking-widest active:text-red-300 active:bg-zinc-900 transition-colors"
              style={{ paddingTop: 18, paddingBottom: 18 }}
            >
              DELETE
            </button>
          </div>

        </div>
      )}
    </div>
  )
}