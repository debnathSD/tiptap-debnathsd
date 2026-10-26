import type { Editor, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '../auth/verify'
import { BlockHandle } from '../editor/BlockHandle'
import { TableControls } from '../editor/TableControls'
import { EXPORT_LABELS, exportLayout, runExporter, type ExportKind } from '../editor/export/run'
import { editorExtensions } from '../editor/extensions'
import { HeaderFooterPanel, type HeaderFooterFocus } from '../editor/pagination/HeaderFooterPanel'
import { PageSheet } from '../editor/pagination/PageSheet'
import { pageBreaks, waitForPagination } from '../editor/pagination/pagination'
import { formatDate, isPaged, type HeaderFooterZone, type LayoutMode, type PageSettings, type PageVars } from '../editor/pagination/settings'
import { EditableContext } from '../editor/lib/mode'
import { textStats, type TextStats } from '../editor/lib/textStats'
import { OutlinePanel } from '../editor/panels/OutlinePanel'
import { PropertyPane } from '../editor/panels/PropertyPane'
import { Toolbar } from '../editor/toolbar/Toolbar'
import type { PageRecord, PageStore } from '../pages/store'
import { DownloadMenu, LayoutMenuItems, LayoutSwitch, PageSetupMenu } from './LayoutControls'
import { navigate, routes } from './router'
import { StatusBar } from './StatusBar'
import { TopBar, type ThemeState } from './TopBar'

export type Mode = 'edit' | 'view'
export type SaveState = { status: 'saved' | 'saving' | 'error' | 'readonly'; at: Date | null }
export type ExportState = { kind: ExportKind; status: 'working' | 'done' | 'error'; message?: string } | null

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
  const [right, setRight] = useState<'properties' | 'headerFooter' | null>(() => (window.innerWidth > 1100 ? 'properties' : null))
  const [hfFocus, setHfFocus] = useState<HeaderFooterFocus | null>(null)
  const canvasRef = useRef<HTMLElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Layout, paper, header and footer. Read-only templates can still switch layout; it just isn't saved.
  const [settings, setSettings] = useState<PageSettings>(page.settings)
  const [exporting, setExporting] = useState<ExportState>(null)
  /** While a download renders, the page switches to the layout that file needs (Word = portrait, PowerPoint = slides). */
  const [renderLayout, setRenderLayout] = useState<LayoutMode | null>(null)
  const effective = useMemo(() => (renderLayout ? { ...settings, layout: renderLayout } : settings), [settings, renderLayout])
  const vars = useMemo<PageVars>(() => ({ title: page.title.trim() || 'Untitled page', author: page.createdBy, date: formatDate(new Date()) }), [page.title, page.createdBy])

  const extensions = useMemo(() => editorExtensions(page.settings, vars), []) // eslint-disable-line react-hooks/exhaustive-deps

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
  useEffect(() => {
    editor.commands.setPageSettings(effective)
  }, [editor, effective])
  useEffect(() => {
    editor.commands.setPageVars(vars)
  }, [editor, vars])

  const stats = useDebouncedStats(editor)
  const save = useAutosave(editor, page, store)
  const pageWidth = useEditorState({ editor, selector: ({ editor: e }) => (e.state.doc.attrs.pageWidth as string) ?? 'standard' })
  const totalPages = useEditorState({ editor, selector: ({ editor: e }) => pageBreaks(e.state)?.total ?? 1 })

  const updateSettings = useCallback(
    (next: PageSettings) => {
      setSettings(next)
      if (!readOnly) store.update(page.id, { settings: next })
    },
    [page.id, readOnly, store],
  )

  const openHeaderFooter = (zone: HeaderFooterZone = 'footer') => {
    if (readOnly) return
    setMode('edit')
    setRight('headerFooter')
    setHfFocus({ zone, nonce: Date.now() })
  }

  const replaceDocument = useCallback(
    (content: JSONContent) => {
      editor.commands.setContent(content, { emitUpdate: true })
      editor.commands.expandAll()
      canvasRef.current?.scrollTo({ top: 0 })
    },
    [editor],
  )

  const clone = useCallback(() => {
    const copy = store.clone({ ...page, doc: editor.getJSON(), settings })
    navigate(routes.page(copy.id))
  }, [editor, page, settings, store])

  const runExport = async (kind: ExportKind) => {
    if (!sheetRef.current || exporting?.status === 'working') return
    const wasEditing = mode === 'edit'
    const layout = exportLayout(kind, settings)
    setExporting({ kind, status: 'working' })
    setMode('view') // no editing chrome in the captures
    setRenderLayout(layout)
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      await waitForPagination(editor)
      await runExporter(kind, { editor, sheet: sheetRef.current!, title: page.title, settings: { ...settings, layout }, vars, dark: theme.resolved === 'dark' })
      setExporting({ kind, status: 'done' })
    } catch (error) {
      console.error(error)
      setExporting({ kind, status: 'error', message: (error as Error).message })
    } finally {
      setRenderLayout(null)
      if (wasEditing) setMode('edit')
    }
  }
  useEffect(() => {
    if (!exporting || exporting.status === 'working') return
    const timer = setTimeout(() => setExporting(null), exporting.status === 'done' ? 4000 : 10000)
    return () => clearTimeout(timer)
  }, [exporting])

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
  const busy = exporting?.status === 'working'
  const paged = isPaged(effective)

  return (
    <div className="app" data-mode={editing ? 'edit' : 'view'} data-exporting={busy || undefined} data-hf-editing={(editing && right === 'headerFooter' && !busy) || undefined}>
      <TopBar
        editor={editor}
        page={page}
        session={session}
        mode={editing ? 'edit' : 'view'}
        onModeChange={setMode}
        theme={theme}
        outlineOpen={outlineOpen}
        onToggleOutline={() => setOutlineOpen(v => !v)}
        paneOpen={right === 'properties'}
        onTogglePane={() => setRight(right === 'properties' ? null : 'properties')}
        layoutControls={
          <>
            <LayoutSwitch value={effective.layout} onChange={layout => updateSettings({ ...settings, layout })} />
            {!readOnly && (
              <PageSetupMenu settings={settings} onChange={updateSettings} onHeaderFooter={() => openHeaderFooter()} />
            )}
            <DownloadMenu busy={busy ? exporting!.kind : null} onExport={runExport} />
          </>
        }
        phoneMenu={close => <LayoutMenuItems value={effective.layout} onChange={layout => updateSettings({ ...settings, layout })} close={close} />}
        headerFooterOpen={editing && right === 'headerFooter'}
        onToggleHeaderFooter={() => (editing && right === 'headerFooter' ? setRight(null) : openHeaderFooter())}
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
        <main className="pg-canvas" ref={canvasRef} data-paged={paged || undefined}>
          {!editing && <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />}
          <EditableContext.Provider value={editing}>
            <PageSheet settings={effective} sheetRef={sheetRef} fit={!busy} onEditBand={readOnly ? undefined : openHeaderFooter}>
              <div className="pg-page" data-width={pageWidth} data-mode={editing ? 'edit' : 'view'}>
                <EditorContent editor={editor} />
                {editing && <BlockHandle editor={editor} />}
                {editing && !busy && <TableControls editor={editor} />}
              </div>
            </PageSheet>
          </EditableContext.Provider>
        </main>
        {editing && right === 'properties' && <PropertyPane editor={editor} stats={stats} onClose={() => setRight(null)} />}
        {editing && right === 'headerFooter' && (
          <HeaderFooterPanel settings={settings} vars={vars} total={totalPages} focus={hfFocus} onChange={updateSettings} onClose={() => setRight(null)} />
        )}
      </div>
      <StatusBar
        stats={stats}
        save={save}
        mode={editing ? 'edit' : 'view'}
        layout={effective.layout === 'portrait' ? `${totalPages} page${totalPages === 1 ? '' : 's'} · ${settings.size} portrait` : effective.layout === 'landscape' ? `${totalPages} slide${totalPages === 1 ? '' : 's'} · 16:9` : 'Seamless canvas'}
        notice={
          exporting && (exporting.status === 'working' ? `Preparing ${EXPORT_LABELS[exporting.kind]}…` : exporting.status === 'done' ? `${EXPORT_LABELS[exporting.kind]} downloaded` : `Download failed: ${exporting.message}`)
        }
        noticeTone={exporting?.status === 'error' ? 'bad' : undefined}
      />
    </div>
  )
}
