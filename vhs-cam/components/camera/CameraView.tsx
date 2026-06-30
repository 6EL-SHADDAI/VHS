'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { useRecorder } from '@/hooks/useRecorder'
import { useVHSRenderer } from '@/hooks/useVHSRenderer'
import { useFlash } from '@/hooks/useFlash'
import { useZoom } from '@/hooks/useZoom'
import { capturePhoto, saveVideoCapture } from '@/lib/capture'
import { FILTER_PRESETS, FILTER_LABELS } from '@/lib/filters/presets'
import { VHSViewfinder } from './VHSViewfinder'
import { VHSControls } from './VHSControls'
import { FilterStrip } from './FilterStrip'
import { NoSignal } from './NoSignal'
import { GalleryOverlay } from '../gallery/GalleryOverlay'
import type { FilterMode, FilterParams } from '@/types'

export function CameraView() {
  const viewfinderRef = useRef<HTMLDivElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)

  const { videoRef, audioRef, streamRef, status, error, hasAudio, start, flip } = useCamera()
  const recorder = useRecorder(canvasRef, audioRef)
  const flash    = useFlash(streamRef)
  const zoom     = useZoom(streamRef)

  const [filter, setFilter]           = useState<FilterMode>('vhs')
  const [params, setParams]           = useState<FilterParams>(FILTER_PRESETS['vhs'])
  const [toast, setToast]             = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cameraReady = status === 'ready'

  const { forceReinit } = useVHSRenderer(canvasRef, videoRef, filter, params, cameraReady)

  useEffect(() => {
    if (!viewfinderRef.current) return
    const cleanup = zoom.attachPinch(viewfinderRef.current)
    return cleanup
  }, [zoom.attachPinch]) // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((msg: string, duration = 2500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), duration)
  }, [])

  useEffect(() => {
    start('environment')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = useCallback((f: FilterMode) => {
    setFilter(f)
    setParams(FILTER_PRESETS[f])
  }, [])

  const handleRecord = useCallback(async () => {
    if (recorder.status === 'recording') {
      await flash.stopTorch()
      const { chunks, mimeType } = await recorder.stop()

      // captureStream() can leave the canvas's WebGL context in a corrupted
      // state on mobile browsers. Force a full context recreation right now
      // rather than waiting for the render loop to detect failed frames.
      forceReinit()

      // Also verify the camera track itself survived recording — some
      // mobile browsers kill the underlying track when MediaRecorder
      // finishes. If it's dead, restart the camera immediately rather
      // than leaving the viewfinder frozen on the last frame.
      const liveTrack = streamRef.current?.getVideoTracks()[0]
      if (!liveTrack || liveTrack.readyState === 'ended') {
        console.warn('[VHS] Camera track died after recording — auto-restarting')
        start()
      }

      if (chunks.length === 0) {
        showToast('NO DATA — use Chrome or Edge')
        return
      }
      if (!canvasRef.current) return

      setSaving(true)
      showToast('SAVING...', 15000)

      try {
        await saveVideoCapture(chunks, mimeType, canvasRef.current, filter, params)
        showToast('VIDEO SAVED ✓')
      } catch (e) {
        console.error('Save failed:', e)
        showToast('SAVE FAILED')
      } finally {
        setSaving(false)
        const video  = videoRef.current
        const stream = streamRef.current
        if (video && stream) {
          if (video.srcObject !== stream) video.srcObject = stream
          if (video.paused) video.play().catch(() => {})
        }
      }
    } else {
      try {
        await recorder.start()
        if (flash.flashMode === 'on') await flash.startTorch()
        showToast(hasAudio ? '● REC + AUDIO' : '● REC (no mic)')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Recording failed'
        showToast('ERR: ' + msg.slice(0, 40))
      }
    }
  }, [recorder, flash, canvasRef, filter, params, hasAudio, showToast, videoRef, streamRef, forceReinit, start])

  const handlePhoto = useCallback(async () => {
    if (!canvasRef.current) return
    try {
      await flash.photoFlash()
      await capturePhoto(canvasRef.current, filter, params)
      showToast('PHOTO SAVED ✓')
    } catch (e) {
      console.error('Photo failed:', e)
      showToast('PHOTO FAILED')
    }
  }, [canvasRef, filter, params, flash, showToast])

  const handleParamChange = useCallback((key: keyof FilterParams, value: number) => {
    setParams(p => ({ ...p, [key]: value }))
  }, [])

  return (
    <div className="relative w-full flex flex-col bg-black overflow-hidden" style={{ height: '100dvh' }}>
      <video ref={videoRef} className="hidden" playsInline muted />

      <div ref={viewfinderRef} className="relative flex-1 overflow-hidden bg-black min-h-0">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

        {cameraReady && (
          <VHSViewfinder
            recording={recorder.status === 'recording'}
            duration={recorder.duration}
            filter={filter}
            hasAudio={hasAudio}
            torchActive={flash.torchActive}
          />
        )}

        {!cameraReady && (
          <NoSignal status={status} error={error} onEnable={() => start('environment')} />
        )}

        {zoom.supported && zoom.zoom > zoom.minZoom + 0.05 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 border border-zinc-700 text-yellow-300 text-xs tracking-widest px-3 py-1 rounded-full font-mono pointer-events-none">
            {zoom.zoom.toFixed(1)}×
          </div>
        )}

        {saving && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 pointer-events-none">
            <div className="bg-black/90 border border-zinc-700 rounded-xl px-6 py-4 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-yellow-300 text-xs tracking-widest font-mono">SAVING...</span>
            </div>
          </div>
        )}

        {toast && !saving && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/90 border border-zinc-700 text-yellow-300 text-xs tracking-widest px-4 py-2 rounded-lg z-50 pointer-events-none whitespace-nowrap font-mono">
            {toast}
          </div>
        )}
      </div>

      <FilterStrip current={filter} onChange={handleFilterChange} labels={FILTER_LABELS} />

      <VHSControls
        params={params}
        onParamChange={handleParamChange}
        onRecord={handleRecord}
        onPhoto={handlePhoto}
        onFlip={flip}
        onFlashCycle={flash.cycleFlash}
        onGallery={() => setShowGallery(true)}
        recording={recorder.status === 'recording'}
        cameraReady={cameraReady && !saving}
        filter={filter}
        hasAudio={hasAudio}
        flashMode={flash.flashMode}
        flashSupported={flash.supported}
      />

      <GalleryOverlay
        visible={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </div>
  )
}