import shots from './shots.json'

/**
 * The product tour, shared by the Remotion video (video/) and the in-app
 * animated tutorial. Highlights point at element rects recorded by
 * video/scripts/capture.mjs on the real, running app.
 */

export type Rect = [x: number, y: number, w: number, h: number]

export type ShotManifest = {
  viewport: { width: number; height: number }
  shots: Record<string, { file: string; theme: 'light' | 'dark'; viewport: { width: number; height: number }; rects: Record<string, Rect> }>
  crops: Record<string, { file: string; width: number; height: number }>
}

export const SHOTS = shots as unknown as ShotManifest

export type Highlight = {
  /** Rect name in the shot manifest. */
  target: string
  /** Video only: frame within the chapter when the camera starts moving here. */
  at: number
  /** Optional zoom; otherwise the target is framed at ~55% of the window. */
  zoom?: number
  /** Whether the cursor travels to and clicks the target. */
  click?: boolean
  label?: string
  /** Put the label under the target, e.g. when the space above holds content it would cover. */
  labelBelow?: boolean
}

export type TourStep = {
  shot: string
  title: string
  body: string
  points: string[]
  hint?: string
  highlights: Highlight[]
}

const ALL_STEPS: TourStep[] = [
  {
    shot: 'signin',
    title: 'A private workspace',
    body: 'Pages opens behind a sign-in screen, so only your team reaches the editor.',
    points: ['Sign in with your workspace ID', 'Stay signed in on trusted devices', 'Sign out any time from the ⋯ menu'],
    highlights: [
      { target: 'card', at: 16, zoom: 1.35, label: 'Sign in' },
      { target: 'submit', at: 96, zoom: 1.9, click: true },
    ],
  },
  {
    shot: 'pages',
    title: 'All your pages in one list',
    body: 'The home screen lists every page you can open: its name, type, author, creation date, last change and length.',
    points: ['Create a page with one click', 'Rename, clone or delete your own pages', 'The status report is a read-only template'],
    highlights: [
      { target: 'create', at: 14, zoom: 1.9, click: true, label: 'Create new page' },
      { target: 'table', at: 78, zoom: 1.15, label: 'Name, author, dates' },
      { target: 'cloneTemplate', at: 140, zoom: 1.9, click: true, label: 'Clone the template' },
    ],
  },
  {
    shot: 'template',
    title: 'Templates are read-only',
    body: 'Open the template to read it. To change anything, clone it and you get your own editable copy to play around with.',
    points: ['Nothing can change the original', 'Clone to edit makes your own copy', 'Copies last for your browser session'],
    highlights: [
      { target: 'banner', at: 14, zoom: 1.35, label: 'Read-only template' },
      { target: 'clone', at: 96, zoom: 2.0, click: true, label: 'Clone to edit' },
    ],
  },
  {
    shot: 'regions',
    title: 'Lay out regions',
    body: 'Every page is a stack of sections. Pick a column layout, then move, duplicate or delete sections from their toolbar.',
    points: ['One, two, three or one-third columns', 'Hover a section for its toolbar', 'Click + below a section to add another'],
    highlights: [
      { target: 'section', at: 14, zoom: 1.2, label: 'Two-column section' },
      { target: 'toolbar', at: 74, zoom: 2.0, label: 'Section toolbar' },
      { target: 'menu', at: 130, zoom: 1.7, click: true, label: 'Choose a layout' },
    ],
  },
  {
    shot: 'slash',
    title: 'Type “/” to insert',
    body: 'One searchable catalog holds text styles, regions, web parts and data blocks, wherever your cursor is.',
    points: ['Filter as you type, Enter to insert', 'Same catalog behind the Insert button', 'Hover any block and click + to add below'],
    hint: '/ opens the block catalog',
    highlights: [
      { target: 'caret', at: 14, zoom: 2.1, label: 'Type /' },
      { target: 'menu', at: 70, zoom: 1.55, click: true, label: 'Pick a block' },
      { target: 'insert', at: 140, zoom: 2.0, label: 'Or use Insert' },
    ],
  },
  {
    shot: 'pane',
    title: 'Configure in the property pane',
    body: 'Click any web part and its settings open on the right. Every change shows up on the page immediately.',
    points: ['Select a web part to edit it', 'Add, reorder and tune each tile', 'Breadcrumb jumps to the section or page'],
    highlights: [
      { target: 'kpis', at: 14, zoom: 1.35, click: true, label: 'KPI tiles' },
      { target: 'items', at: 80, zoom: 1.6, label: 'Edit tiles live' },
      { target: 'crumbs', at: 140, zoom: 2.0, label: 'Page › Section › KPI tiles' },
    ],
  },
  {
    shot: 'colors',
    title: 'Color regions and blocks',
    body: 'Give a whole region a soft or strong background, or color a single block with a tint, a solid fill or an accent bar.',
    points: ['Soft or strong region backgrounds', 'Ten-color palette plus custom hex', 'Looks right in light and dark mode'],
    highlights: [
      { target: 'section', at: 14, zoom: 1.4, label: 'Teal region' },
      { target: 'swatches', at: 84, zoom: 2.1, click: true, label: 'Pick a background' },
      { target: 'heading', at: 146, zoom: 1.5, label: 'Accent-bar heading' },
    ],
  },
  {
    shot: 'fold',
    title: 'Fold and jump',
    body: 'Any heading folds everything up to the next heading of its level, even across regions. The outline jumps to any section.',
    points: ['Fold from the heading chevron', 'Outline in both edit and view mode', 'Readers can fold too, and nothing goes into undo'],
    highlights: [
      { target: 'toggle', at: 14, zoom: 2.0, click: true, label: 'Folded section' },
      { target: 'outline', at: 92, zoom: 1.45, label: 'On this page' },
    ],
  },
  {
    shot: 'webparts',
    title: 'Callouts, FAQs, links and cards',
    body: 'Ready-made web parts: FAQs that fold their answers, quick links in four styles, and editorial cards with images.',
    points: ['FAQ callouts with show / hide', 'Quick links as tiles, list or buttons', 'Cards with image, text and call to action'],
    highlights: [
      { target: 'faq', at: 14, zoom: 1.6, click: true, label: 'Collapsible FAQ' },
      { target: 'links', at: 78, zoom: 1.6, label: 'Quick links' },
      { target: 'cards', at: 140, zoom: 1.2, label: 'Editorial cards' },
    ],
  },
  {
    shot: 'data',
    title: 'Data that reads at a glance',
    body: 'Status-report blocks: bar charts with honest axes, inline status pills and styled tables with colored cells.',
    points: ['Charts with non-zero axes and highlights', 'Status pills for On track or At risk', 'Striped, minimal and grid tables'],
    highlights: [
      { target: 'chart', at: 14, zoom: 1.5, label: 'Axis 97–98.5%, not zero' },
      { target: 'table', at: 96, zoom: 1.3, label: 'Movement pills' },
    ],
  },
  {
    shot: 'layouts',
    title: 'Pages, slides or one canvas',
    body: 'Lay a page out as Word-style pages, 16:9 PowerPoint slides or one seamless canvas. Content flows onto the next page by itself.',
    points: ['Portrait: A4, Letter or Legal pages', 'Landscape: 13.33 × 7.5 in slides', 'Automatic breaks, or add one with /page'],
    highlights: [
      { target: 'layoutSwitch', at: 14, zoom: 2.0, click: true, label: 'Portrait · Landscape · Canvas' },
      { target: 'gap', at: 80, zoom: 1.35, label: 'Automatic page breaks' },
      { target: 'status', at: 142, zoom: 2.1, label: 'Slides counted live' },
    ],
  },
  {
    shot: 'headerFooter',
    title: 'Headers and footers',
    body: 'Double-click a page margin to edit its header or footer. Mix your own text with fields that fill in on every page.',
    points: ['Left, center and right slots', 'Page number, count, title, author, date', 'Different first page and divider lines'],
    highlights: [
      { target: 'gap', at: 14, zoom: 1.45, click: true, label: 'Footer and header on every page' },
      { target: 'slots', at: 80, zoom: 1.9, label: 'Left · center · right' },
      { target: 'fields', at: 142, zoom: 1.9, click: true, label: 'Insert a field' },
    ],
  },
  {
    shot: 'downloads',
    title: 'Download as PDF, Word or PowerPoint',
    body: 'Take a page anywhere: a PDF exactly as laid out, an editable Word document, or a PowerPoint deck with one slide per page.',
    points: ['PDF: one page per sheet', 'Word: real headings, tables, page numbers', 'PowerPoint: editable text on 16:9 slides'],
    highlights: [
      { target: 'button', at: 14, zoom: 2.1, click: true, label: 'Download' },
      { target: 'menu', at: 80, zoom: 1.8, label: 'PDF · Word · PowerPoint' },
      { target: 'pptx', at: 142, zoom: 2.1, click: true, label: 'Editable 16:9 slides', labelBelow: true },
    ],
  },
]

/** Steps whose screenshot has been captured (see video/scripts/capture.mjs). */
export const TOUR_STEPS = ALL_STEPS.filter(step => SHOTS.shots[step.shot])

/** Camera framing for a highlight: zoom level and the point to center. */
export function frameTarget(rect: Rect | undefined, scale: number, win: { w: number; h: number }, zoom?: number) {
  if (!rect) return { z: 1, cx: win.w / 2, cy: win.h / 2 }
  const [x, y, w, h] = rect.map(v => v * scale)
  const z = zoom ?? Math.max(1.15, Math.min(2.1, Math.min((win.w * 0.55) / w, (win.h * 0.55) / h)))
  return { z, cx: x + w / 2, cy: y + h / 2 }
}

/** Translate so the focus point sits mid-window without exposing the screenshot's edges. */
export function cameraTransform(cam: { z: number; cx: number; cy: number }, win: { w: number; h: number }) {
  const tx = Math.min(0, Math.max(win.w - win.w * cam.z, win.w / 2 - cam.cx * cam.z))
  const ty = Math.min(0, Math.max(win.h - win.h * cam.z, win.h / 2 - cam.cy * cam.z))
  return { tx, ty }
}
