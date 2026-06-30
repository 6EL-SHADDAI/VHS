import type { FilterMode, FilterParams } from '@/types'

export const FILTER_PRESETS: Record<FilterMode, FilterParams> = {
  'vhs': {
    glitch: 30, noise: 45, blur: 70, warmth: 72, contrast: 42, vignette: 62, bloom: 0,
  },
  'vhs-c': {
    glitch: 15, noise: 28, blur: 45, warmth: 55, contrast: 38, vignette: 48, bloom: 0,
  },
  'glitch': {
    glitch: 85, noise: 65, blur: 22, warmth: 25, contrast: 52, vignette: 38, bloom: 0,
  },
  'night': {
    glitch: 10, noise: 28, blur: 15, warmth: 0, contrast: 68, vignette: 70, bloom: 72,
  },
  // CLEAN DISPOSABLE: nostalgic colour, minimal grain — sharp and readable
  'disposable': {
    glitch: 0, noise: 18, blur: 0, warmth: 65, contrast: 35, vignette: 40, bloom: 35,
  },
  'film': {
    glitch: 5, noise: 38, blur: 14, warmth: 52, contrast: 48, vignette: 58, bloom: 18,
  },
  'polaroid': {
    glitch: 4, noise: 25, blur: 20, warmth: 60, contrast: 28, vignette: 30, bloom: 12,
  },
}

export const FILTER_LABELS: Record<FilterMode, string> = {
  'vhs':        'VHS',
  'vhs-c':      'VHS-C',
  'glitch':     'GLITCH',
  'night':      'NIGHTSHOT',
  'film':       'FILM',
  'disposable': 'DISPOSABLE',
  'polaroid':   'POLAROID',
}

export const VHS_MODES  = new Set<FilterMode>(['vhs', 'vhs-c', 'glitch', 'night', 'disposable'])
export const FILM_MODES = new Set<FilterMode>(['film', 'polaroid'])