'use client'
import { useRef, useState, useCallback } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { useRecorder } from '@/hooks/useRecorder'
import { useVHSRenderer } from '@/hooks/useVHSRenderer'
import { useFlash } from '@/hooks/useFlash'
import { capturePhoto, saveVideoCapture } from '@/lib/capture'
import { FILTER_PRESETS, FILTER_LABELS } from '@/lib/filters/presets'
import { VHSViewfinder } from './VHSViewfinder'
import { VHSControls } from './VHSControls'
import { FilterStrip } from './FilterStrip'
import { NoSignal } from './NoSignal'
import type { FilterMode, FilterParams } from '@/types'

export function CameraView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { videoRef, audioRef, streamRef, status, error, hasAudio, start, flip } = useCamera()
  const recorder = useRecorder(canvasRef, audioRef)
  const flash    = useFlash(streamRef)

  const [filter, setFilter] = useState<FilterMode>('vhs')
  const [params, setParams] = useState<FilterParams>(FILTER_PRESETS['vhs'])
  const [toast, setToast]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const cameraReady = status === 'ready'
  useVHSRenderer(canvasRef, videoRef, filter, params, cameraReady)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const handleFilterChange = (f: FilterMode) => {
    setFilter(f)
    setParams(FILTER_PRESETS[f])
  }

  const handleRecord = async () => {
    if (recorder.status === 'recording') {
      await flash.stopTorch()
      const { chunks, mimeType } = await recorder.stop()

      if (chunks.length === 0) {
        showToast('NO DATA — use Chrome or Edge')
        return
      }
      if (!canvasRef.current) return

      setSaving(true)
      showToast('SAVING...')

      try {
        await saveVideoCapture(chunks, mimeType, canvasRef.current, filter, params)
        showToast('VIDEO SAVED ✓')
      } catch (e) {
        console.error('Save failed:', e)
        showToast('SAVE FAILED')
      } finally {
        setSaving(false)
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
  }

  const handlePhoto = async () => {
    if (!canvasRef.current) return
    await flash.photoFlash()
    await capturePhoto(canvasRef.current, filter, params)
    showToast('PHOTO SAVED ✓')
  }

  const handleParamChange = (key: keyof FilterParams, value: number) => {
    setParams(p => ({ ...p, [key]: value }))
  }

  return (
    <div className="relative w-full h-screen flex flex-col bg-black overflow-hidden">
      <video ref={videoRef} className="hidden" playsInline muted />

      <div className="relative flex-1 overflow-hidden bg-black">
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

        {toast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/85 border border-zinc-700 text-yellow-300 text-xs tracking-widest px-4 py-2 rounded z-50 pointer-events-none whitespace-nowrap">
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
        recording={recorder.status === 'recording'}
        cameraReady={cameraReady && !saving}
        filter={filter}
        hasAudio={hasAudio}
        flashMode={flash.flashMode}
        flashSupported={flash.supported}
      />
    </div>
  )
}