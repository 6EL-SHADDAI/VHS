'use client'
import { useRef, useEffect, useCallback } from 'react'
import { initGL, resizeGL, renderFrame, GLState } from '@/lib/camera/webgl'
import type { FilterMode, FilterParams } from '@/types'

const MODE_MAP: Record<FilterMode, number> = {
  'vhs': 0, 'vhs-c': 1, 'glitch': 2, 'night': 3,
  'film': 0, 'disposable': 0, 'polaroid': 0,
}

export function useVHSRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef:  React.RefObject<HTMLVideoElement | null>,
  filter:    FilterMode,
  params:    FilterParams,
  active:    boolean
) {
  const glStateRef = useRef<GLState | null>(null)
  const animRef    = useRef<number>(0)
  const startTime  = useRef(Date.now())
  const paramsRef  = useRef(params)
  const filterRef  = useRef(filter)

  useEffect(() => { paramsRef.current = params }, [params])
  useEffect(() => { filterRef.current = filter }, [filter])

  const initRenderer = useCallback(() => {
    if (!canvasRef.current) return
    try {
      glStateRef.current = initGL(canvasRef.current)
      resizeGL(glStateRef.current.gl, canvasRef.current)
    } catch (e) {
      console.error('WebGL init failed:', e)
    }
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    initRenderer()
    const onResize = () => {
      if (glStateRef.current) resizeGL(glStateRef.current.gl, canvas)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [canvasRef, initRenderer])

  useEffect(() => {
    if (!active) return

    if (!glStateRef.current && canvasRef.current) initRenderer()

    let running = true

    const loop = () => {
      if (!running) return
      const video = videoRef.current
      const state = glStateRef.current
      if (video && state && video.readyState >= 2) {
        if (video.paused) video.play().catch(() => {})
        const p = paramsRef.current
        renderFrame(state, video, {
          time:     (Date.now() - startTime.current) / 1000,
          glitch:   p.glitch,
          noise:    p.noise,
          blur:     p.blur,
          warmth:   p.warmth,
          contrast: p.contrast,
          vignette: p.vignette,
          bloom:    p.bloom,
          mode:     MODE_MAP[filterRef.current] ?? 0,
        })
      }
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    const onVisible = () => {
      if (document.visibilityState === 'visible' && running) {
        cancelAnimationFrame(animRef.current)
        animRef.current = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active, canvasRef, videoRef, initRenderer])
}