'use client'
import { useRef, useEffect, useCallback } from 'react'
import { initGL, resizeGL, renderFrame, GLState } from '@/lib/camera/webgl'
import type { FilterMode, FilterParams } from '@/types'

const MODE_MAP: Record<FilterMode, number> = {
  'vhs': 0,
  'vhs-c': 1,
  'glitch': 2,
  'night': 3,
  'disposable': 4,
  'film': 0,
  'polaroid': 0,
}

export function useVHSRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  filter: FilterMode,
  params: FilterParams,
  active: boolean
) {
  const glStateRef = useRef<GLState | null>(null)
  const animRef = useRef<number>(0)
  const startTime = useRef(Date.now())
  const paramsRef = useRef(params)
  const filterRef = useRef(filter)
  const failCountRef = useRef(0)
  const reinitInFlight = useRef(false)
  const lastLogRef = useRef(0)

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  useEffect(() => {
    filterRef.current = filter
  }, [filter])

  const forceReinit = useCallback(() => {
    if (reinitInFlight.current) return
    reinitInFlight.current = true

    const canvas = canvasRef.current
    if (!canvas) {
      reinitInFlight.current = false
      return
    }

    try {
      const old = glStateRef.current?.gl
      if (old) {
        const ext = old.getExtension('WEBGL_lose_context')
        ext?.loseContext()
      }
    } catch {}

    glStateRef.current = null
    failCountRef.current = 0

    requestAnimationFrame(() => {
      try {
        glStateRef.current = initGL(canvas, () => {
          forceReinit()
        })
        resizeGL(glStateRef.current.gl, canvas)
      } catch (e) {
        console.error('[VHS] forceReinit failed:', e)
      }
      reinitInFlight.current = false
    })
  }, [canvasRef])

  const initRenderer = useCallback(() => {
    if (!canvasRef.current) return

    try {
      glStateRef.current = initGL(canvasRef.current, () => forceReinit())
      resizeGL(glStateRef.current.gl, canvasRef.current)
    } catch (e) {
      console.error('WebGL init failed:', e)
    }
  }, [canvasRef, forceReinit])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    initRenderer()

    const onResize = () => {
      if (glStateRef.current) {
        resizeGL(glStateRef.current.gl, canvas)
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [canvasRef, initRenderer])

  useEffect(() => {
    if (!active) return

    if (!glStateRef.current && canvasRef.current) {
      initRenderer()
    }

    let running = true

    const loop = () => {
      if (!running) return

      const video = videoRef.current
      const state = glStateRef.current

      // Log once per second for debugging
      if (video && Date.now() - lastLogRef.current > 1000) {
        lastLogRef.current = Date.now()

        console.log('[VIDEO STATE]', {
          readyState: video.readyState,
          paused: video.paused,
          srcObject: !!video.srcObject,
        })
      }

      if (video && state && video.readyState >= 2) {
        if (video.paused) {
          video.play().catch(() => {})
        }

        const p = paramsRef.current

        const ok = renderFrame(state, video, {
          time: (Date.now() - startTime.current) / 1000,
          glitch: p.glitch,
          noise: p.noise,
          blur: p.blur,
          warmth: p.warmth,
          contrast: p.contrast,
          vignette: p.vignette,
          bloom: p.bloom,
          mode: MODE_MAP[filterRef.current] ?? 0,
        })

        if (!ok) {
          failCountRef.current += 1
          if (failCountRef.current >= 3) {
            forceReinit()
          }
        } else {
          failCountRef.current = 0
        }
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
  }, [active, canvasRef, videoRef, initRenderer, forceReinit])

  return { forceReinit }
}