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
  const { videoRef, audioRef, status, error, hasAudio, start, flip } = useCamera()
  const recorder = useRecorder(canvasRef, audioRef)

  const [filter, setFilter]               = useState<FilterMode>('vhs')
  const [params, setParams]               = useState<FilterParams>(FILTER_PRESETS['vhs'])
  const [toast, setToast]                 = useState<string | null>(null)
  const [transcoding, setTranscoding]     = useState(false)
  const [transcodeProgress, setTranscodeProgress] = useState(0)

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
      showToast('STOPPING...')
      const { chunks, mimeType } = await recorder.stop()
      if (chunks.length === 0) {
        showToast('NO DATA — use Chrome or Edge')
        return
      }
      if (!canvasRef.current) return

      setTranscoding(true)
      setTranscodeProgress(0)

      await saveVideoCapture(
        chunks, mimeType, canvasRef.current, filter, params,
        ({ stage, ratio }) => {
          if (stage === 'transcoding') setTranscodeProgress(Math.round(ratio * 100))
        }
      )

      setTranscoding(false)
      setTranscodeProgress(0)
      showToast('VIDEO SAVED ✓')
    } else {
      try {
        await recorder.start()
        showToast(hasAudio ? '● REC + AUDIO' : '● REC (no mic)')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Recording failed'
        showToast('ERR: ' + msg.slice(0, 40))
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
          <VHSViewfinder
            recording={recorder.status === 'recording'}
            duration={recorder.duration}
            filter={filter}
            hasAudio={hasAudio}
          />
        )}

        {!cameraReady && (
          <NoSignal status={status} error={error} onEnable={() => start('environment')} />
        )}

        {transcoding && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-40">
            <p className="text-yellow-300 text-xs tracking-widest font-mono">CONVERTING TO MP4...</p>
            <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${transcodeProgress}%` }}
              />
            </div>
            <p className="text-zinc-600 text-[10px] tracking-widest font-mono">{transcodeProgress}%</p>
          </div>
        )}

        {toast && !transcoding && (
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
        recording={recorder.status === 'recording'}
        cameraReady={cameraReady && !transcoding}
        filter={filter}
        hasAudio={hasAudio}
      />
    </div>
  )
}