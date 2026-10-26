import { Editor, generateHTML, generateJSON, type JSONContent } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'
import { parseHex } from '../lib/palette'
import { INSERT_ITEMS } from '../menus/catalog'
import { editorExtensions, schemaExtensions } from '.'
import { MIN_COLUMN_WIDTH, MIN_ROW_HEIGHT, scaleWidths } from './tables'

const cell = (text = '', attrs: Record<string, unknown> = {}): JSONContent => ({ type: 'tableCell', attrs, content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] })
const header = (text: string): JSONContent => ({ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const table = (attrs: Record<string, unknown> = {}): JSONContent => ({
  type: 'table',
  attrs,
  content: [
    { type: 'tableRow', content: [header('A'), header('B')] },
    { type: 'tableRow', content: [cell('1'), cell('2')] },
  ],
})
const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content: [...content, { type: 'paragraph' }] })

let editor: Editor | null = null
afterEach(() => {
  editor?.destroy()
  editor = null
})
const open = (content: JSONContent) => (editor = new Editor({ extensions: editorExtensions(), content }))
const tables = (e: Editor) => {
  const found: Array<{ pos: number; node: ReturnType<Editor['state']['doc']['nodeAt']> }> = []
  e.state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') found.push({ pos, node })
  })
  return found
}

describe('table sizing helpers', () => {
  it('scales column widths to a target width, never below the minimum', () => {
    // 150/50/50, lifted to the 60 px minimum, with the excess taken from the widest column.
    expect(scaleWidths([300, 100, 100], 250)).toEqual([130, 60, 60])
    const scaled = scaleWidths([200, 200, 200], 900)
    expect(scaled.reduce((s, w) => s + w, 0)).toBe(900)
    expect(scaleWidths([100, 100], 50).every(w => w >= MIN_COLUMN_WIDTH)).toBe(true)
  })

  it('reads hex codes typed with or without #, in short or long form', () => {
    expect(parseHex('7C3AED')).toBe('#7c3aed')
    expect(parseHex('#abc')).toBe('#aabbcc')
    expect(parseHex(' #0f766e ')).toBe('#0f766e')
    expect(parseHex('#12345')).toBeNull()
    expect(parseHex('teal')).toBeNull()
  })
})

describe('table attributes', () => {
  it('round-trips row heights, cell color and opacity, header color and opacity through HTML', () => {
    const content = doc({
      type: 'table',
      attrs: { tableStyle: 'bordered', headerColor: 'indigo', headerOpacity: 100 },
      content: [
        { type: 'tableRow', attrs: { rowHeight: 64 }, content: [header('A'), header('B')] },
        { type: 'tableRow', content: [cell('1', { cellColor: '#7c3aed', cellOpacity: 80 }), cell('2', { colwidth: [140] })] },
      ],
    })
    const html = generateHTML(content, schemaExtensions())
    expect(html).toContain('data-row-height="64"')
    expect(html).toContain('data-cell-opacity="80"')
    expect(html).toContain('data-cell-strong')
    const back = generateJSON(html, schemaExtensions())
    const parsed = back.content[0]
    expect(parsed.attrs).toMatchObject({ tableStyle: 'bordered', headerColor: 'indigo', headerOpacity: 100 })
    expect(parsed.content[0].attrs.rowHeight).toBe(64)
    expect(parsed.content[1].content[0].attrs).toMatchObject({ cellColor: '#7c3aed', cellOpacity: 80 })
  })
})

describe('table commands', () => {
  it('adds a row at the bottom and a column at the right, with the cursor in the new cells', () => {
    const e = open(doc(table()))
    const { pos } = tables(e)[0]
    expect(e.commands.addTableRowAtEnd(pos)).toBe(true)
    let node = tables(e)[0].node!
    expect(node.childCount).toBe(3)
    expect(e.state.selection.$from.node(-2)).toBe(node.child(2))
    expect(e.commands.addTableColumnAtEnd(pos)).toBe(true)
    node = tables(e)[0].node!
    expect(node.child(0).childCount).toBe(3)
    expect(node.child(0).child(2).type.name).toBe('tableHeader')
  })

  it('gives a new column in a fixed-width table the narrowest existing width', () => {
    const e = open(doc(table()))
    const { pos } = tables(e)[0]
    e.commands.resizeTable(pos, [200, 120])
    e.commands.addTableColumnAtEnd(pos)
    const row = tables(e)[0].node!.child(1)
    expect([0, 1, 2].map(i => row.child(i).attrs.colwidth)).toEqual([[200], [120], [120]])
  })

  it('sets one row height, clamped to the minimum, and resets it', () => {
    const e = open(doc(table()))
    const rowPos = tables(e)[0].pos + 1
    e.commands.setTableRowHeight(rowPos, 10)
    expect(tables(e)[0].node!.child(0).attrs.rowHeight).toBe(MIN_ROW_HEIGHT)
    e.commands.setTableRowHeight(rowPos, null)
    expect(tables(e)[0].node!.child(0).attrs.rowHeight).toBeNull()
  })

  it('resizes the whole table in one step and resets it to full width', () => {
    const e = open(doc(table()))
    const { pos } = tables(e)[0]
    e.commands.resizeTable(pos, [180, 90], [40, 70])
    let node = tables(e)[0].node!
    expect(node.child(1).child(0).attrs.colwidth).toEqual([180])
    expect(node.child(1).child(1).attrs.colwidth).toEqual([90])
    expect([node.child(0).attrs.rowHeight, node.child(1).attrs.rowHeight]).toEqual([40, 70])
    e.commands.undo()
    expect(tables(e)[0].node!.child(1).child(0).attrs.colwidth).toBeNull()
    e.commands.redo()
    e.commands.resetTableSize(pos)
    node = tables(e)[0].node!
    expect(node.child(1).child(0).attrs.colwidth).toBeNull()
    expect(node.child(1).attrs.rowHeight).toBeNull()
  })

  it('evens out columns at the current width', () => {
    const e = open(doc(table()))
    const { pos } = tables(e)[0]
    e.commands.distributeTableColumns(pos, 400)
    const row = tables(e)[0].node!.child(1)
    expect([row.child(0).attrs.colwidth, row.child(1).attrs.colwidth]).toEqual([[200], [200]])
  })

  it('inserts slash-menu tables as a grid', () => {
    const e = open(doc())
    e.commands.setTextSelection(1)
    INSERT_ITEMS.find(item => item.id === 'table')!.run(e)
    expect(tables(e)[0].node!.attrs.tableStyle).toBe('bordered')
  })
})
