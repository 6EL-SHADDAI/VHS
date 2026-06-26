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
  hasAudio:      boolean
}

const SLIDERS: { key: keyof FilterParams; label: string }[] = [
  { key: 'glitch',   label: 'GLITCH'   },
  { key: 'noise',    label: 'NOISE'    },
  { key: 'vignette', label: 'VIGNETTE' },
]

export function VHSControls({
  params, onParamChange, onRecord, onPhoto, onFlip,
  recording, cameraReady, hasAudio,
}: Props) {
  return (
    <div className="bg-black border-t border-zinc-900 flex flex-col shrink-0 pb-safe">

      {recording && (
        <div className="flex items-center justify-center gap-2 py-2 bg-red-950/60 border-b border-red-900">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-bold tracking-widest font-mono">
            RECORDING{hasAudio ? ' + AUDIO' : ''} — TAP STOP TO SAVE
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-2">
        {SLIDERS.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center gap-2 flex-1">
            <label className="text-[9px] text-zinc-600 tracking-widest font-mono">{label}</label>
            <input
              type="range"
              min={0} max={100} step={1}
              value={params[key]}
              onChange={e => onParamChange(key, Number(e.target.value))}
              className="w-full cursor-pointer appearance-none bg-transparent
                [&::-webkit-slider-runnable-track]:h-[3px]
                [&::-webkit-slider-runnable-track]:rounded-full
                [&::-webkit-slider-runnable-track]:bg-zinc-800
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-yellow-400
                [&::-webkit-slider-thumb]:mt-[-9px]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-track]:h-[3px]
                [&::-moz-range-track]:rounded-full
                [&::-moz-range-track]:bg-zinc-800
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-yellow-400
                [&::-moz-range-thumb]:border-0"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-6 pt-2 pb-5">

        <div className="flex flex-col items-center gap-1.5 w-14">
          <Link href="/gallery">
            <button className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center active:scale-95 transition-transform">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
          </Link>
          <span className="text-[9px] text-zinc-700 tracking-widest font-mono">GALLERY</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onRecord}
            disabled={!cameraReady}
            className="relative flex items-center justify-center active:scale-95 transition-transform disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ width: 88, height: 88 }}
          >
            <span className={`absolute inset-0 rounded-full border-4 transition-all duration-300 ${
              recording
                ? 'border-red-400 shadow-[0_0_0_4px_rgba(239,68,68,0.25),0_0_32px_rgba(239,68,68,0.5)]'
                : 'border-red-700'
            }`} />
            <span className={`rounded-full transition-all duration-300 flex items-center justify-center ${
              recording ? 'w-16 h-16 bg-red-600' : 'w-[72px] h-[72px] bg-red-700'
            }`}>
              {recording
                ? <span className="w-7 h-7 bg-white rounded-md" />
                : <span className="w-0 h-0 border-t-[11px] border-b-[11px] border-l-[20px] border-transparent border-l-white ml-2" />
              }
            </span>
          </button>
          <span className={`text-xs font-bold tracking-widest font-mono transition-colors ${
            recording ? 'text-red-400' : 'text-zinc-500'
          }`}>
            {recording ? '■ STOP' : '● REC'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3 w-14">
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onPhoto}
              disabled={!cameraReady}
              className="w-14 h-14 rounded-full border-2 border-zinc-600 bg-zinc-900 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-25"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            <span className="text-[9px] text-zinc-700 tracking-widest font-mono">PHOTO</span>
          </div>
          <button
            onClick={onFlip}
            className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  )
}