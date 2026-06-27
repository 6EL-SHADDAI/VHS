import { saveCapture } from '@/lib/db/gallery'
import type { CaptureItem, FilterMode, FilterParams } from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

async function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      type, quality
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
  const [blob, thumbnail] = await Promise.all([canvasToBlob(canvas), makeThumbnail(canvas)])
  const item: CaptureItem = {
    id: generateId(), type: 'photo', blob, thumbnail, filter, params, createdAt: Date.now(),
  }
  await saveCapture(item)
  downloadBlob(blob, `VHS_${timestamp()}.jpg`)
}

export async function saveVideoCapture(
  chunks:    Blob[],
  mimeType:  string,
  canvas:    HTMLCanvasElement,
  filter:    FilterMode,
  params:    FilterParams,
  onStatus?: (msg: string) => void
): Promise<void> {
  const thumbnail = await makeThumbnail(canvas)
  const webmBlob  = new Blob(chunks, { type: mimeType })

  onStatus?.('REMUXING TO MP4...')

  let finalBlob: Blob
  let filename:  string

  try {
    const mp4 = await remuxToMp4(webmBlob, onStatus)
    finalBlob = mp4
    filename  = `VHS_${timestamp()}.mp4`
  } catch (e) {
    console.warn('MP4 remux failed, saving WebM:', e)
    finalBlob = webmBlob
    filename  = `VHS_${timestamp()}.webm`
    onStatus?.('SAVING AS WEBM...')
  }

  const item: CaptureItem = {
    id: generateId(), type: 'video', blob: finalBlob, thumbnail, filter, params, createdAt: Date.now(),
  }
  await saveCapture(item)
  downloadBlob(finalBlob, filename)
}

async function remuxToMp4(webmBlob: Blob, onStatus?: (msg: string) => void): Promise<Blob> {
  if (typeof VideoDecoder === 'undefined' || typeof VideoEncoder === 'undefined') {
    throw new Error('WebCodecs not supported')
  }

  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer')

  const target = new ArrayBufferTarget()
  const muxer  = new Muxer({
    target,
    video: { codec: 'avc', width: 1280, height: 720 },
    fastStart: 'in-memory',
  })

  const url   = URL.createObjectURL(webmBlob)
  const video = document.createElement('video')
  video.src   = url
  video.muted = true

  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res()
    video.onerror = () => rej(new Error('Video load failed'))
    setTimeout(() => rej(new Error('Metadata timeout')), 10000)
  })

  const duration  = video.duration
  const fps       = 30
  const frames    = Math.ceil(duration * fps)
  const offscreen = new OffscreenCanvas(1280, 720)
  const ctx       = offscreen.getContext('2d')!

  onStatus?.('ENCODING FRAMES...')

  const encodedChunks: EncodedVideoChunk[] = []

  const encoder = new VideoEncoder({
    output: (chunk) => { encodedChunks.push(chunk) },
    error:  (e)     => console.error('Encoder error:', e),
  })

  encoder.configure({
    codec:     'avc1.42001f',
    width:     1280,
    height:    720,
    bitrate:   8_000_000,
    framerate: fps,
  })

  for (let i = 0; i < frames; i++) {
    video.currentTime = i / fps
    await new Promise<void>(res => { video.onseeked = () => res() })
    ctx.drawImage(video, 0, 0, 1280, 720)
    const frame = new VideoFrame(offscreen, { timestamp: (i / fps) * 1_000_000 })
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 })
    frame.close()
  }

  await encoder.flush()
  encoder.close()
  URL.revokeObjectURL(url)

  onStatus?.('MUXING MP4...')

  for (const chunk of encodedChunks) {
    muxer.addVideoChunk(chunk, { decoderConfig: { codec: 'avc1.42001f', codedWidth: 1280, codedHeight: 720 } })
  }

  muxer.finalize()
  return new Blob([target.buffer], { type: 'video/mp4' })
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