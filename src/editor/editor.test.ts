import { Editor, generateHTML, generateJSON, getSchema, type JSONContent } from '@tiptap/core'
import { TableOfContents } from '@tiptap/extension-table-of-contents'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it } from 'vitest'
import { samplePage } from './content/samplePage'
import { collapseKey, Collapsible } from './extensions/collapsible'
import { schemaExtensions } from './extensions'
import { columnsForLayout } from './extensions/section'
import { barExtent } from './extensions/webparts'
import { textStats } from './lib/textStats'

const extensions = schemaExtensions()
const schema = getSchema(extensions)

const rgbToHex = (value: string) =>
  value.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/, (_, r, g, b) => '#' + [r, g, b].map(n => Number(n).toString(16).padStart(2, '0')).join(''))

/**
 * Compare documents structurally, ignoring what HTML itself normalises:
 * empty attrs, collapsed whitespace and rgb() vs hex colors.
 */
function normalize(node: JSONContent): JSONContent {
  const attrs = node.attrs ? Object.fromEntries(Object.entries(node.attrs).filter(([, v]) => v !== null && v !== undefined && v !== '')) : undefined
  return {
    type: node.type,
    ...(attrs && Object.keys(attrs).length ? { attrs } : {}),
    ...(node.text !== undefined ? { text: node.text.replace(/\s+/g, ' ') } : {}),
    ...(node.marks
      ? { marks: node.marks.map(m => (m.attrs?.color ? { ...m, attrs: { ...m.attrs, color: rgbToHex(String(m.attrs.color)) } } : m)) }
      : {}),
    ...(node.content ? { content: node.content.map(normalize) } : {}),
  }
}

describe('page schema', () => {
  it('accepts the sample page', () => {
    expect(() => schema.nodeFromJSON(samplePage()).check()).not.toThrow()
  })

  it('round-trips every block through HTML without losing attributes', () => {
    const doc = schema.nodeFromJSON(samplePage()).toJSON() as JSONContent
    const html = generateHTML(doc, extensions)
    const back = generateJSON(html, extensions)
    // Page-level attrs (page width) live on the doc node, which HTML has no element for.
    expect(normalize({ ...back, attrs: undefined })).toEqual(normalize({ ...doc, attrs: undefined }))
  })

  it('keeps sections out of columns', () => {
    const nested = {
      type: 'doc',
      content: [{ type: 'section', content: [{ type: 'column', content: [{ type: 'section', content: [{ type: 'column', content: [{ type: 'paragraph' }] }] }] }] }],
    }
    expect(() => schema.nodeFromJSON(nested).check()).toThrow()
  })
})

describe('section layouts', () => {
  const section = (...columns: string[][]) =>
    schema.nodeFromJSON({
      type: 'section',
      content: columns.map(paras => ({
        type: 'column',
        content: paras.length ? paras.map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })) : [{ type: 'paragraph' }],
      })),
    })

  it('adds empty columns when widening', () => {
    const next = columnsForLayout(section(['a']), 'three', schema)
    expect(next).toHaveLength(3)
    expect(next[0].textContent).toBe('a')
    expect(next[2].textContent).toBe('')
  })

  it('merges overflow columns into the last kept column when narrowing', () => {
    const next = columnsForLayout(section(['a'], ['b'], ['c']), 'one', schema)
    expect(next).toHaveLength(1)
    expect(next[0].childCount).toBe(3)
    expect(next[0].textContent).toBe('abc')
  })

  it('drops empty columns instead of merging blank paragraphs', () => {
    const next = columnsForLayout(section(['a'], []), 'one', schema)
    expect(next[0].childCount).toBe(1)
  })
})

describe('text stats', () => {
  it('counts words across marks, blocks and web-part attributes', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hel' }, { type: 'text', text: 'lo', marks: [{ type: 'bold' }] }, { type: 'text', text: ' world' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
        { type: 'statusPill', attrs: { label: 'On track' } },
        { type: 'kpiGrid', attrs: { items: [{ label: 'Active users', value: '1,200' }] } },
      ],
    }
    const stats = textStats(doc)
    expect(stats.words).toBe(8) // Hello world Second On track Active users 1,200
    expect(stats.webParts).toBe(1)
    expect(stats.readingMinutes).toBe(1)
  })

  it('reports zero for an empty page', () => {
    expect(textStats({ type: 'doc', content: [{ type: 'paragraph' }] })).toMatchObject({ words: 0, readingMinutes: 0 })
  })

  it('gives the sample page a plausible reading time', () => {
    const stats = textStats(samplePage())
    expect(stats.words).toBeGreaterThan(400)
    expect(stats.readingMinutes).toBeGreaterThanOrEqual(2)
  })
})

describe('chart scaling', () => {
  it('honours a non-zero axis', () => {
    const attrs = { axisMin: 97, axisMax: 99, data: [] }
    expect(barExtent(98, attrs)).toBeCloseTo(50)
    expect(barExtent(96, attrs)).toBe(2) // clamped so the bar stays visible
  })
})

describe('collapsible headings', () => {
  let editor: Editor | null = null
  afterEach(() => editor?.destroy())

  const make = async () => {
    let n = 0
    editor = new Editor({
      element: document.createElement('div'),
      extensions: [StarterKit.configure({ trailingNode: false }), TableOfContents.configure({ getId: () => `h${++n}` }), Collapsible],
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'A' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'a1' }] },
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'A.1' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'a2' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'B' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'b1' }] },
        ],
      },
    })
    // Heading ids are assigned in the editor's (async) create hook.
    await new Promise(resolve => setTimeout(resolve, 0))
    return editor
  }

  const hidden = (e: Editor) => [...e.view.dom.querySelectorAll('.is-collapsed-hidden')].map(el => el.textContent)

  it('folds everything up to the next heading of the same level', async () => {
    const e = await make()
    const firstId = e.state.doc.firstChild!.attrs['data-toc-id']
    e.commands.toggleCollapsed(firstId)
    expect(hidden(e)).toEqual(['a1', 'A.1', 'a2'])
    expect(e.can().undo()).toBe(false) // view state, not an edit
  })

  it('reveals a folded position on demand', async () => {
    const e = await make()
    const firstId = e.state.doc.firstChild!.attrs['data-toc-id']
    e.commands.toggleCollapsed(firstId)
    const posOfA2 = e.state.doc.child(0).nodeSize + e.state.doc.child(1).nodeSize + e.state.doc.child(2).nodeSize + 1
    e.commands.revealPosition(posOfA2)
    expect(collapseKey.getState(e.state)!.collapsed.size).toBe(0)
    expect(hidden(e)).toEqual([])
  })
})
