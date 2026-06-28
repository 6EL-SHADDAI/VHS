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

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, onClose])

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

  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-black font-mono"
      style={{ height: '100%' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0 border-b border-zinc-900"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', paddingBottom: 12 }}
      >
        <button
          onClick={onClose}
          className="text-zinc-400 text-sm tracking-widest py-2 pr-6 active:text-white transition-colors"
        >
          ← BACK
        </button>
        <span className="text-zinc-600 text-xs tracking-widest">GALLERY</span>
        <span className="text-zinc-700 text-xs">{items.length} ITEMS</span>
      </div>

      {!loaded && (
        <div className="flex-1 flex items-center justify-center text-zinc-700 text-xs tracking-widest">
          LOADING...
        </div>
      )}

      {loaded && items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-zinc-700 text-xs tracking-widest">NO CAPTURES YET</p>
          <button
            onClick={onClose}
            className="border border-zinc-800 text-zinc-500 text-xs px-5 py-3 rounded-xl active:border-zinc-600 active:text-zinc-300 tracking-widest"
          >
            BACK TO CAMERA
          </button>
        </div>
      )}

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
              className="relative bg-zinc-950 active:opacity-70"
              style={{ aspectRatio: '16/9', display: 'block' }}
            >
              <img
                src={item.thumbnail}
                alt={item.filter}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-1 left-1 text-[7px] text-yellow-400/80 tracking-widest bg-black/70 px-1 py-0.5 rounded font-mono">
                {item.filter.toUpperCase()}
              </div>
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                    <span className="text-white text-xs ml-0.5">▶</span>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Preview */}
      {preview && previewUrl && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-zinc-900">
            <button
              onClick={() => setPreview(null)}
              className="text-zinc-400 text-sm tracking-widest py-1 pr-4 active:text-white"
            >
              ← BACK
            </button>
            <span className="text-zinc-600 text-[10px] tracking-widest">
              {preview.filter.toUpperCase()}
            </span>
            <div className="flex items-center gap-4">
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

          <div className="flex-1 flex items-center justify-center p-3 min-h-0 bg-black">
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
                style={{ maxHeight: 'calc(100dvh - 140px)' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}