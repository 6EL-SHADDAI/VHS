'use client'
import type { StampRotation, StampScale } from '@/lib/stamp'

interface Props {
  stampEnabled:     boolean
  locationEnabled:  boolean
  locationStatus:   'idle' | 'requesting' | 'ready' | 'denied'
  stampRotation:    StampRotation
  stampScale:       StampScale
  onToggleStamp:    () => void
  onToggleLocation: () => void
  onCycleRotation:  () => void
  onCycleScale:     () => void
}

const ROTATION_LABEL: Record<string, string> = {
  '0':   '↕ PORT',
  '90':  '↻ CW',
  '-90': '↺ CCW',
}

export function StampControls({
  stampEnabled, locationEnabled, locationStatus,
  stampRotation, stampScale,
  onToggleStamp, onToggleLocation, onCycleRotation, onCycleScale,
}: Props) {
  const locLabel = () => {
    if (locationStatus === 'requesting') return 'LOCATING...'
    if (locationStatus === 'denied')     return 'DENIED'
    if (locationEnabled && locationStatus === 'ready') return 'LOC ON'
    return 'LOC'
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-zinc-900 bg-black">
      {/* Timestamp toggle */}
      <button
        onClick={onToggleStamp}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-mono tracking-widest transition-all active:scale-95 ${
          stampEnabled
            ? 'border-yellow-500 text-yellow-300 bg-yellow-400/10'
            : 'border-zinc-800 text-zinc-600'
        }`}
      >
        <span>{stampEnabled ? '◉' : '○'}</span>
        <span>DATE</span>
      </button>

      {/* Size cycle */}
      {stampEnabled && (
        <button
          onClick={onCycleScale}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-mono tracking-widest transition-all active:scale-95 ${
            stampScale !== 1
              ? 'border-yellow-500 text-yellow-300 bg-yellow-400/10'
              : 'border-zinc-800 text-zinc-600'
          }`}
        >
          {stampScale}X
        </button>
      )}

      {/* Rotation cycle */}
      {stampEnabled && (
        <button
          onClick={onCycleRotation}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-mono tracking-widest transition-all active:scale-95 ${
            stampRotation !== 0
              ? 'border-yellow-500 text-yellow-300 bg-yellow-400/10'
              : 'border-zinc-800 text-zinc-600'
          }`}
        >
          {ROTATION_LABEL[String(stampRotation)]}
        </button>
      )}

      {/* Location toggle */}
      {stampEnabled && (
        <button
          onClick={onToggleLocation}
          disabled={locationStatus === 'requesting'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-mono tracking-widest transition-all active:scale-95 disabled:opacity-40 ${
            locationEnabled && locationStatus === 'ready'
              ? 'border-green-500 text-green-300 bg-green-400/10'
              : locationStatus === 'denied'
              ? 'border-red-800 text-red-600'
              : 'border-zinc-800 text-zinc-600'
          }`}
        >
          <span>{locationEnabled && locationStatus === 'ready' ? '◉' : '○'}</span>
          <span>{locLabel()}</span>
        </button>
      )}
    </div>
  )
}