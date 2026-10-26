import type { Editor, JSONContent } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { Download, Eye, FilePlus2, FileUp, ListTree, LogOut, Monitor, Moon, MoreHorizontal, PanelRight, Pencil, RotateCcw, Sun } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Mode } from '../App'
import { signOut } from '../auth/verify'
import { exportHTML, exportJSON, importJSONFile, pageTitle } from '../editor/lib/exportPage'
import type { ThemeChoice } from './useTheme'

type Props = {
  editor: Editor
  mode: Mode
  onModeChange: (mode: Mode) => void
  theme: { choice: ThemeChoice; resolved: 'light' | 'dark'; setChoice: (c: ThemeChoice) => void }
  outlineOpen: boolean
  onToggleOutline: () => void
  paneOpen: boolean
  onTogglePane: () => void
  onReplace: (doc: JSONContent) => void
  onReset: () => void
}

const BLANK: JSONContent = {
  type: 'doc',
  attrs: { pageWidth: 'standard' },
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Untitled page' }] },
    { type: 'section', attrs: { layout: 'one' }, content: [{ type: 'column', content: [{ type: 'paragraph' }] }] },
  ],
}

function PageMenu({ editor, theme, onReplace, onReset }: Pick<Props, 'editor' | 'theme' | 'onReplace' | 'onReset'>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const item = (icon: ReactNode, label: string, run: () => void) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false)
        run()
      }}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icon-btn" title="Page actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="menu__panel" role="menu">
          {item(<Download size={15} />, 'Export HTML', () => exportHTML(editor, theme.resolved))}
          {item(<Download size={15} />, 'Export JSON', () => exportJSON(editor))}
          {item(<FileUp size={15} />, 'Import JSON…', async () => {
            const doc = await importJSONFile()
            if (doc) onReplace(doc)
          })}
          <hr />
          {item(<FilePlus2 size={15} />, 'New blank page', () => onReplace(BLANK))}
          {item(<RotateCcw size={15} />, 'Restore sample page', onReset)}
          <hr />
          {item(<LogOut size={15} />, 'Sign out', () => {
            signOut()
            location.reload()
          })}
        </div>
      )}
    </div>
  )
}

export function TopBar(props: Props) {
  const { editor, mode, onModeChange, theme } = props
  const title = useEditorState({ editor, selector: ({ editor: e }) => pageTitle(e) })
  const nextTheme: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }
  const ThemeIcon = theme.choice === 'system' ? Monitor : theme.choice === 'dark' ? Moon : Sun

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={26} height={26} />
        <span className="topbar__product">Pages</span>
        <span className="topbar__divider" aria-hidden="true" />
        <span className="topbar__title" title={title}>
          {title}
        </span>
      </div>

      <div className="topbar__actions">
        <button type="button" className="icon-btn" title={props.outlineOpen ? 'Hide outline' : 'Show outline'} aria-pressed={props.outlineOpen} onClick={props.onToggleOutline}>
          <ListTree size={18} />
        </button>
        {mode === 'edit' && (
          <button type="button" className="icon-btn" title={props.paneOpen ? 'Hide properties' : 'Show properties'} aria-pressed={props.paneOpen} onClick={props.onTogglePane}>
            <PanelRight size={18} />
          </button>
        )}
        <button type="button" className="icon-btn" title={`Theme: ${theme.choice}`} onClick={() => theme.setChoice(nextTheme[theme.choice])}>
          <ThemeIcon size={18} />
        </button>
        <PageMenu editor={editor} theme={theme} onReplace={props.onReplace} onReset={props.onReset} />
        <div className="mode-switch" role="radiogroup" aria-label="Mode">
          <button type="button" role="radio" aria-checked={mode === 'edit'} aria-label="Edit" onClick={() => onModeChange('edit')}>
            <Pencil size={15} /> <span className="mode-switch__label">Edit</span>
          </button>
          <button type="button" role="radio" aria-checked={mode === 'view'} aria-label="View" onClick={() => onModeChange('view')}>
            <Eye size={15} /> <span className="mode-switch__label">View</span>
          </button>
        </div>
      </div>
    </header>
  )
}
