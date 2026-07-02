'use client'
import { useState, useRef, useCallback } from 'react'
import { getBestMimeType } from '@/lib/capture'
import { createTapeAudioStream, type TapeAudioResult } from '@/lib/audio/tapeAudio'

export type RecorderStatus = 'idle' | 'recording'

export function useRecorder(
  canvas: React.RefObject<HTMLCanvasElement | null>,
  audioRef: React.RefObject<MediaStream | null>
) {
  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const tapeAudioRef = useRef<TapeAudioResult | null>(null)
  const [status, setStatus]           = useState<RecorderStatus>('idle')
  const [duration, setDuration]       = useState(0)
  const [recordError, setRecordError] = useState<string | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(async (): Promise<void> => {
    setRecordError(null)
    const el = canvas.current
    if (!el) throw new Error('Canvas not ready')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const captureStream = (el as any).captureStream ?? (el as any).mozCaptureStream
    if (!captureStream) throw new Error('captureStream not supported in this browser')

    let canvasStream: MediaStream
    try {
      canvasStream = captureStream.call(el, 30) as MediaStream
    } catch (e) {
      throw new Error('Failed to capture canvas stream: ' + (e instanceof Error ? e.message : e))
    }

    if (!canvasStream || canvasStream.getVideoTracks().length === 0) {
      throw new Error('Canvas stream has no video tracks')
    }

    const combined = new MediaStream()
    canvasStream.getVideoTracks().forEach(t => combined.addTrack(t))

    // Route the mic through the tape-hiss/motor-hum mixer when possible.
    // Any failure here falls back to the raw mic track so a Web Audio
    // quirk never breaks recording itself.
    if (audioRef.current) {
      try {
        const tapeAudio = createTapeAudioStream(audioRef.current)
        if (tapeAudio) {
          tapeAudioRef.current = tapeAudio
          tapeAudio.stream.getAudioTracks().forEach(t => combined.addTrack(t))
        } else {
          audioRef.current.getAudioTracks().forEach(t => combined.addTrack(t))
        }
      } catch (e) {
        console.warn('[VHS] Tape audio mixer failed, using raw mic:', e)
        audioRef.current.getAudioTracks().forEach(t => combined.addTrack(t))
      }
    }

    const mimeType = getBestMimeType()
    chunksRef.current = []

    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(combined, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 128_000,
      })
    } catch {
      recorder = new MediaRecorder(combined)
    }

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onerror = (e) => {
      console.error('MediaRecorder error:', e)
      setRecordError('Recording error')
    }

    recorder.start(100)
    recorderRef.current = recorder
    setStatus('recording')
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [canvas, audioRef])

  const stop = useCallback((): Promise<{ chunks: Blob[]; mimeType: string }> => {
    return new Promise(resolve => {
      const recorder = recorderRef.current
      const finish = (result: { chunks: Blob[]; mimeType: string }) => {
        tapeAudioRef.current?.dispose()
        tapeAudioRef.current = null
        resolve(result)
      }

      if (!recorder) {
        finish({ chunks: chunksRef.current, mimeType: 'video/webm' })
        return
      }
      const mimeType = recorder.mimeType || 'video/webm'
      recorder.onstop = () => finish({ chunks: chunksRef.current, mimeType })
      try { recorder.stop() } catch (e) {
        console.error('Error stopping recorder:', e)
        finish({ chunks: chunksRef.current, mimeType })
      }
      recorderRef.current = null
      setStatus('idle')
      setDuration(0)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    })
  }, [])

  return { status, duration, recordError, start, stop }
}