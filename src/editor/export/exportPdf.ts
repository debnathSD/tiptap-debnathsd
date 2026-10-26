import { jsPDF } from 'jspdf'
import { pageGeometry } from '../pagination/geometry'
import { captureRegion, downloadBlob, fileName, imageSize, pageRegions, sheetBackground, type ExportContext } from './common'

/** One PDF page per sheet, exactly as laid out on screen (2x raster). */
export async function exportPdf(ctx: ExportContext) {
  const geometry = pageGeometry(ctx.settings)
  const orientation = geometry.width > geometry.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [geometry.width, geometry.height], hotfixes: ['px_scaling'], compress: true })
  const background = sheetBackground(ctx.sheet)
  const regions = pageRegions(ctx.sheet)
  for (let i = 0; i < regions.length; i += 1) {
    const image = await captureRegion(ctx.sheet, regions[i], background)
    const size = await imageSize(image)
    // A block taller than a page makes that sheet taller: shrink it to fit the paper.
    const scale = Math.min(geometry.width / (size.width / 2), geometry.height / (size.height / 2), 1)
    const w = (size.width / 2) * scale
    const h = (size.height / 2) * scale
    if (i > 0) pdf.addPage([geometry.width, geometry.height], orientation)
    pdf.addImage(image, 'PNG', (geometry.width - w) / 2, 0, w, h, undefined, 'FAST')
  }
  pdf.setProperties({ title: ctx.title, creator: 'Tiptap Pages' })
  downloadBlob(pdf.output('blob'), fileName(ctx.title, 'pdf'))
}
