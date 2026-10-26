import { Copy, Eye, FilePlus2, FileText, Lock, Pencil, PlayCircle, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Session } from '../auth/verify'
import { navigate, routes } from '../app/router'
import { ThemeButton, UserMenu, type ThemeState } from '../app/TopBar'
import { textStats } from '../editor/lib/textStats'
import { TEMPLATE_ID, usePages, type PageRecord, type PageStore } from './store'

const dateFormat = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

function When({ iso }: { iso: string }) {
  const date = new Date(iso)
  return (
    <time dateTime={iso} title={date.toLocaleString()}>
      {dateFormat.format(date)}
      <small>{timeFormat.format(date)}</small>
    </time>
  )
}

function CreateDialog({ store, onClose }: { store: PageStore; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [start, setStart] = useState<'blank' | 'template'>('blank')
  const dialog = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
    // showModal() focuses the first button (Close); start in the name field instead.
    nameRef.current?.focus()
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const from = start === 'template' ? store.get(TEMPLATE_ID) : undefined
    const page = store.create(title || (from ? `Copy of ${from.title}` : 'Untitled page'), from)
    navigate(routes.page(page.id))
  }

  return (
    <dialog ref={dialog} className="dialog" onClose={onClose} aria-labelledby="create-title">
      <form method="dialog" onSubmit={submit}>
        <header className="dialog__header">
          <h2 id="create-title">Create a new page</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <label className="login__field">
          <span>Page name</span>
          <input ref={nameRef} className="input" placeholder="e.g. Team update — November" value={title} onChange={e => setTitle(e.target.value)} />
        </label>
        <fieldset className="dialog__choices">
          <legend>Start from</legend>
          <label data-checked={start === 'blank' || undefined}>
            <input type="radio" name="start" checked={start === 'blank'} onChange={() => setStart('blank')} />
            <FilePlus2 size={18} />
            <span>
              <strong>Blank page</strong>
              <small>A title and one empty section</small>
            </span>
          </label>
          <label data-checked={start === 'template' || undefined}>
            <input type="radio" name="start" checked={start === 'template'} onChange={() => setStart('template')} />
            <Copy size={18} />
            <span>
              <strong>Status report template</strong>
              <small>Banner, KPIs, regions, charts and FAQs</small>
            </span>
          </label>
        </fieldset>
        <p className="dialog__note">Your pages are private to your account and kept for this browser session.</p>
        <footer className="dialog__footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            <FilePlus2 size={15} /> Create page
          </button>
        </footer>
      </form>
    </dialog>
  )
}

function DeleteButton({ onConfirm, name }: { onConfirm: () => void; name: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(timer)
  }, [armed])
  return armed ? (
    <button type="button" className="btn btn--danger btn--sm" onClick={onConfirm}>
      Confirm delete
    </button>
  ) : (
    <button type="button" className="icon-btn is-danger" title={`Delete ${name}`} aria-label={`Delete ${name}`} onClick={() => setArmed(true)}>
      <Trash2 size={16} />
    </button>
  )
}

/** Home screen: every page the signed-in user can see, as a table. */
export function PagesList({ store, session, theme }: { store: PageStore; session: Session; theme: ThemeState }) {
  const pages = usePages(store)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pages
      .filter(p => !q || p.title.toLowerCase().includes(q) || p.createdBy.toLowerCase().includes(q))
      .map(p => ({ page: p, words: textStats(p.doc).words }))
  }, [pages, query])

  const own = pages.filter(p => !p.template).length
  const clone = (page: PageRecord) => navigate(routes.page(store.clone(page).id))

  return (
    <div className="home">
      <header className="topbar">
        <div className="topbar__brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={26} height={26} />
          <span className="topbar__product">Pages</span>
        </div>
        <div className="topbar__actions">
          <button type="button" className="btn btn--ghost" onClick={() => navigate(routes.tour())}>
            <PlayCircle size={16} /> Product tour
          </button>
          <ThemeButton theme={theme} />
          <UserMenu session={session} />
        </div>
      </header>

      <main className="home__main">
        <div className="home__intro">
          <div>
            <div className="pane__eyebrow">Workspace</div>
            <h1>Pages</h1>
            <p>
              Signed in as <strong>{session.user}</strong> · {own} page{own === 1 ? '' : 's'} of your own. Templates are read-only; clone one to edit it.
            </p>
          </div>
          <div className="home__actions">
            <label className="home__search">
              <Search size={15} />
              <input placeholder="Search pages" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search pages" />
            </label>
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setCreating(true)}>
              <FilePlus2 size={16} /> Create new page
            </button>
          </div>
        </div>

        <div className="table-card">
          <table className="pages-table">
            <thead>
              <tr>
                <th scope="col">Page name</th>
                <th scope="col">Type</th>
                <th scope="col">Created by</th>
                <th scope="col">Created</th>
                <th scope="col">Last modified</th>
                <th scope="col" className="num">
                  Words
                </th>
                <th scope="col" className="actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ page, words }) => (
                <tr key={page.id} data-template={page.template || undefined}>
                  <td>
                    <a className="pages-table__name" href={routes.page(page.id)}>
                      <span className="pages-table__icon">{page.template ? <Lock size={15} /> : <FileText size={15} />}</span>
                      <span>
                        {page.title || 'Untitled page'}
                        {page.clonedFrom && <small>Cloned from {page.clonedFrom}</small>}
                      </span>
                    </a>
                  </td>
                  <td>
                    {page.template ? <span className="pg-pill" data-tone="info">Template · read-only</span> : <span className="pg-pill" data-tone="good">Your page</span>}
                  </td>
                  <td>{page.createdBy}</td>
                  <td>
                    <When iso={page.createdAt} />
                  </td>
                  <td>
                    <When iso={page.updatedAt} />
                  </td>
                  <td className="num">{words.toLocaleString()}</td>
                  <td className="actions">
                    <div className="row-actions">
                      <a className="btn btn--sm" href={routes.page(page.id)}>
                        {page.template ? <Eye size={14} /> : <Pencil size={14} />} {page.template ? 'View' : 'Edit'}
                      </a>
                      <button type="button" className="btn btn--sm" onClick={() => clone(page)}>
                        <Copy size={14} /> Clone
                      </button>
                      {!page.template && <DeleteButton name={page.title} onConfirm={() => store.remove(page.id)} />}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="pages-table__empty">
                    No pages match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {own === 0 && !query && (
          <div className="home__empty">
            <strong>You haven't created a page yet.</strong> Clone the status report template to play around with it, or start a new page from scratch.
          </div>
        )}
        <p className="home__note">Pages you create are visible only to your account and are kept until this browser tab is closed.</p>
      </main>

      {creating && <CreateDialog store={store} onClose={() => setCreating(false)} />}
    </div>
  )
}
