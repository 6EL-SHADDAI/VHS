'use client'
import type { FilterMode } from '@/types'

const FILTER_ORDER: FilterMode[] = ['disposable', 'vhs', 'vhs-c', 'night', 'film', 'polaroid', 'glitch']

const FILTER_ACCENT: Record<FilterMode, { active: string; glow: string }> = {
  'vhs':        { active: 'border-yellow-400 text-yellow-300 bg-yellow-400/10',  glow: 'rgba(250,204,21,0.4)'  },
  'vhs-c':      { active: 'border-orange-400 text-orange-300 bg-orange-400/10',  glow: 'rgba(251,146,60,0.4)'  },
  'glitch':     { active: 'border-red-400 text-red-300 bg-red-400/10',           glow: 'rgba(248,113,113,0.4)' },
  'night':      { active: 'border-green-400 text-green-300 bg-green-400/10',     glow: 'rgba(74,222,128,0.4)'  },
  'film':       { active: 'border-blue-400 text-blue-300 bg-blue-400/10',        glow: 'rgba(96,165,250,0.4)'  },
  'disposable': { active: 'border-amber-400 text-amber-300 bg-amber-400/10',     glow: 'rgba(251,191,36,0.4)'  },
  'polaroid':   { active: 'border-pink-400 text-pink-300 bg-pink-400/10',        glow: 'rgba(244,114,182,0.4)' },
}

interface Props {
  current:  FilterMode
  onChange: (f: FilterMode) => void
  labels:   Record<FilterMode, string>
}

export function FilterStrip({ current, onChange, labels }: Props) {
  return (
    <div className="bg-black border-t border-zinc-900 shrink-0">
      <div
        className="flex items-center gap-2 px-3 py-2.5 overflow-x-auto"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
      >
        {FILTER_ORDER.map(f => {
          const isActive = current === f
          const accent   = FILTER_ACCENT[f]
          return (
            <button
              key={f}
              onClick={() => onChange(f)}
              style={{
                scrollSnapAlign: 'start',
                boxShadow: isActive ? `0 0 10px ${accent.glow}` : 'none',
                minWidth: 72,
                flexShrink: 0,
              }}
              className={`
                h-10 px-4 rounded-lg border font-mono text-[11px] tracking-widest
                font-semibold transition-all duration-150 active:scale-95
                ${isActive
                  ? accent.active
                  : 'border-zinc-800 text-zinc-600 bg-transparent hover:border-zinc-600 hover:text-zinc-400'
                }
              `}
            >
              {labels[f]}
            </button>
          )
        })}
        <div className="w-3 shrink-0" />
      </div>
    </div>
  )
}