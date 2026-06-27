/* eslint-disable @typescript-eslint/no-explicit-any */
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
let loadPromise: Promise<void> | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg
  if (loadPromise) { await loadPromise; return ffmpeg! }

  ffmpeg = new FFmpeg()
  loadPromise = (async () => {
    await ffmpeg!.load({
      coreURL: await toBlobURL(
        'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.js',
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.wasm',
        'application/wasm'
      ),
      workerURL: await toBlobURL(
        'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.worker.js',
        'text/javascript'
      ),
    })
  })()
  await loadPromise
  return ffmpeg!
}

export type TranscodeProgress = { ratio: number; time: number }

const TRANSCODE_TIMEOUT_MS = 120_000

export async function transcodeToMP4(
  webmBlob: Blob,
  onProgress?: (p: TranscodeProgress) => void
): Promise<Blob> {
  return Promise.race([
    doTranscode(webmBlob, onProgress),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Transcode timeout after 2 minutes')), TRANSCODE_TIMEOUT_MS)
    ),
  ])
}

async function doTranscode(
  webmBlob: Blob,
  onProgress?: (p: TranscodeProgress) => void
): Promise<Blob> {
  const ff = await getFFmpeg()

  ff.off('progress', () => {})
  ff.on('progress', ({ progress, time }) => {
    onProgress?.({ ratio: Math.min(Math.max(progress, 0), 1), time })
  })

  await ff.writeFile('input.webm', await fetchFile(webmBlob))

  await ff.exec([
    '-i',        'input.webm',
    '-c:v',      'libx264',
    '-preset',   'ultrafast',
    '-crf',      '23',
    '-c:a',      'aac',
    '-b:a',      '128k',
    '-movflags', '+faststart',
    '-pix_fmt',  'yuv420p',
    'output.mp4',
  ])

  const data: any = await ff.readFile('output.mp4')

  try { await ff.deleteFile('input.webm') } catch {}
  try { await ff.deleteFile('output.mp4') } catch {}

  let blobPart: ArrayBuffer
  if (data instanceof Uint8Array) {
    const copy = new Uint8Array(data.byteLength)
    copy.set(data)
    blobPart = copy.buffer
  } else {
    blobPart = data as ArrayBuffer
  }

  return new Blob([blobPart], { type: 'video/mp4' })
}