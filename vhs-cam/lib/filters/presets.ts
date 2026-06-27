import type { FilterMode, FilterParams } from '@/types'

export const FILTER_PRESETS: Record<FilterMode, FilterParams> = {
  'vhs': {
    glitch: 35, noise: 50, blur: 65, warmth: 70, contrast: 45, vignette: 65, bloom: 0,
  },
  'vhs-c': {
    glitch: 18, noise: 30, blur: 40, warmth: 55, contrast: 40, vignette: 50, bloom: 0,
  },
  'glitch': {
    glitch: 82, noise: 68, blur: 25, warmth: 28, contrast: 55, vignette: 40, bloom: 0,
  },
  'night': {
    glitch: 15, noise: 35, blur: 20, warmth: 0, contrast: 65, vignette: 85, bloom: 55,
  },
  'film': {
    glitch: 5, noise: 40, blur: 12, warmth: 55, contrast: 50, vignette: 60, bloom: 20,
  },
  'disposable': {
    glitch: 8, noise: 58, blur: 18, warmth: 72, contrast: 62, vignette: 52, bloom: 28,
  },
  'polaroid': {
    glitch: 4, noise: 28, blur: 22, warmth: 62, contrast: 28, vignette: 32, bloom: 14,
  },
}

export const FILTER_LABELS: Record<FilterMode, string> = {
  'vhs':        'VHS',
  'vhs-c':      'VHS-C',
  'glitch':     'GLITCH',
  'night':      'NIGHT',
  'film':       'FILM',
  'disposable': 'DISPOSABLE',
  'polaroid':   'POLAROID',
}

export const VHS_MODES  = new Set<FilterMode>(['vhs', 'vhs-c', 'glitch', 'night'])
export const FILM_MODES = new Set<FilterMode>(['film', 'disposable', 'polaroid'])