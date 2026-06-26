'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'error'

export function useCamera() {
  const videoRef           = useRef<HTMLVideoElement | null>(null)
  const streamRef          = useRef<MediaStream | null>(null)
  const [status, setStatus]   = useState<CameraStatus>('idle')
  const [error, setError]     = useState<string | null>(null)
  const [facing, setFacingState] = useState<'user' | 'environment'>('environment')

  const start = useCallback(async (facingMode: 'user' | 'environment' = facing) => {
    setStatus('requesting')
    setError(null)
    try {
      // Stop existing stream
      streamRef.current?.getTracks().forEach(t => t.stop())

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width:  { ideal: 1280 },
          height: { ideal: 720  },
        },
        audio: false,
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
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
    const next = facing === 'user' ? 'environment' : 'user'
    start(next)
  }, [facing, start])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStatus('idle')
  }, [])

  useEffect(() => () => { stop() }, [stop])

  return { videoRef, status, error, facing, start, flip, stop }
}
