import type { LayoutMode, PageSettings, PaperSize } from './settings'

/** CSS pixels at 96 dpi. */
const PAPER: Record<PaperSize, { w: number; h: number }> = {
  A4: { w: 794, h: 1123 },
  Letter: { w: 816, h: 1056 },
  Legal: { w: 816, h: 1344 },
}
/** PowerPoint widescreen slide: 13.333 × 7.5 in. */
const SLIDE = { w: 1280, h: 720 }
const PAGE_MARGINS = { narrow: 48, normal: 72, wide: 96 } as const
const SLIDE_MARGINS = { narrow: 32, normal: 48, wide: 64 } as const
/** Width of the seamless canvas. */
export const CANVAS_WIDTH = 1180
/** Gap drawn between two sheets on screen. */
export const SHEET_GAP = 28

export type PageGeometry = { width: number; height: number; margin: number; content: number; widthIn: number; heightIn: number }

export function pageGeometry(settings: PageSettings, layout: LayoutMode = settings.layout): PageGeometry {
  if (layout === 'landscape') {
    const margin = SLIDE_MARGINS[settings.margins] ?? SLIDE_MARGINS.normal
    return { width: SLIDE.w, height: SLIDE.h, margin, content: SLIDE.h - 2 * margin, widthIn: SLIDE.w / 96, heightIn: SLIDE.h / 96 }
  }
  const paper = PAPER[settings.size] ?? PAPER.A4
  const margin = PAGE_MARGINS[settings.margins] ?? PAGE_MARGINS.normal
  if (layout === 'canvas') return { width: CANVAS_WIDTH, height: Infinity, margin: 48, content: Infinity, widthIn: paper.w / 96, heightIn: paper.h / 96 }
  return { width: paper.w, height: paper.h, margin, content: paper.h - 2 * margin, widthIn: paper.w / 96, heightIn: paper.h / 96 }
}
