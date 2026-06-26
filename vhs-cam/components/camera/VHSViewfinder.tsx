'use client'
import { useEffect, useState } from 'react'
import type { FilterMode } from '@/types'

function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

interface Props {
  recording: boolean
  duration:  number
  filter:    FilterMode
}

export function VHSViewfinder({ recording, duration, filter }: Props) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setFrame(f => (f + 1) % 30), 33)
    return () => clearInterval(id)
  }, [recording])

  const frameStr = String(frame).padStart(2, '0')

  return (
    <div className="absolute inset-0 pointer-events-none z-10 font-mono">
      {/* Top row */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-3">
        <div className="flex flex-col gap-1">
          <div className={`flex items-center gap-1.5 text-xs font-bold tracking-widest ${recording ? 'text-red-500' : 'text-zinc-600'}`}>
            <span className={`w-2 h-2 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
            <span>{recording ? 'REC' : 'PAUSE'}</span>
          </div>
          <div className="text-[9px] text-zinc-600 tracking-widest">SP ● HI-FI</div>
        </div>

        <div className="text-right">
          <div className="text-yellow-300 text-xs tracking-widest tabular-nums" style={{ textShadow: '0 0 6px rgba(255,220,0,0.5)' }}>
            {recording
              ? `${formatTimecode(duration)};${frameStr}`
              : '00:00:00;00'}
          </div>
          <div className="text-[9px] text-yellow-600 tracking-widest mt-0.5">T-120</div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end p-3">
        <div className="text-[9px] text-zinc-700 tracking-widest">CH 3 ■ AUX</div>
        <div className="text-[9px] text-zinc-700 tracking-widest">▰▰▰▰▱ BATT</div>
      </div>
    </div>
  )
}
