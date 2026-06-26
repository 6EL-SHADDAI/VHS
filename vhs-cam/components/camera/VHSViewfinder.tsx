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
  const [frame, setFrame]     = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setFrame(f => (f + 1) % 30), 33)
    return () => clearInterval(id)
  }, [recording])

  useEffect(() => {
    if (!recording) { setVisible(true); return }
    const id = setInterval(() => setVisible(v => !v), 700)
    return () => clearInterval(id)
  }, [recording])

  const frameStr = String(frame).padStart(2, '0')

  return (
    <div className="absolute inset-0 pointer-events-none z-10 font-mono select-none">

      <div className="absolute top-3 left-3 flex flex-col gap-1">
        <div className={`flex items-center gap-2 transition-opacity ${recording && !visible ? 'opacity-0' : 'opacity-100'}`}>
          <span className={`w-3 h-3 rounded-full ${recording ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'bg-zinc-600'}`} />
          <span
            className={`text-sm font-bold tracking-widest ${recording ? 'text-red-400' : 'text-zinc-600'}`}
            style={recording ? { textShadow: '0 0 8px rgba(239,68,68,0.6)' } : undefined}
          >
            {recording ? 'REC' : 'STBY'}
          </span>
        </div>
        <div className="text-[9px] text-zinc-600 tracking-widest">SP ● HI-FI</div>
      </div>

      <div className="absolute top-3 right-3 text-right">
        <div
          className="text-sm tracking-widest tabular-nums"
          style={{ color: '#e8e000', textShadow: recording ? '0 0 8px rgba(232,224,0,0.6)' : 'none', opacity: recording ? 1 : 0.4 }}
        >
          {recording ? `${formatTimecode(duration)};${frameStr}` : '00:00:00;00'}
        </div>
        <div className="text-[9px] tracking-widest mt-0.5" style={{ color: '#a16207', opacity: 0.7 }}>T-120</div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
        <span className="text-[9px] text-zinc-700 tracking-widest">CH 3 ■ AUX</span>
        <span className="text-[9px] text-zinc-700 tracking-widest">▰▰▰▰▱ BATT</span>
      </div>

      {recording && (
        <div className="absolute top-12 left-0 right-0 flex justify-center">
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(239,68,68,0.4)' }}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-bold tracking-widest">
              {formatTimecode(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}