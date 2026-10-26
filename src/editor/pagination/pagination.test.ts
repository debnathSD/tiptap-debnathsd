import { Editor, generateHTML, generateJSON, getSchema } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'
import { editorExtensions, schemaExtensions } from '../extensions'
import { exportLayout } from '../export/run'
import { pageGeometry } from './geometry'
import { pageBreaks } from './pagination'
import { DEFAULT_PAGE_SETTINGS, fieldParts, fillFields, normalizeSettings, showsHeaderFooter, type PageSettings } from './settings'

const vars = { title: 'Weekly update', author: 'alex.morgan', date: '26 October 2026' }

describe('page settings', () => {
  it('fills in defaults for anything missing', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_PAGE_SETTINGS)
    expect(normalizeSettings({ layout: 'landscape', size: 'Letter' })).toMatchObject({ layout: 'landscape', size: 'Letter', margins: 'normal' })
    expect(normalizeSettings({ layout: 'sideways', margins: 'huge' })).toMatchObject({ layout: 'portrait', margins: 'normal' })
  })

  it('migrates the older orientation / plain-text header and footer shape', () => {
    const migrated = normalizeSettings({ orientation: 'landscape', header: 'Confidential', footer: 'Contoso', pageNumbers: true })
    expect(migrated.layout).toBe('landscape')
    expect(migrated.header).toEqual({ left: 'Confidential', center: '', right: '' })
    expect(migrated.footer).toEqual({ left: 'Contoso', center: '', right: 'Page {page} of {pages}' })
    expect(normalizeSettings({ paginate: false }).layout).toBe('canvas')
    expect(normalizeSettings({ footer: 'Contoso', pageNumbers: false }).footer.right).toBe('')
  })

  it('fills header and footer fields, keeping page numbers as live fields for Word', () => {
    expect(fillFields('{title} — page {page} of {pages}', 2, 5, vars)).toBe('Weekly update — page 2 of 5')
    expect(fillFields('{author}, {date}', 1, 1, vars)).toBe('alex.morgan, 26 October 2026')
    expect(fieldParts('Page {page} of {pages}', vars)).toEqual([{ text: 'Page ' }, { field: 'page' }, { text: ' of ' }, { field: 'pages' }])
    expect(fillFields('{unknown} stays', 1, 1, vars)).toBe('{unknown} stays')
  })

  it('leaves the first page bare when it is a cover page', () => {
    const cover: PageSettings = { ...DEFAULT_PAGE_SETTINGS, differentFirstPage: true }
    expect(showsHeaderFooter(cover, 1)).toBe(false)
    expect(showsHeaderFooter(cover, 2)).toBe(true)
    expect(showsHeaderFooter(DEFAULT_PAGE_SETTINGS, 1)).toBe(true)
  })

  it('sizes portrait pages as paper and landscape pages as 16:9 PowerPoint slides', () => {
    expect(pageGeometry({ ...DEFAULT_PAGE_SETTINGS, size: 'A4' })).toMatchObject({ width: 794, height: 1123 })
    expect(pageGeometry({ ...DEFAULT_PAGE_SETTINGS, size: 'Letter' })).toMatchObject({ width: 816, height: 1056 })
    const slide = pageGeometry({ ...DEFAULT_PAGE_SETTINGS, layout: 'landscape' })
    expect(slide.widthIn).toBeCloseTo(13.333, 2)
    expect(slide.heightIn).toBeCloseTo(7.5, 2)
    expect(pageGeometry({ ...DEFAULT_PAGE_SETTINGS, layout: 'canvas' }).height).toBe(Infinity)
  })

  it('renders each download in the layout its format needs', () => {
    const canvas = { ...DEFAULT_PAGE_SETTINGS, layout: 'canvas' as const }
    expect(exportLayout('docx', { ...DEFAULT_PAGE_SETTINGS, layout: 'landscape' })).toBe('portrait')
    expect(exportLayout('pptx', DEFAULT_PAGE_SETTINGS)).toBe('landscape')
    expect(exportLayout('pdf', { ...DEFAULT_PAGE_SETTINGS, layout: 'landscape' })).toBe('landscape')
    expect(exportLayout('pdf', canvas)).toBe('portrait')
  })
})

describe('page breaks', () => {
  let editor: Editor | null = null
  afterEach(() => {
    editor?.destroy()
    editor = null
  })

  it('round-trips through HTML', () => {
    const schema = getSchema(schemaExtensions())
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }, { type: 'pageBreak' }, { type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }] }
    const html = generateHTML(doc, schemaExtensions())
    expect(html).toContain('data-type="page-break"')
    expect(generateJSON(html, schemaExtensions())).toMatchObject({ content: [{ type: 'paragraph' }, { type: 'pageBreak' }, { type: 'paragraph' }] })
    expect(() => schema.nodeFromJSON(doc).check()).not.toThrow()
  })

  it('only lives at page level, so inserting from inside a section puts it after the section', () => {
    editor = new Editor({
      extensions: editorExtensions(),
      content: {
        type: 'doc',
        content: [{ type: 'section', attrs: { layout: 'one' }, content: [{ type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inside' }] }] }] }],
      },
    })
    editor.commands.setTextSelection(3)
    expect(editor.commands.insertPageBreak()).toBe(true)
    expect(editor.getJSON().content?.map(n => n.type).slice(0, 3)).toEqual(['section', 'pageBreak', 'paragraph'])
  })

  it('keeps page settings in plugin state without touching undo history', () => {
    editor = new Editor({ extensions: editorExtensions(DEFAULT_PAGE_SETTINGS, vars), content: '<p>Hello</p>' })
    expect(pageBreaks(editor.state)?.settings.layout).toBe('portrait')
    editor.commands.setPageSettings({ ...DEFAULT_PAGE_SETTINGS, layout: 'landscape' })
    expect(pageBreaks(editor.state)?.settings.layout).toBe('landscape')
    expect(editor.can().undo()).toBe(false)
    editor.commands.setPageSettings({ ...DEFAULT_PAGE_SETTINGS, layout: 'canvas' })
    expect(pageBreaks(editor.state)).toMatchObject({ breaks: [], total: 1 })
  })
})
