'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'error'

export function useCamera() {
  const videoRef   = useRef<HTMLVideoElement | null>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const audioRef   = useRef<MediaStream | null>(null)
  const facingRef  = useRef<'user' | 'environment'>('environment')
  const [status, setStatus]      = useState<CameraStatus>('idle')
  const [error, setError]        = useState<string | null>(null)
  const [facing, setFacingState] = useState<'user' | 'environment'>('environment')
  const [hasAudio, setHasAudio]  = useState(false)

  const start = useCallback(async (facingMode: 'user' | 'environment' = facingRef.current) => {
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

      const track = videoStream.getVideoTracks()[0]
      if (track) {
        track.onended = () => {
          console.warn('[VHS] Video track ended unexpectedly — restarting camera')
          setStatus('idle')
          start(facingRef.current)
        }
      }

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

      facingRef.current = facingMode
      setFacingState(facingMode)
      setStatus('ready')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Camera error'
      setError(msg)
      setStatus('error')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const flip = useCallback(() => {
    start(facingRef.current === 'user' ? 'environment' : 'user')
  }, [start])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    audioRef.current  = null
    setStatus('idle')
    setHasAudio(false)
  }, [])

  useEffect(() => {
    if (status !== 'ready') return

    const interval = setInterval(() => {
      const track = streamRef.current?.getVideoTracks()[0]
      const video = videoRef.current

      if (!track || track.readyState === 'ended') {
        console.warn('[VHS] Health check: track is dead — restarting')
        start(facingRef.current)
        return
      }

      if (video && video.readyState < 2 && document.visibilityState === 'visible') {
        console.warn('[VHS] Health check: video not ready — re-attaching stream')
        if (streamRef.current) {
          video.srcObject = streamRef.current
          video.play().catch(() => {})
        }
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [status, start])

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState === 'visible') {
        const video  = videoRef.current
        const stream = streamRef.current
        const track  = stream?.getVideoTracks()[0]

        if (track && track.readyState === 'ended') {
          start(facingRef.current)
          return
        }

        if (video && stream && status === 'ready') {
          if (video.paused || video.srcObject !== stream) {
            video.srcObject = stream
            try { await video.play() } catch {}
          }
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [status, start])

  useEffect(() => () => { stop() }, [stop])

  return { videoRef, audioRef, streamRef, status, error, facing, hasAudio, start, flip, stop }
}