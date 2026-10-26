import { describe, expect, it } from 'vitest'
import { DEFAULT_PAGE_SETTINGS } from '../editor/pagination/settings'
import { PageStore, TEMPLATE_ID } from './store'

const memory = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

const alice = { user: 'alice', account: 'digest-alice-0000000000' }
const bob = { user: 'bob', account: 'digest-bob-00000000000000' }

describe('page store', () => {
  it('always lists the read-only template first', () => {
    const store = new PageStore(alice, memory())
    const [first] = store.all()
    expect(first.id).toBe(TEMPLATE_ID)
    expect(first.template).toBe(true)
  })

  it('never modifies the template', () => {
    const store = new PageStore(alice, memory())
    store.update(TEMPLATE_ID, { title: 'Hacked' })
    expect(store.get(TEMPLATE_ID)!.title).not.toBe('Hacked')
  })

  it('clones into an editable page owned by the current user', () => {
    const store = new PageStore(alice, memory())
    const copy = store.clone(store.get(TEMPLATE_ID)!)
    expect(copy).toMatchObject({ template: false, createdBy: 'alice', clonedFrom: store.get(TEMPLATE_ID)!.title })
    expect(copy.title).toMatch(/^Copy of /)
    expect(copy.doc).toEqual(store.get(TEMPLATE_ID)!.doc)
    expect(copy.doc).not.toBe(store.get(TEMPLATE_ID)!.doc)
  })

  it('keeps each account’s pages separate in the same browser session', () => {
    const storage = memory()
    const a = new PageStore(alice, storage)
    a.create('Alice’s notes')
    const b = new PageStore(bob, storage)
    expect(b.all().map(p => p.title)).not.toContain('Alice’s notes')
    expect(new PageStore(alice, storage).all().map(p => p.title)).toContain('Alice’s notes')
  })

  it('updates, re-sorts by last change and deletes', async () => {
    const store = new PageStore(alice, memory())
    const first = store.create('First')
    await new Promise(r => setTimeout(r, 5))
    store.create('Second')
    await new Promise(r => setTimeout(r, 5))
    store.update(first.id, { title: 'First, renamed' })
    expect(store.all().slice(1).map(p => p.title)).toEqual(['First, renamed', 'Second'])
    store.remove(first.id)
    expect(store.get(first.id)).toBeUndefined()
  })

  it('keeps layout, header and footer per page, and carries them into clones', () => {
    const storage = memory()
    const store = new PageStore(alice, storage)
    expect(store.get(TEMPLATE_ID)!.settings.layout).toBe('canvas')
    const page = store.create('Slides', undefined, { ...DEFAULT_PAGE_SETTINGS, layout: 'landscape' })
    store.update(page.id, { settings: { ...page.settings, footer: { left: '', center: '{page}', right: '' } } })
    const copy = store.clone(store.get(page.id)!)
    expect(copy.settings).toMatchObject({ layout: 'landscape', footer: { center: '{page}' } })
    // Survives a reload from session storage.
    expect(new PageStore(alice, storage).get(copy.id)!.settings.layout).toBe('landscape')
  })

  it('gives pages saved before layouts existed the seamless canvas they had', () => {
    const storage = memory()
    const legacy = { id: 'old', title: 'Old', createdBy: 'alice', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', template: false, doc: { type: 'doc', content: [{ type: 'paragraph' }] } }
    storage.setItem('tiptap-pages:pages:digest-alice-000', JSON.stringify([legacy]))
    expect(new PageStore(alice, storage).get('old')!.settings).toMatchObject({ layout: 'canvas', size: 'A4' })
  })
})
