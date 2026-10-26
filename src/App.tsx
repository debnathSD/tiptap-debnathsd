import type { Editor, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StatusBar } from './app/StatusBar'
import { TopBar } from './app/TopBar'
import type { useTheme } from './app/useTheme'
import { BlockHandle } from './editor/BlockHandle'
import { samplePage } from './editor/content/samplePage'
import { editorExtensions } from './editor/extensions'
import { clearSavedDocument, loadSavedDocument, saveDocument } from './editor/lib/exportPage'
import { EditableContext } from './editor/lib/mode'
import { textStats, type TextStats } from './editor/lib/textStats'
import { OutlinePanel } from './editor/panels/OutlinePanel'
import { PropertyPane } from './editor/panels/PropertyPane'
import { Toolbar } from './editor/toolbar/Toolbar'

export type Mode = 'edit' | 'view'
export type SaveState = { status: 'saved' | 'saving' | 'error'; at: Date | null }

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

function useAutosave(editor: Editor) {
  const [save, setSave] = useState<SaveState>({ status: 'saved', at: null })
  useEffect(() => {
    let timer = 0
    const onUpdate = () => {
      setSave(s => ({ ...s, status: 'saving' }))
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        const ok = saveDocument(editor.getJSON())
        setSave({ status: ok ? 'saved' : 'error', at: new Date() })
      }, 600)
    }
    editor.on('update', onUpdate)
    return () => {
      clearTimeout(timer)
      editor.off('update', onUpdate)
    }
  }, [editor])
  return save
}

export default function App({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const [mode, setMode] = useState<Mode>('edit')
  // Side panels overlay the page on narrow screens, so start with them closed there.
  const [outlineOpen, setOutlineOpen] = useState(() => window.innerWidth > 1100)
  const [paneOpen, setPaneOpen] = useState(() => window.innerWidth > 1100)
  const canvasRef = useRef<HTMLElement>(null)
  const extensions = useMemo(() => editorExtensions(), [])

  const editor = useEditor({
    extensions,
    content: loadSavedDocument() ?? samplePage(),
    immediatelyRender: true,
    editorProps: {
      attributes: { class: 'pg-content', 'aria-label': 'Page content', spellcheck: 'true' },
    },
  })

  useEffect(() => {
    editor.setEditable(mode === 'edit')
  }, [editor, mode])

  const stats = useDebouncedStats(editor)
  const save = useAutosave(editor)
  const pageWidth = useEditorState({ editor, selector: ({ editor: e }) => (e.state.doc.attrs.pageWidth as string) ?? 'standard' })

  const replaceDocument = useCallback(
    (content: JSONContent) => {
      editor.commands.setContent(content, { emitUpdate: true })
      editor.commands.expandAll()
      canvasRef.current?.scrollTo({ top: 0 })
    },
    [editor],
  )

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

  return (
    <div className="app" data-mode={mode}>
      <TopBar
        editor={editor}
        mode={mode}
        onModeChange={setMode}
        theme={theme}
        outlineOpen={outlineOpen}
        onToggleOutline={() => setOutlineOpen(v => !v)}
        paneOpen={paneOpen}
        onTogglePane={() => setPaneOpen(v => !v)}
        onReplace={replaceDocument}
        onReset={() => {
          clearSavedDocument()
          replaceDocument(samplePage())
        }}
      />
      {mode === 'edit' && <Toolbar editor={editor} />}
      <div className="app__body">
        {outlineOpen && <OutlinePanel editor={editor} stats={stats} canvasRef={canvasRef} onClose={() => setOutlineOpen(false)} />}
        <main className="pg-canvas" ref={canvasRef}>
          {mode === 'view' && <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />}
          <EditableContext.Provider value={mode === 'edit'}>
            <div className="pg-page" data-width={pageWidth} data-mode={mode}>
              <EditorContent editor={editor} />
              {mode === 'edit' && <BlockHandle editor={editor} />}
            </div>
          </EditableContext.Provider>
        </main>
        {mode === 'edit' && paneOpen && <PropertyPane editor={editor} stats={stats} onClose={() => setPaneOpen(false)} />}
      </div>
      <StatusBar stats={stats} save={save} mode={mode} />
    </div>
  )
}
