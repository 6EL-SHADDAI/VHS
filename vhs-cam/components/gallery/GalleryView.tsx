'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllCaptures, deleteCapture } from '@/lib/db/gallery'
import type { CaptureItem } from '@/types'

export function GalleryView() {
  const [items, setItems]   = useState<CaptureItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getAllCaptures().then(all => {
      setItems([...all].reverse())
      setLoaded(true)
    })
  }, [])

  const handleDelete = async (id: string) => {
    await deleteCapture(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="min-h-screen bg-black font-mono flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
        <Link href="/camera">
          <button className="text-zinc-500 text-xs tracking-widest hover:text-zinc-300 transition-colors">← BACK</button>
        </Link>
        <span className="text-zinc-600 text-xs tracking-widest">GALLERY</span>
        <span className="text-zinc-700 text-xs">{items.length} ITEMS</span>
      </div>

      {!loaded && (
        <div className="flex-1 flex items-center justify-center text-zinc-700 text-xs tracking-widest">LOADING...</div>
      )}

      {loaded && items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-zinc-700 text-xs tracking-widest">NO CAPTURES YET</p>
          <Link href="/camera">
            <button className="border border-zinc-800 text-zinc-500 text-xs px-4 py-2 rounded hover:border-zinc-600 hover:text-zinc-300 transition-colors tracking-widest">
              OPEN CAMERA
            </button>
          </Link>
        </div>
      )}

      {loaded && items.length > 0 && (
        <div className="grid grid-cols-3 gap-px p-px flex-1 overflow-y-auto content-start">
          {items.map(item => (
            <div key={item.id} className="relative aspect-video bg-zinc-950 group">
              <img
                src={item.thumbnail}
                alt={item.filter}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute top-1 left-1 text-[8px] text-yellow-400/70 tracking-widest bg-black/50 px-1 rounded">
                {item.filter.toUpperCase()}
              </div>
              {item.type === 'video' && (
                <div className="absolute top-1 right-1 text-[8px] text-red-400/70 tracking-widest bg-black/50 px-1 rounded">
                  ● VID
                </div>
              )}
              <button
                onClick={() => handleDelete(item.id)}
                className="absolute bottom-1 right-1 text-[10px] text-zinc-600 bg-black/60 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
