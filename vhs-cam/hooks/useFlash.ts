'use client'
import { useState, useCallback } from 'react'

export type FlashMode = 'off' | 'on' | 'auto'

export function useFlash(streamRef: React.RefObject<MediaStream | null>) {
  const [flashMode, setFlashMode]   = useState<FlashMode>('off')
  const [torchActive, setTorchActive] = useState(false)
  const [supported, setSupported]   = useState(true)

  const applyTorch = useCallback(async (active: boolean) => {
    const stream = streamRef.current
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (!track) return
    try {
      const caps = track.getCapabilities() as any
      if (!caps?.torch) { setSupported(false); return }
      await track.applyConstraints({ advanced: [{ torch: active } as any] })
      setTorchActive(active)
    } catch (e) {
      console.warn('Torch not supported:', e)
      setSupported(false)
    }
  }, [streamRef])

  const cycleFlash = useCallback(() => {
    setFlashMode(prev => {
      if (prev === 'off')  return 'on'
      if (prev === 'on')   return 'auto'
      return 'off'
    })
  }, [])

  const startTorch  = useCallback(() => applyTorch(true),  [applyTorch])
  const stopTorch   = useCallback(() => applyTorch(false), [applyTorch])

  const photoFlash = useCallback(async () => {
    if (flashMode === 'off') return
    await applyTorch(true)
    await new Promise(r => setTimeout(r, 150))
    await applyTorch(false)
  }, [flashMode, applyTorch])

  return { flashMode, torchActive, supported, cycleFlash, startTorch, stopTorch, photoFlash }
}