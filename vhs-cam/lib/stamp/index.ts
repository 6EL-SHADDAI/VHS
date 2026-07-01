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
  ctx.font         = `${fontSize}px "Courier New", Courier, monospace`
  ctx.textBaseline = 'bottom'
  ctx.shadowColor   = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur    = Math.round(4 * scale)
  ctx.shadowOffsetX = Math.round(1 * scale)
  ctx.shadowOffsetY = Math.round(1 * scale)
  ctx.fillStyle     = '#FFB800'

  if (rotation === 0) {
    // Portrait — bottom right
    ctx.textAlign = 'right'
    const x = w - padding
    let   y = h - padding
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], x, y)
      y -= lineH
    }
  } else if (rotation === 90) {
    // Landscape clockwise (home button left) — rotate text -90°
    ctx.textAlign = 'right'
    ctx.translate(padding + lineH * lines.length, h - padding)
    ctx.rotate(-Math.PI / 2)
    let x = 0
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, x)
      x -= lineH
    }
  } else {
    // Landscape counter-clockwise (home button right) — rotate text +90°
    ctx.textAlign = 'left'
    ctx.translate(w - padding - lineH * lines.length, padding)
    ctx.rotate(Math.PI / 2)
    let x = 0
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, x)
      x += lineH
    }
  }

  ctx.restore()
}