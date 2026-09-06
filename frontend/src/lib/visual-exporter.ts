'use client'

import { toPng, toSvg } from 'html-to-image'

const EXPORT_BACKGROUND = '#0F172A'
const PIXEL_RATIO = 2

function queryGanttWrapper(): HTMLElement | null {
  return document.querySelector('.gantt-wrapper') as HTMLElement | null
}

/** Export the Gantt chart area to PNG at 2x resolution (Retina). */
export async function exportGanttPNG(): Promise<void> {
  const node = queryGanttWrapper()
  if (!node) throw new Error('Gantt chart not ready')

  const png = await toPng(node, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: EXPORT_BACKGROUND,
    cacheBust: true,
  })

  const a = document.createElement('a')
  a.href = png
  a.download = `taskflowy-gantt-${Date.now()}.png`
  a.click()
}

/** Export the Gantt chart area to an SVG vector file. */
export async function exportGanttSVG(): Promise<void> {
  const node = queryGanttWrapper()
  if (!node) throw new Error('Gantt chart not ready')

  const svg = await toSvg(node, {
    backgroundColor: EXPORT_BACKGROUND,
    cacheBust: true,
  })

  const a = document.createElement('a')
  a.href = svg
  a.download = `taskflowy-gantt-${Date.now()}.svg`
  a.click()
}