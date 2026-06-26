'use client'
import { useState, useRef, useCallback } from 'react'
import { getBestMimeType } from '@/lib/capture'

export type RecorderStatus = 'idle' | 'recording'

export function useRecorder(canvas: React.RefObject<HTMLCanvasElement | null>) {
  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const [status, setStatus]   = useState<RecorderStatus>('idle')
  const [duration, setDuration] = useState(0)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(async (): Promise<void> => {
    if (!canvas.current) throw new Error('No canvas')
    const stream   = canvas.current.captureStream(30)
    const mimeType = getBestMimeType()
    chunksRef.current = []

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    })
    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.start(100)
    recorderRef.current = recorder
    setStatus('recording')
    setDuration(0)

    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [canvas])

  const stop = useCallback((): Promise<{ chunks: Blob[]; mimeType: string }> => {
    return new Promise(resolve => {
      const recorder = recorderRef.current
      if (!recorder) return resolve({ chunks: [], mimeType: 'video/webm' })
      const mimeType = recorder.mimeType

      recorder.onstop = () => {
        resolve({ chunks: chunksRef.current, mimeType })
      }
      recorder.stop()
      recorderRef.current = null
      setStatus('idle')
      setDuration(0)
      if (timerRef.current) clearInterval(timerRef.current)
    })
  }, [])

  return { status, duration, start, stop }
}
