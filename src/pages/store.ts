import type { JSONContent } from '@tiptap/core'
import { useSyncExternalStore } from 'react'
import type { Session } from '../auth/verify'
import { samplePage } from '../editor/content/samplePage'
import { uid } from '../editor/lib/nodeAttrs'

/**
 * Pages for the signed-in account. The built-in report is a read-only
 * template; everything a user creates or clones is kept in sessionStorage
 * under that account, so it lasts for the browser session and is never
 * visible to other accounts.
 */

export type PageRecord = {
  id: string
  title: string
  createdBy: string
  createdAt: string
  updatedAt: string
  template: boolean
  /** Title of the page this one was cloned from, if any. */
  clonedFrom?: string
  doc: JSONContent
}

export const TEMPLATE_ID = 'fy26-status-report'

export function templatePage(): PageRecord {
  return {
    id: TEMPLATE_ID,
    title: 'FY26 Data Cloud — Bi-Weekly Progress Report',
    createdBy: 'Pages team',
    createdAt: '2026-10-26T06:00:00.000Z',
    updatedAt: '2026-10-26T06:00:00.000Z',
    template: true,
    doc: samplePage(),
  }
}

export function blankDoc(title: string): JSONContent {
  return {
    type: 'doc',
    attrs: { pageWidth: 'standard' },
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] },
      { type: 'section', attrs: { layout: 'one' }, content: [{ type: 'column', content: [{ type: 'paragraph' }] }] },
    ],
  }
}

const storageKey = (session: Session) => `tiptap-pages:pages:${session.account.slice(0, 16)}`

type Listener = () => void

/** A tiny external store so React views re-render when pages change. */
export class PageStore {
  private pages: PageRecord[]
  private listeners = new Set<Listener>()
  private readonly template = templatePage()

  constructor(
    private readonly session: Session,
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'> = sessionStorage,
  ) {
    this.pages = this.load()
  }

  private load(): PageRecord[] {
    try {
      const parsed = JSON.parse(this.storage.getItem(storageKey(this.session)) ?? '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private commit(pages: PageRecord[]) {
    this.pages = pages
    try {
      this.storage.setItem(storageKey(this.session), JSON.stringify(pages))
    } catch {
      /* storage full or unavailable — keep pages in memory for this page load */
    }
    this.snapshot = null
    this.listeners.forEach(l => l())
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private snapshot: PageRecord[] | null = null
  /** Template first, then the user's pages, most recently changed first. */
  all = () => (this.snapshot ??= [this.template, ...[...this.pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))])

  get(id: string) {
    return id === TEMPLATE_ID ? this.template : this.pages.find(p => p.id === id)
  }

  create(title: string, from?: PageRecord): PageRecord {
    const now = new Date().toISOString()
    const name = title.trim() || 'Untitled page'
    const page: PageRecord = {
      id: uid('page'),
      title: name,
      createdBy: this.session.user,
      createdAt: now,
      updatedAt: now,
      template: false,
      ...(from ? { clonedFrom: from.title } : {}),
      doc: from ? structuredClone(from.doc) : blankDoc(name),
    }
    this.commit([...this.pages, page])
    return page
  }

  clone(source: PageRecord) {
    return this.create(`Copy of ${source.title}`, source)
  }

  update(id: string, patch: Partial<Pick<PageRecord, 'title' | 'doc'>>) {
    if (id === TEMPLATE_ID) return
    this.commit(this.pages.map(p => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)))
  }

  remove(id: string) {
    this.commit(this.pages.filter(p => p.id !== id))
  }
}

export function usePages(store: PageStore) {
  return useSyncExternalStore(store.subscribe, store.all)
}
