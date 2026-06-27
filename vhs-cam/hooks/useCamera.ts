'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'error'

export function useCamera() {
  const videoRef   = useRef<HTMLVideoElement | null>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const audioRef   = useRef<MediaStream | null>(null)
  const [status, setStatus]      = useState<CameraStatus>('idle')
  const [error, setError]        = useState<string | null>(null)
  const [facing, setFacingState] = useState<'user' | 'environment'>('environment')
  const [hasAudio, setHasAudio]  = useState(false)

  const start = useCallback(async (facingMode: 'user' | 'environment' = facing) => {
    setStatus('requesting')
    setError(null)
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioRef.current?.getTracks().forEach(t => t.stop())

      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = videoStream

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        audioRef.current = audioStream
        setHasAudio(true)
      } catch {
        audioRef.current = null
        setHasAudio(false)
      }

      if (videoRef.current) {
        videoRef.current.srcObject = videoStream
        videoRef.current.playsInline = true
        videoRef.current.muted = true
        await videoRef.current.play()
      }

      setFacingState(facingMode)
      setStatus('ready')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Camera error'
      setError(msg)
      setStatus('error')
    }
  }, [facing])

  const flip = useCallback(() => {
    start(facing === 'user' ? 'environment' : 'user')
  }, [facing, start])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    audioRef.current  = null
    setStatus('idle')
    setHasAudio(false)
  }, [])

  useEffect(() => () => { stop() }, [stop])

  return { videoRef, audioRef, streamRef, status, error, facing, hasAudio, start, flip, stop }
}