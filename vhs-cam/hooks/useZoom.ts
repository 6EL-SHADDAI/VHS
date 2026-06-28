'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export function useZoom(streamRef: React.RefObject<MediaStream | null>) {
  const [zoom, setZoom]           = useState(1)
  const [maxZoom, setMaxZoom]     = useState(5)
  const [minZoom, setMinZoom]     = useState(1)
  const [supported, setSupported] = useState(false)
  const zoomRef = useRef(1)

  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caps = track.getCapabilities() as any
    if (caps?.zoom) {
      setSupported(true)
      setMinZoom(caps.zoom.min ?? 1)
      setMaxZoom(caps.zoom.max ?? 5)
      setZoom(caps.zoom.min ?? 1)
      zoomRef.current = caps.zoom.min ?? 1
    } else {
      setSupported(false)
    }
  }, [streamRef.current]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyZoom = useCallback(async (val: number) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const clamped = Math.min(Math.max(val, minZoom), maxZoom)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [{ zoom: clamped } as any] })
      setZoom(clamped)
      zoomRef.current = clamped
    } catch (e) {
      console.warn('Zoom apply failed:', e)
    }
  }, [streamRef, minZoom, maxZoom])

  const attachPinch = useCallback((el: HTMLElement | null) => {
    if (!el) return

    let startDist = 0
    let startZoom = 1

    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = dist(e.touches)
        startZoom = zoomRef.current
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const scale   = dist(e.touches) / startDist
        applyZoom(startZoom * scale)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
    }
  }, [applyZoom])

  return { zoom, minZoom, maxZoom, supported, applyZoom, attachPinch }
}