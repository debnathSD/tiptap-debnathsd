import { isPaged, type LayoutMode, type PageSettings } from '../pagination/settings'
import type { ExportContext } from './common'

export type ExportKind = 'pdf' | 'docx' | 'pptx'

export const EXPORT_LABELS: Record<ExportKind, string> = { pdf: 'PDF', docx: 'Word document', pptx: 'PowerPoint deck' }

/** The layout a download renders in: Word is portrait pages, PowerPoint is 16:9 slides, PDF keeps the current pages. */
export function exportLayout(kind: ExportKind, settings: PageSettings): LayoutMode {
  if (kind === 'pptx') return 'landscape'
  if (kind === 'docx') return 'portrait'
  return isPaged(settings) ? settings.layout : 'portrait'
}

/** Load the exporter on demand (the PDF, Word and PowerPoint libraries are large) and run it. */
export async function runExporter(kind: ExportKind, ctx: ExportContext) {
  if (kind === 'pdf') return (await import('./exportPdf')).exportPdf(ctx)
  if (kind === 'docx') return (await import('./exportDocx')).exportDocx(ctx)
  return (await import('./exportPptx')).exportPptx(ctx)
}
