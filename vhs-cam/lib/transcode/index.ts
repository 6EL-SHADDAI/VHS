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
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
        'application/wasm'
      ),
    })
  })()
  await loadPromise
  return ffmpeg!
}

export type TranscodeProgress = { ratio: number; time: number }

export async function transcodeToMP4(
  webmBlob: Blob,
  onProgress?: (p: TranscodeProgress) => void
): Promise<Blob> {
  const ff = await getFFmpeg()

  ff.on('progress', ({ progress, time }) => {
    onProgress?.({ ratio: Math.min(Math.max(progress, 0), 1), time })
  })

  await ff.writeFile('input.webm', await fetchFile(webmBlob))
  await ff.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    'output.mp4',
  ])

  const data: any = await ff.readFile('output.mp4')
  await ff.deleteFile('input.webm')
  await ff.deleteFile('output.mp4')

  let blobPart: ArrayBuffer
  if (data instanceof Uint8Array) {
    blobPart = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  } else if (typeof data === 'string') {
    blobPart = new TextEncoder().encode(data).buffer as ArrayBuffer
  } else {
    blobPart = data as ArrayBuffer
  }

  return new Blob([blobPart], { type: 'video/mp4' })
}