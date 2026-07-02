import type { StampData } from '@/hooks/useStamp'

export type StampRotation = 0 | 90 | -90

export function drawStamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stamp: StampData,
  rotation: StampRotation = 0
) {
  if (!stamp.enabled) return

  const scale    = Math.max(w / 720, 1)
  const fontSize = Math.round(14 * scale)
  const padding  = Math.round(14 * scale)
  const lineH    = Math.round(19 * scale)

  const lines: string[] = [stamp.dateTime]
  if (stamp.location) lines.push(stamp.location)

  ctx.save()
  ctx.font          = `${fontSize}px "Courier New", Courier, monospace`
  ctx.fillStyle     = '#FFB800'
  ctx.shadowColor   = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur    = Math.round(4 * scale)
  ctx.shadowOffsetX = Math.round(1 * scale)
  ctx.shadowOffsetY = Math.round(1 * scale)

  if (rotation === 0) {
    // Portrait — bottom right, no rotation
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'bottom'
    let y = h - padding
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], w - padding, y)
      y -= lineH
    }

  } else if (rotation === 90) {
    // Phone rotated CW (home button left)
    // Rotate canvas -90° around bottom-left corner
    // After transform: x→up, y→right on screen
    // Draw text "bottom-right" in the rotated space = bottom-right in landscape
    ctx.translate(0, h)
    ctx.rotate(-Math.PI / 2)
    // New virtual canvas is h wide, w tall
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'bottom'
    let y90 = w - padding
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], h - padding, y90)
      y90 -= lineH
    }

  } else {
    // Phone rotated CCW (home button right)
    // Rotate canvas +90° around top-right corner
    // After transform: x→down, y→left on screen
    // Draw text "bottom-right" in the rotated space = bottom-right in landscape
    ctx.translate(w, 0)
    ctx.rotate(Math.PI / 2)
    // New virtual canvas is h wide, w tall
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'bottom'
    let y_90 = w - padding
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], h - padding, y_90)
      y_90 -= lineH
    }
  }

  ctx.restore()
}