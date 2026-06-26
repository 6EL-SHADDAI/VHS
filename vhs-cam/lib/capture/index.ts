import { saveCapture } from '@/lib/db/gallery'
import type { CaptureItem, FilterMode, FilterParams } from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

async function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      type,
      quality
    )
  })
}

async function makeThumbnail(canvas: HTMLCanvasElement): Promise<string> {
  const thumb = document.createElement('canvas')
  thumb.width  = 160
  thumb.height = Math.round(160 * canvas.height / canvas.width)
  const ctx = thumb.getContext('2d')!
  ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height)
  return thumb.toDataURL('image/jpeg', 0.7)
}

export async function capturePhoto(
  canvas: HTMLCanvasElement,
  filter: FilterMode,
  params: FilterParams
): Promise<void> {
  const [blob, thumbnail] = await Promise.all([
    canvasToBlob(canvas),
    makeThumbnail(canvas),
  ])
  const item: CaptureItem = {
    id: generateId(),
    type: 'photo',
    blob,
    thumbnail,
    filter,
    params,
    createdAt: Date.now(),
  }
  await saveCapture(item)
  downloadBlob(blob, `VHS_${timestamp()}.jpg`)
}

export async function saveVideoCapture(
  chunks: Blob[],
  mimeType: string,
  canvas: HTMLCanvasElement,
  filter: FilterMode,
  params: FilterParams
): Promise<void> {
  const blob      = new Blob(chunks, { type: mimeType })
  const thumbnail = await makeThumbnail(canvas)
  const item: CaptureItem = {
    id: generateId(),
    type: 'video',
    blob,
    thumbnail,
    filter,
    params,
    createdAt: Date.now(),
  }
  await saveCapture(item)
  downloadBlob(blob, `VHS_${timestamp()}.webm`)
}

export function getBestMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
}
