import type { ReactNode } from 'react'
import { BookOpen, Check, Lock, LoaderCircle } from 'lucide-react'
import type { TextStats } from '../editor/lib/textStats'
import type { Mode, SaveState } from './EditorScreen'

export function StatusBar({
  stats,
  save,
  mode,
  layout,
  notice,
  noticeTone,
}: {
  stats: TextStats
  save: SaveState
  mode: Mode
  /** Pages and paper, e.g. "3 pages · A4 portrait". */
  layout: string
  notice?: ReactNode
  noticeTone?: 'bad'
}) {
  const time = save.at?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <footer className="statusbar">
      <span className="statusbar__item statusbar__layout">{layout}</span>
      <span className="statusbar__item">
        <BookOpen size={13} /> {stats.readingMinutes} min read
      </span>
      <span className="statusbar__item">{stats.words.toLocaleString()} words</span>
      <span className="statusbar__item">{stats.characters.toLocaleString()} characters</span>
      <span className="statusbar__spacer" />
      {notice && (
        <span className="statusbar__item statusbar__notice" data-tone={noticeTone} role="status">
          {notice}
        </span>
      )}
      <span className="statusbar__item" data-status={save.status} aria-live="polite">
        {save.status === 'readonly' && (
          <>
            <Lock size={13} /> Read-only template
          </>
        )}
        {save.status === 'saving' && (
          <>
            <LoaderCircle size={13} className="spin" /> Saving…
          </>
        )}
        {save.status === 'saved' && (
          <>
            <Check size={13} /> {time ? `Saved for this session at ${time}` : 'Saved for this session'}
          </>
        )}
      </span>
      <span className="statusbar__item statusbar__mode">{mode === 'edit' ? 'Editing' : 'Viewing'}</span>
    </footer>
  )
}
