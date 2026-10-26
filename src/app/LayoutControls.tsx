import { Check, Download, FileText, LoaderCircle, PanelsTopBottom, Presentation, RectangleHorizontal, RectangleVertical, ScrollText, Settings2, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { ExportKind } from '../editor/export/run'
import type { LayoutMode, PageSettings } from '../editor/pagination/settings'
import { Field, Segmented } from '../editor/ui/controls'
import { useDismiss } from './TopBar'

export const LAYOUTS: Array<{ value: LayoutMode; label: string; title: string; Icon: LucideIcon }> = [
  { value: 'portrait', label: 'Portrait', title: 'Portrait: Word-style pages with automatic page breaks', Icon: RectangleVertical },
  { value: 'landscape', label: 'Landscape', title: 'Landscape: 16:9 PowerPoint-style slides with automatic breaks', Icon: RectangleHorizontal },
  { value: 'canvas', label: 'Canvas', title: 'Canvas: one seamless page, no breaks', Icon: ScrollText },
]

export function LayoutSwitch({ value, onChange }: { value: LayoutMode; onChange: (layout: LayoutMode) => void }) {
  return (
    <div className="mode-switch layout-switch" role="radiogroup" aria-label="Page layout">
      {LAYOUTS.map(({ value: layout, label, title, Icon }) => (
        <button key={layout} type="button" role="radio" aria-checked={value === layout} aria-label={label} title={title} onClick={() => onChange(layout)}>
          <Icon size={15} /> <span className="mode-switch__label">{label}</span>
        </button>
      ))}
    </div>
  )
}

/** The layout choice as ⋯ menu items, for phones. */
export function LayoutMenuItems({ value, onChange, close }: { value: LayoutMode; onChange: (layout: LayoutMode) => void; close: () => void }) {
  return (
    <>
      {LAYOUTS.map(({ value: layout, label, Icon }) => (
        <button
          key={layout}
          type="button"
          role="menuitemradio"
          aria-checked={value === layout}
          className="menu__phone-only"
          onClick={() => {
            close()
            onChange(layout)
          }}
        >
          <Icon size={15} /> {label}
          {value === layout && <Check size={14} className="menu__check" />}
        </button>
      ))}
      <hr className="menu__phone-only" />
    </>
  )
}

/** Paper and margins, plus the way into the header & footer editor. */
export function PageSetupMenu({ settings, onChange, onHeaderFooter }: { settings: PageSettings; onChange: (settings: PageSettings) => void; onHeaderFooter: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const set = (patch: Partial<PageSettings>) => onChange({ ...settings, ...patch })
  return (
    <div className="menu topbar__setup" ref={ref}>
      <button type="button" className="icon-btn" title="Page setup" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <Settings2 size={18} />
      </button>
      {open && (
        <div className="menu__panel page-setup" role="dialog" aria-label="Page setup">
          <div className="page-setup__title">Page setup</div>
          <Field label="Portrait paper" hint="Landscape pages are always 16:9 PowerPoint slides.">
            <Segmented value={settings.size} onChange={size => set({ size })} options={(['A4', 'Letter', 'Legal'] as const).map(v => ({ value: v, label: v }))} />
          </Field>
          <Field label="Margins">
            <Segmented
              value={settings.margins}
              onChange={margins => set({ margins })}
              options={[
                { value: 'narrow', label: 'Narrow' },
                { value: 'normal', label: 'Normal' },
                { value: 'wide', label: 'Wide' },
              ]}
            />
          </Field>
          <button
            type="button"
            className="btn page-setup__more"
            onClick={() => {
              setOpen(false)
              onHeaderFooter()
            }}
          >
            <PanelsTopBottom size={15} /> Header, footer &amp; page numbers…
          </button>
        </div>
      )}
    </div>
  )
}

const EXPORTS: Array<{ kind: ExportKind; label: string; hint: string; Icon: LucideIcon }> = [
  { kind: 'pdf', label: 'PDF document', hint: 'Exactly as laid out (canvas pages print as portrait)', Icon: FileText },
  { kind: 'docx', label: 'Word document (.docx)', hint: 'Editable text on portrait pages', Icon: FileText },
  { kind: 'pptx', label: 'PowerPoint (.pptx)', hint: 'Editable 16:9 slides', Icon: Presentation },
]

export function DownloadMenu({ busy, onExport }: { busy: ExportKind | null; onExport: (kind: ExportKind) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icon-btn" title={busy ? 'Preparing download…' : 'Download'} aria-haspopup="menu" aria-expanded={open} disabled={!!busy} onClick={() => setOpen(v => !v)}>
        {busy ? <LoaderCircle size={18} className="spin" /> : <Download size={18} />}
      </button>
      {open && (
        <div className="menu__panel download-menu" role="menu">
          <div className="menu__user">Download as</div>
          {EXPORTS.map(({ kind, label, hint, Icon }) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onExport(kind)
              }}
            >
              <Icon size={15} />
              <span>
                {label}
                <small>{hint}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
