'use client'
import Link from 'next/link'
import type { FilterMode, FilterParams } from '@/types'

interface Props {
  params:        FilterParams
  onParamChange: (key: keyof FilterParams, value: number) => void
  onRecord:      () => void
  onPhoto:       () => void
  onFlip:        () => void
  recording:     boolean
  cameraReady:   boolean
  filter:        FilterMode
}

const SLIDERS: { key: keyof FilterParams; label: string }[] = [
  { key: 'glitch',   label: 'GLITCH'   },
  { key: 'noise',    label: 'NOISE'    },
  { key: 'vignette', label: 'VIGNETTE' },
]

export function VHSControls({ params, onParamChange, onRecord, onPhoto, onFlip, recording, cameraReady }: Props) {
  return (
    <div className="bg-zinc-950 border-t border-zinc-900 px-4 pt-3 pb-5 flex flex-col gap-3 shrink-0">
      <div className="flex items-center justify-between gap-3">
        {SLIDERS.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
            <label className="text-[8px] text-zinc-700 tracking-widest">{label}</label>
            <input
              type="range" min={0} max={100} step={1} value={params[key]}
              onChange={e => onParamChange(key, Number(e.target.value))}
              className="w-full h-0.5 bg-zinc-800 rounded appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col items-center gap-1">
          <Link href="/gallery">
            <button className="w-11 h-11 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-lg">⊞</button>
          </Link>
          <span className="text-[8px] text-zinc-700 tracking-widest">GALLERY</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onRecord} disabled={!cameraReady}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all
              ${recording
                ? 'bg-red-600 border-red-300 shadow-[0_0_28px_rgba(220,0,0,0.7)]'
                : 'bg-red-900 border-red-700 hover:bg-red-800 hover:shadow-[0_0_18px_rgba(200,0,0,0.4)]'}
              disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {recording
              ? <span className="w-6 h-6 bg-white rounded-sm" />
              : <span className="w-0 h-0 border-t-[10px] border-b-[10px] border-l-[18px] border-transparent border-l-white ml-1.5" />}
          </button>
          <span className={`text-[9px] tracking-widest font-bold ${recording ? 'text-red-400 animate-pulse' : 'text-zinc-600'}`}>
            {recording ? '● STOP REC' : 'RECORD'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={onPhoto} disabled={!cameraReady}
              className="w-11 h-11 rounded-full border-2 border-zinc-500 bg-white/5 flex items-center justify-center hover:bg-white/10 hover:border-zinc-300 transition-colors disabled:opacity-30"
            >
              <span className="w-5 h-5 rounded-full border-2 border-zinc-300 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-zinc-300" />
              </span>
            </button>
            <span className="text-[8px] text-zinc-700 tracking-widest">PHOTO</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button onClick={onFlip} className="w-9 h-9 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-base">⟳</button>
            <span className="text-[8px] text-zinc-700 tracking-widest">FLIP</span>
          </div>
        </div>
      </div>
    </div>
  )
}