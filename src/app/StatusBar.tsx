import { BookOpen, Check, CircleAlert, LoaderCircle } from 'lucide-react'
import type { Mode, SaveState } from '../App'
import type { TextStats } from '../editor/lib/textStats'

export function StatusBar({ stats, save, mode }: { stats: TextStats; save: SaveState; mode: Mode }) {
  const time = save.at?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <footer className="statusbar">
      <span className="statusbar__item">
        <BookOpen size={13} /> {stats.readingMinutes} min read
      </span>
      <span className="statusbar__item">{stats.words.toLocaleString()} words</span>
      <span className="statusbar__item">{stats.characters.toLocaleString()} characters</span>
      <span className="statusbar__spacer" />
      <span className="statusbar__item" data-status={save.status} aria-live="polite">
        {save.status === 'saving' && (
          <>
            <LoaderCircle size={13} className="spin" /> Saving…
          </>
        )}
        {save.status === 'saved' && (
          <>
            <Check size={13} /> {time ? `Saved locally at ${time}` : 'Saved locally'}
          </>
        )}
        {save.status === 'error' && (
          <>
            <CircleAlert size={13} /> Could not save to this browser
          </>
        )}
      </span>
      <span className="statusbar__item statusbar__mode">{mode === 'edit' ? 'Editing' : 'Viewing'}</span>
    </footer>
  )
}
