'use client'
import Link from 'next/link'
import type { FilterMode, FilterParams } from '@/types'

interface Props {
  params:          FilterParams
  onParamChange:   (key: keyof FilterParams, value: number) => void
  onRecord:        () => void
  onPhoto:         () => void
  onFlip:          () => void
  recording:       boolean
  cameraReady:     boolean
  filter:          FilterMode
}

const SLIDERS: { key: keyof FilterParams; label: string }[] = [
  { key: 'glitch',   label: 'GLITCH'   },
  { key: 'noise',    label: 'NOISE'    },
  { key: 'vignette', label: 'VIGNETTE' },
]

export function VHSControls({
  params, onParamChange, onRecord, onPhoto, onFlip,
  recording, cameraReady, filter
}: Props) {
  return (
    <div className="bg-zinc-950 border-t border-zinc-900 px-4 pt-3 pb-5 flex flex-col gap-3 shrink-0">
      {/* Sliders */}
      <div className="flex items-center justify-between gap-3">
        {SLIDERS.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
            <label className="text-[8px] text-zinc-700 tracking-widest">{label}</label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={params[key]}
              onChange={e => onParamChange(key, Number(e.target.value))}
              className="w-full h-0.5 bg-zinc-800 rounded appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-yellow-400
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        ))}
      </div>

      {/* Main buttons */}
      <div className="flex items-center justify-between">
        {/* Gallery */}
        <Link href="/gallery">
          <button className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-lg">
            ⊞
          </button>
        </Link>

        {/* Record */}
        <button
          onClick={onRecord}
          disabled={!cameraReady}
          className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all
            ${recording
              ? 'bg-red-600 border-red-400 shadow-[0_0_20px_rgba(220,0,0,0.5)]'
              : 'bg-red-800/80 border-red-700 hover:bg-red-700 hover:shadow-[0_0_16px_rgba(200,0,0,0.4)]'}
            disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {recording
            ? <span className="w-5 h-5 bg-white rounded-sm" />
            : <span className="w-0 h-0 border-t-[9px] border-b-[9px] border-l-[16px] border-transparent border-l-white ml-1" />
          }
        </button>

        {/* Photo + Flip */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPhoto}
            disabled={!cameraReady}
            className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-30 text-sm"
          >
            ◎
          </button>
          <button
            onClick={onFlip}
            className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-base"
          >
            ⟳
          </button>
        </div>
      </div>
    </div>
  )
}
