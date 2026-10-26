import type { Editor, JSONContent } from '@tiptap/core'
import { ArrowLeft, Copy, Download, Eye, FileUp, ListTree, Lock, LogOut, Monitor, Moon, MoreHorizontal, PanelRight, Pencil, PencilLine, PlayCircle, Sun } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { signOut, type Session } from '../auth/verify'
import { exportHTML, exportJSON, importJSONFile } from '../editor/lib/exportPage'
import type { PageRecord } from '../pages/store'
import type { Mode } from './EditorScreen'
import { navigate, routes } from './router'
import type { ThemeChoice } from './useTheme'

export type ThemeState = { choice: ThemeChoice; resolved: 'light' | 'dark'; setChoice: (c: ThemeChoice) => void }

type Props = {
  editor: Editor
  page: PageRecord
  session: Session
  mode: Mode
  onModeChange: (mode: Mode) => void
  theme: ThemeState
  outlineOpen: boolean
  onToggleOutline: () => void
  paneOpen: boolean
  onTogglePane: () => void
  onReplace: (doc: JSONContent) => void
  onRename: (title: string) => void
  onClone: () => void
}

export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

export function MenuItem({ icon, label, onSelect }: { icon: ReactNode; label: string; onSelect: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onSelect}>
      {icon}
      {label}
    </button>
  )
}

/** "⋯" menu: who is signed in, optional page actions, sign out. */
export function UserMenu({ session, extra }: { session: Session; extra?: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icon-btn" title="More" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="menu__panel" role="menu">
          <div className="menu__user">
            Signed in as <strong>{session.user}</strong>
          </div>
          {extra && (
            <>
              <hr />
              {extra(() => setOpen(false))}
            </>
          )}
          <hr />
          <MenuItem
            icon={<LogOut size={15} />}
            label="Sign out"
            onSelect={() => {
              signOut()
              location.hash = routes.list()
              location.reload()
            }}
          />
        </div>
      )}
    </div>
  )
}

export function ThemeButton({ theme }: { theme: ThemeState }) {
  const next: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }
  const Icon = theme.choice === 'system' ? Monitor : theme.choice === 'dark' ? Moon : Sun
  return (
    <button type="button" className="icon-btn" title={`Theme: ${theme.choice}`} onClick={() => theme.setChoice(next[theme.choice])}>
      <Icon size={18} />
    </button>
  )
}

export function TopBar(props: Props) {
  const { editor, page, mode, onModeChange, theme } = props
  const readOnly = page.template

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <button type="button" className="topbar__back" title="All pages" onClick={() => navigate(routes.list())}>
          <ArrowLeft size={16} />
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={24} height={24} />
          <span className="topbar__product">Pages</span>
        </button>
        <span className="topbar__divider" aria-hidden="true" />
        {readOnly ? (
          <span className="topbar__title" title={page.title}>
            <Lock size={13} /> {page.title}
          </span>
        ) : (
          <label className="topbar__rename" title="Rename page">
            <input
              className="topbar__title-input"
              value={page.title}
              placeholder="Untitled page"
              aria-label="Page name"
              onChange={e => props.onRename(e.target.value)}
              onBlur={e => !e.target.value.trim() && props.onRename('Untitled page')}
              onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && e.currentTarget.blur()}
            />
            <PencilLine size={14} aria-hidden="true" />
          </label>
        )}
      </div>

      <div className="topbar__actions">
        <button type="button" className="icon-btn" title="Product tour" onClick={() => navigate(routes.tour())}>
          <PlayCircle size={18} />
        </button>
        <button type="button" className="icon-btn" title={props.outlineOpen ? 'Hide outline' : 'Show outline'} aria-pressed={props.outlineOpen} onClick={props.onToggleOutline}>
          <ListTree size={18} />
        </button>
        {mode === 'edit' && (
          <button type="button" className="icon-btn" title={props.paneOpen ? 'Hide properties' : 'Show properties'} aria-pressed={props.paneOpen} onClick={props.onTogglePane}>
            <PanelRight size={18} />
          </button>
        )}
        <ThemeButton theme={theme} />
        <UserMenu
          session={props.session}
          extra={close => (
            <>
              {!readOnly && (
                <MenuItem
                  icon={<PencilLine size={15} />}
                  label="Rename page"
                  onSelect={() => {
                    close()
                    const input = document.querySelector<HTMLInputElement>('.topbar__title-input')
                    input?.focus()
                    input?.select()
                  }}
                />
              )}
              <MenuItem icon={<Copy size={15} />} label={readOnly ? 'Clone to edit' : 'Duplicate page'} onSelect={() => (close(), props.onClone())} />
              <MenuItem icon={<Download size={15} />} label="Export HTML" onSelect={() => (close(), exportHTML(editor, theme.resolved))} />
              <MenuItem icon={<Download size={15} />} label="Export JSON" onSelect={() => (close(), exportJSON(editor))} />
              {!readOnly && (
                <MenuItem
                  icon={<FileUp size={15} />}
                  label="Import JSON…"
                  onSelect={async () => {
                    close()
                    const doc = await importJSONFile()
                    if (doc) props.onReplace(doc)
                  }}
                />
              )}
            </>
          )}
        />
        {readOnly ? (
          <button type="button" className="btn btn--primary topbar__clone" onClick={props.onClone}>
            <Copy size={15} /> <span className="mode-switch__label">Clone to edit</span>
          </button>
        ) : (
          <div className="mode-switch" role="radiogroup" aria-label="Mode">
            <button type="button" role="radio" aria-checked={mode === 'edit'} aria-label="Edit" onClick={() => onModeChange('edit')}>
              <Pencil size={15} /> <span className="mode-switch__label">Edit</span>
            </button>
            <button type="button" role="radio" aria-checked={mode === 'view'} aria-label="View" onClick={() => onModeChange('view')}>
              <Eye size={15} /> <span className="mode-switch__label">View</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
