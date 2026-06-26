'use client'
import { useRef, useEffect, useCallback } from 'react'
import { initGL, resizeGL, renderFrame, GLState } from '@/lib/camera/webgl'
import type { FilterMode, FilterParams } from '@/types'

const MODE_MAP: Record<FilterMode, number> = {
  'vhs':        0,
  'vhs-c':      1,
  'glitch':     2,
  'night':      3,
  'film':       0,
  'disposable': 0,
  'polaroid':   0,
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
    if (!active || !glStateRef.current) return
    const loop = () => {
      const video = videoRef.current
      const state = glStateRef.current
      if (video && state && video.readyState >= 2) {
        renderFrame(state, video, {
          time:     (Date.now() - startTime.current) / 1000,
          glitch:   params.glitch,
          noise:    params.noise,
          blur:     params.blur,
          warmth:   params.warmth,
          contrast: params.contrast,
          vignette: params.vignette,
          bloom:    params.bloom,
          mode:     MODE_MAP[filter] ?? 0,
        })
      }
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [active, filter, params, videoRef])
}