'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'error'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<MediaStream | null>(null)
  const facingRef = useRef<'user' | 'environment'>('environment')

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacingState] =
    useState<'user' | 'environment'>('environment')
  const [hasAudio, setHasAudio] = useState(false)

  // Prevent multiple simultaneous starts
  const startingRef = useRef(false)

  const start = useCallback(async (
    facingMode: 'user' | 'environment' = facingRef.current
  ) => {
    if (startingRef.current) {
      console.log('[CAMERA] Start already in progress')
      return
    }

    startingRef.current = true

    setStatus('requesting')
    setError(null)

    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioRef.current?.getTracks().forEach(t => t.stop())

      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = videoStream
      console.log('[CAMERA] Got stream', videoStream.id)
console.log(
  '[CAMERA] Track state',
  videoStream.getVideoTracks()[0]?.readyState
)

      const track = videoStream.getVideoTracks()[0]
      if (track) {
        track.onended = () => {
          if (startingRef.current) return

          console.warn(
            '[VHS] Video track ended unexpectedly — restarting camera'
          )

          setStatus('idle')

          setTimeout(() => {
            start(facingRef.current)
          }, 0)
        }
      }

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })
        audioRef.current = audioStream
        setHasAudio(true)
      } catch {
        audioRef.current = null
        setHasAudio(false)
      }

      if (videoRef.current) {
  const video = videoRef.current

  video.pause()
  video.srcObject = null

  // Give the browser one frame to detach the old stream
  await new Promise(resolve => requestAnimationFrame(resolve))

  video.srcObject = videoStream
  video.playsInline = true
  video.muted = true

  console.log('[CAMERA] Attached stream', videoStream.id)

  try {
    await video.play()
    console.log('[CAMERA] Video playing', {
      readyState: video.readyState,
      paused: video.paused,
    })
  } catch (e) {
    console.error('[CAMERA] video.play failed', e)
  }
}

      facingRef.current = facingMode
      setFacingState(facingMode)
      setStatus('ready')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Camera error'
      setError(msg)
      setStatus('error')
    } finally {
      startingRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const flip = useCallback(() => {
    start(facingRef.current === 'user' ? 'environment' : 'user')
  }, [start])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    audioRef.current = null
    setStatus('idle')
    setHasAudio(false)
  }, [])

  useEffect(() => {
    if (status !== 'ready') return

    const interval = setInterval(() => {
      const track = streamRef.current?.getVideoTracks()[0]
      const video = videoRef.current

      if (
        !startingRef.current &&
        (!track || track.readyState === 'ended')
      ) {
        console.warn('[VHS] Health check: track is dead — restarting')
        start(facingRef.current)
        return
      }

      if (
        video &&
        video.readyState < 2 &&
        document.visibilityState === 'visible'
      ) {
        console.warn(
          '[VHS] Health check: video not ready — re-attaching stream'
        )

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
        const video = videoRef.current
        const stream = streamRef.current
        const track = stream?.getVideoTracks()[0]

        if (
          !startingRef.current &&
          track &&
          track.readyState === 'ended'
        ) {
          start(facingRef.current)
          return
        }

        if (video && stream && status === 'ready') {
          if (video.paused || video.srcObject !== stream) {
            video.srcObject = stream
            try {
              await video.play()
            } catch {}
          }
        }
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () =>
      document.removeEventListener('visibilitychange', onVisible)
  }, [status, start])

  useEffect(() => () => {
    stop()
  }, [stop])

  return {
    videoRef,
    audioRef,
    streamRef,
    status,
    error,
    facing,
    hasAudio,
    start,
    flip,
    stop,
  }
}