import type { Editor, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '../auth/verify'
import { BlockHandle } from '../editor/BlockHandle'
import { editorExtensions } from '../editor/extensions'
import { EditableContext } from '../editor/lib/mode'
import { textStats, type TextStats } from '../editor/lib/textStats'
import { OutlinePanel } from '../editor/panels/OutlinePanel'
import { PropertyPane } from '../editor/panels/PropertyPane'
import { Toolbar } from '../editor/toolbar/Toolbar'
import type { PageRecord, PageStore } from '../pages/store'
import { navigate, routes } from './router'
import { StatusBar } from './StatusBar'
import { TopBar, type ThemeState } from './TopBar'

export type Mode = 'edit' | 'view'
export type SaveState = { status: 'saved' | 'saving' | 'error' | 'readonly'; at: Date | null }

function useDebouncedStats(editor: Editor) {
  const [stats, setStats] = useState<TextStats>(() => textStats(editor.getJSON()))
  useEffect(() => {
    let timer = 0
    const update = () => {
      clearTimeout(timer)
      timer = window.setTimeout(() => setStats(textStats(editor.getJSON())), 250)
    }
    editor.on('update', update)
    return () => {
      clearTimeout(timer)
      editor.off('update', update)
    }
  }, [editor])
  return stats
}

/** Debounced save of the document into the user's session store. */
function useAutosave(editor: Editor, page: PageRecord, store: PageStore) {
  const [save, setSave] = useState<SaveState>({ status: page.template ? 'readonly' : 'saved', at: null })
  useEffect(() => {
    if (page.template) return
    let timer = 0
    let pending = false
    const flush = () => {
      pending = false
      store.update(page.id, { doc: editor.getJSON() })
      setSave({ status: 'saved', at: new Date() })
    }
    const onUpdate = ({ transaction }: { transaction: { getMeta: (key: string) => unknown } }) => {
      // Ids assigned when the page opens are bookkeeping, not an edit.
      if (transaction.getMeta('addToHistory') === false) return
      pending = true
      setSave(s => ({ ...s, status: 'saving' }))
      clearTimeout(timer)
      timer = window.setTimeout(flush, 500)
    }
    editor.on('update', onUpdate)
    return () => {
      clearTimeout(timer)
      editor.off('update', onUpdate)
      // Don't lose the last keystrokes when leaving the page.
      if (pending) store.update(page.id, { doc: editor.getJSON() })
    }
  }, [editor, page.id, page.template, store])
  return save
}

export function EditorScreen({
  page,
  store,
  session,
  theme,
}: {
  page: PageRecord
  store: PageStore
  session: Session
  theme: ThemeState
}) {
  const readOnly = page.template
  const [mode, setMode] = useState<Mode>(readOnly ? 'view' : 'edit')
  // Side panels overlay the page on narrow screens, so start with them closed there.
  const [outlineOpen, setOutlineOpen] = useState(() => window.innerWidth > 1100)
  const [paneOpen, setPaneOpen] = useState(() => window.innerWidth > 1100)
  const canvasRef = useRef<HTMLElement>(null)
  const extensions = useMemo(() => editorExtensions(), [])

  const editor = useEditor({
    extensions,
    content: page.doc,
    immediatelyRender: true,
    editable: !readOnly,
    editorProps: {
      attributes: { class: 'pg-content', 'aria-label': 'Page content', spellcheck: 'true' },
    },
  })

  useEffect(() => {
    editor.setEditable(!readOnly && mode === 'edit')
  }, [editor, mode, readOnly])

  const stats = useDebouncedStats(editor)
  const save = useAutosave(editor, page, store)
  const pageWidth = useEditorState({ editor, selector: ({ editor: e }) => (e.state.doc.attrs.pageWidth as string) ?? 'standard' })

  const replaceDocument = useCallback(
    (content: JSONContent) => {
      editor.commands.setContent(content, { emitUpdate: true })
      editor.commands.expandAll()
      canvasRef.current?.scrollTo({ top: 0 })
    },
    [editor],
  )

  const clone = useCallback(() => {
    const copy = store.clone({ ...page, doc: editor.getJSON() })
    navigate(routes.page(copy.id))
  }, [editor, page, store])

  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onScroll = () => {
      const max = canvas.scrollHeight - canvas.clientHeight
      setProgress(max > 0 ? canvas.scrollTop / max : 0)
    }
    canvas.addEventListener('scroll', onScroll, { passive: true })
    return () => canvas.removeEventListener('scroll', onScroll)
  }, [])

  const editing = !readOnly && mode === 'edit'

  return (
    <div className="app" data-mode={editing ? 'edit' : 'view'}>
      <TopBar
        editor={editor}
        page={page}
        session={session}
        mode={editing ? 'edit' : 'view'}
        onModeChange={setMode}
        theme={theme}
        outlineOpen={outlineOpen}
        onToggleOutline={() => setOutlineOpen(v => !v)}
        paneOpen={paneOpen}
        onTogglePane={() => setPaneOpen(v => !v)}
        onReplace={replaceDocument}
        onRename={title => store.update(page.id, { title })}
        onClone={clone}
      />
      {editing && <Toolbar editor={editor} />}
      {readOnly && (
        <div className="readonly-banner" role="status">
          <span>
            <strong>Read-only template.</strong> Clone it to get your own copy you can edit and play around with.
          </span>
          <button type="button" className="btn btn--primary" onClick={clone}>
            Clone to edit
          </button>
        </div>
      )}
      <div className="app__body">
        {outlineOpen && <OutlinePanel editor={editor} stats={stats} canvasRef={canvasRef} onClose={() => setOutlineOpen(false)} />}
        <main className="pg-canvas" ref={canvasRef}>
          {!editing && <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />}
          <EditableContext.Provider value={editing}>
            <div className="pg-page" data-width={pageWidth} data-mode={editing ? 'edit' : 'view'}>
              <EditorContent editor={editor} />
              {editing && <BlockHandle editor={editor} />}
            </div>
          </EditableContext.Provider>
        </main>
        {editing && paneOpen && <PropertyPane editor={editor} stats={stats} onClose={() => setPaneOpen(false)} />}
      </div>
      <StatusBar stats={stats} save={save} mode={editing ? 'edit' : 'view'} />
    </div>
  )
}
