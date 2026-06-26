export type FilterMode = 'vhs' | 'vhs-c' | 'glitch' | 'film' | 'disposable' | 'polaroid'

export interface FilterParams {
  glitch: number      // 0–100
  noise: number       // 0–100
  blur: number        // 0–100
  warmth: number      // 0–100
  contrast: number    // 0–100
  vignette: number    // 0–100
  bloom: number       // 0–100
}

export interface CaptureItem {
  id: string
  type: 'photo' | 'video'
  blob: Blob
  thumbnail: string   // base64 data URL
  filter: FilterMode
  params: FilterParams
  createdAt: number
}

export interface CameraState {
  ready: boolean
  facing: 'user' | 'environment'
  recording: boolean
  recordingDuration: number
  filter: FilterMode
  params: FilterParams
}
