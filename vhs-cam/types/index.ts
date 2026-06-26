export type FilterMode = 'vhs' | 'vhs-c' | 'glitch' | 'night' | 'film' | 'disposable' | 'polaroid'

export interface FilterParams {
  glitch:   number
  noise:    number
  blur:     number
  warmth:   number
  contrast: number
  vignette: number
  bloom:    number
}

export interface CaptureItem {
  id:        string
  type:      'photo' | 'video'
  blob:      Blob
  thumbnail: string
  filter:    FilterMode
  params:    FilterParams
  createdAt: number
}

export interface CameraState {
  ready:             boolean
  facing:            'user' | 'environment'
  recording:         boolean
  recordingDuration: number
  filter:            FilterMode
  params:            FilterParams
}