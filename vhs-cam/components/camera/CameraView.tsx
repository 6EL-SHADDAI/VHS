'use client'
import { useRef, useState, useCallback } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { useRecorder } from '@/hooks/useRecorder'
import { useVHSRenderer } from '@/hooks/useVHSRenderer'
import { capturePhoto, saveVideoCapture } from '@/lib/capture'
import { FILTER_PRESETS, FILTER_LABELS } from '@/lib/filters/presets'
import { VHSViewfinder } from './VHSViewfinder'
import { VHSControls } from './VHSControls'
import { FilterStrip } from './FilterStrip'
import { NoSignal } from './NoSignal'
import type { FilterMode, FilterParams } from '@/types'

export function CameraView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { videoRef, status, error, facing, start, flip } = useCamera()
  const recorder = useRecorder(canvasRef)

  const [filter, setFilter] = useState<FilterMode>('vhs')
  const [params, setParams] = useState<FilterParams>(FILTER_PRESETS['vhs'])
  const [toast, setToast]   = useState<string | null>(null)

  const cameraReady = status === 'ready'

  useVHSRenderer(canvasRef, videoRef, filter, params, cameraReady)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

  const handleFilterChange = (f: FilterMode) => {
    setFilter(f)
    setParams(FILTER_PRESETS[f])
  }

  const handleRecord = async () => {
    if (recorder.status === 'recording') {
      showToast('SAVING...')
      const { chunks, mimeType } = await recorder.stop()
      if (chunks.length === 0) {
        showToast('NO DATA — try Chrome/Edge')
        return
      }
      if (canvasRef.current) {
        await saveVideoCapture(chunks, mimeType, canvasRef.current, filter, params)
        showToast('VIDEO SAVED ✓')
      }
    } else {
      try {
        await recorder.start()
        showToast('● REC')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Recording failed'
        showToast('ERR: ' + msg.slice(0, 40))
        console.error('Record start error:', e)
      }
    }
  }

  const handlePhoto = async () => {
    if (!canvasRef.current) return
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
          <VHSViewfinder recording={recorder.status === 'recording'} duration={recorder.duration} filter={filter} />
        )}
        {!cameraReady && (
          <NoSignal status={status} error={error} onEnable={() => start('environment')} />
        )}
        {toast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/80 border border-zinc-700 text-yellow-300 text-xs tracking-widest px-4 py-2 rounded z-50 pointer-events-none">
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
        recording={recorder.status === 'recording'}
        cameraReady={cameraReady}
        filter={filter}
      />
    </div>
  )
}