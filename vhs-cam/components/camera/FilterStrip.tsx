'use client'
import type { FilterMode } from '@/types'

const FILTER_ORDER: FilterMode[] = ['vhs', 'vhs-c', 'glitch', 'night', 'film', 'disposable', 'polaroid']

interface Props {
  current:  FilterMode
  onChange: (f: FilterMode) => void
  labels:   Record<FilterMode, string>
}

export function FilterStrip({ current, onChange, labels }: Props) {
  return (
    <div className="flex items-center justify-start gap-2 px-4 py-2 bg-black border-t border-zinc-900 overflow-x-auto scrollbar-none">
      {FILTER_ORDER.map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`shrink-0 text-[10px] tracking-widest px-3 py-1.5 rounded border font-mono transition-all ${
            current === f
              ? f === 'night'
                ? 'border-green-500 text-green-400 bg-green-500/10'
                : 'border-yellow-400 text-yellow-300 bg-yellow-400/5'
              : 'border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
          }`}
          style={current === f && f !== 'night' ? { textShadow: '0 0 6px rgba(232,224,0,0.4)' } : 
                 current === f && f === 'night'  ? { textShadow: '0 0 6px rgba(34,197,94,0.5)' } : undefined}
        >
          {labels[f]}
        </button>
      ))}
    </div>
  )
}