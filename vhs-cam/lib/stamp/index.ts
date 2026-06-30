import type { StampData } from '@/hooks/useStamp'

export function drawStamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stamp: StampData
) {
  if (!stamp.enabled) return

  const scale    = Math.max(w / 720, 1)
  const fontSize = Math.round(14 * scale)
  const padding  = Math.round(14 * scale)
  const lineH    = Math.round(19 * scale)

  ctx.save()
  ctx.font         = `${fontSize}px "Courier New", Courier, monospace`
  ctx.textBaseline = 'bottom'
  ctx.textAlign    = 'right'

  const lines: string[] = [stamp.dateTime]
  if (stamp.location) lines.push(stamp.location)

  const x = w - padding
  let   y = h - padding

  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.shadowColor   = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur    = Math.round(4 * scale)
    ctx.shadowOffsetX = Math.round(1 * scale)
    ctx.shadowOffsetY = Math.round(1 * scale)
    ctx.fillStyle     = '#FFB800'
    ctx.fillText(lines[i], x, y)
    y -= lineH
  }

  ctx.restore()
}