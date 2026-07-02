import type { StampData } from '@/hooks/useStamp'

export type StampRotation = 0 | 90 | -90
export type StampScale = 1 | 2 | 3

// Deterministic pseudo-random in [0,1), same trick as the GLSL hash —
// keeps character jitter reproducible frame-to-frame within a time bucket
// instead of full white-noise flicker.
function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

function drawImperfectLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'right',
  scale: number,
  timeBucket: number
) {
  const chars   = text.split('')
  const widths  = chars.map(c => ctx.measureText(c).width)
  const total   = widths.reduce((a, b) => a + b, 0)
  let cursorX   = align === 'right' ? x - total : x

  const savedFill    = ctx.fillStyle
  const savedShadowC = ctx.shadowColor
  const savedShadowB = ctx.shadowBlur
  const savedAlpha   = ctx.globalAlpha

  ctx.textAlign = 'left'

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const w  = widths[i]

    // Per-glyph wobble, different phase per character so it reads as
    // tape jitter rather than a uniform camera shake.
    const seed    = i * 7.31 + timeBucket * 0.61
    const jitterY = (hash(seed) - 0.5) * 1.1 * scale
    const jitterX = (hash(seed + 91.7) - 0.5) * 0.4 * scale
    const cx = cursorX + w / 2 + jitterX
    const cy = y + jitterY

    // Chromatic fringe — cyan/red ghosts either side, low alpha, like a
    // character generator bleeding on worn tape.
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur  = 0

    ctx.globalAlpha = 0.35 * savedAlpha
    ctx.fillStyle   = '#00E5FF'
    ctx.fillText(ch, cx - 0.6 * scale, cy)

    ctx.fillStyle   = '#FF3B30'
    ctx.fillText(ch, cx + 0.6 * scale, cy)

    // Main glyph on top
    ctx.globalAlpha = savedAlpha
    ctx.fillStyle   = savedFill
    ctx.shadowColor = savedShadowC
    ctx.shadowBlur  = savedShadowB
    ctx.fillText(ch, cx, cy)

    cursorX += w
  }
}

export function drawStamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stamp: StampData,
  rotation: StampRotation = 0,
  stampScale: StampScale = 1
) {
  if (!stamp.enabled) return

  const scale    = Math.max(w / 720, 1) * stampScale
  const fontSize = Math.round(14 * scale)
  const padding  = Math.round(14 * scale)
  const lineH    = Math.round(19 * scale)

  const lines: string[] = [stamp.dateTime]
  if (stamp.location) lines.push(stamp.location)

  // Slow brightness flicker — real tape OSD pulses very slightly with
  // head wear and tape speed instead of holding a flat, dead-stable glow.
  // performance.now() (not Date.now()) keeps the hash input small so the
  // sin-based hash stays numerically stable over a long recording.
  const now        = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const timeBucket = Math.floor(now / 90) // re-roll every ~90ms, not every frame
  const flicker    = 0.90 + hash(timeBucket * 3.17) * 0.10

  ctx.save()
  ctx.font          = `${fontSize}px "Courier New", Courier, monospace`
  ctx.fillStyle     = '#FFB800'
  ctx.globalAlpha   = flicker
  ctx.shadowColor   = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur    = Math.round(4 * scale)
  ctx.shadowOffsetX = Math.round(1 * scale)
  ctx.shadowOffsetY = Math.round(1 * scale)
  ctx.textBaseline  = 'bottom'

  if (rotation === 0) {
    // Portrait — bottom right, no rotation
    let y = h - padding
    for (let i = lines.length - 1; i >= 0; i--) {
      drawImperfectLine(ctx, lines[i], w - padding, y, 'right', scale, timeBucket + i * 13)
      y -= lineH
    }

  } else if (rotation === 90) {
    // Phone rotated CW (home button left)
    ctx.translate(0, h)
    ctx.rotate(-Math.PI / 2)
    let y90 = w - padding
    for (let i = lines.length - 1; i >= 0; i--) {
      drawImperfectLine(ctx, lines[i], h - padding, y90, 'right', scale, timeBucket + i * 13)
      y90 -= lineH
    }

  } else {
    // Phone rotated CCW (home button right)
    ctx.translate(w, 0)
    ctx.rotate(Math.PI / 2)
    let y_90 = w - padding
    for (let i = lines.length - 1; i >= 0; i--) {
      drawImperfectLine(ctx, lines[i], h - padding, y_90, 'right', scale, timeBucket + i * 13)
      y_90 -= lineH
    }
  }

  ctx.restore()
}