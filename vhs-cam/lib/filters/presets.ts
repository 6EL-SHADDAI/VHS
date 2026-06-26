import type { FilterMode, FilterParams } from '@/types'

export const FILTER_PRESETS: Record<FilterMode, FilterParams> = {
  'vhs': {
    glitch:   40,
    noise:    55,
    blur:     60,
    warmth:   65,
    contrast: 40,
    vignette: 70,
    bloom:     0,
  },
  'vhs-c': {
    glitch:   20,
    noise:    35,
    blur:     30,
    warmth:   45,
    contrast: 35,
    vignette: 50,
    bloom:     0,
  },
  'glitch': {
    glitch:   80,
    noise:    65,
    blur:     20,
    warmth:   30,
    contrast: 55,
    vignette: 40,
    bloom:     0,
  },
  'film': {
    glitch:    5,
    noise:    45,
    blur:     10,
    warmth:   50,
    contrast: 50,
    vignette: 60,
    bloom:    20,
  },
  'disposable': {
    glitch:    8,
    noise:    60,
    blur:     15,
    warmth:   70,
    contrast: 65,
    vignette: 55,
    bloom:    30,
  },
  'polaroid': {
    glitch:    5,
    noise:    30,
    blur:     20,
    warmth:   60,
    contrast: 30,
    vignette: 35,
    bloom:    15,
  },
}

export const FILTER_LABELS: Record<FilterMode, string> = {
  'vhs':        'VHS',
  'vhs-c':      'VHS-C',
  'glitch':     'GLITCH',
  'film':       'FILM',
  'disposable': 'DISPOSABLE',
  'polaroid':   'POLAROID',
}

// Modes that use the VHS WebGL pipeline vs future film pipeline
export const VHS_MODES  = new Set<FilterMode>(['vhs', 'vhs-c', 'glitch'])
export const FILM_MODES = new Set<FilterMode>(['film', 'disposable', 'polaroid'])
