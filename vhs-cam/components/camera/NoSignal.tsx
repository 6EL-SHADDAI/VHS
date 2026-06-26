'use client'
import type { CameraStatus } from '@/hooks/useCamera'

interface Props {
  status:   CameraStatus
  error:    string | null
  onEnable: () => void
}

export function NoSignal({ status, error, onEnable }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black z-20 font-mono">
      <div className="text-5xl opacity-10">▓</div>
      <p className="text-zinc-600 text-xs tracking-widest uppercase">
        {error ? 'CAMERA DENIED' : status === 'requesting' ? 'CONNECTING...' : 'NO SIGNAL'}
      </p>
      {error && (
        <p className="text-zinc-700 text-[10px] tracking-wide max-w-xs text-center">{error}</p>
      )}
      {status !== 'requesting' && (
        <button
          onClick={onEnable}
          className="border border-zinc-700 text-zinc-400 text-xs tracking-widest px-5 py-2.5 rounded hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          ENABLE CAMERA
        </button>
      )}
    </div>
  )
}
