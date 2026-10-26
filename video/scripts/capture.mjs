#!/usr/bin/env node
/**
 * Capture real screenshots of the running app for the demo video and the
 * in-app tour, plus the on-screen position of every UI element a scene
 * points at (cursor targets, spotlights).
 *
 *   APP_URL=http://localhost:4317 npm run capture
 *
 * Signs in by placing a session for the first account (its digest is
 * public) under a fictional display name, so no credentials are needed or
 * shown. Editing shots run on a clone of the read-only template, made through
 * the real "Clone" button.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const APP_URL = process.env.APP_URL ?? 'http://localhost:4317/'
const root = fileURLToPath(new URL('../../', import.meta.url))
const outDir = `${root}public/tour/shots/`
mkdirSync(outDir, { recursive: true })

const credentials = readFileSync(`${root}src/auth/credentials.ts`, 'utf8')
const session = JSON.stringify({ user: 'alex.morgan', account: credentials.match(/hash: '([^']+)'/)[1] })

const VIEWPORT = { width: 1440, height: 900 }
const manifest = { viewport: VIEWPORT, shots: {}, crops: {} }

const browser = await chromium.launch()

async function open({ theme = 'light', signedIn = true, viewport = VIEWPORT, scale = 2 } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, colorScheme: theme })
  await context.addInitScript(
    ([token, themeChoice, signed]) => {
      try {
        localStorage.removeItem('tiptap-pages:document:v1')
        localStorage.setItem('tiptap-pages:theme', themeChoice)
        if (signed) sessionStorage.setItem('tiptap-pages:session', token)
      } catch {}
    },
    [session, theme, signedIn],
  )
  const page = await context.newPage()
  await page.goto(APP_URL)
  await page.addStyleTag({ content: '* { scroll-behavior: auto !important; caret-color: transparent !important; }' })
  if (signedIn) await page.waitForSelector('.home')
  await page.waitForTimeout(300)
  return { context, page }
}

/** From the pages list, clone the template with the real button and open the copy. */
async function openClone(page, mode = 'edit') {
  await page.click('tr[data-template] .row-actions button')
  await page.waitForSelector('.ProseMirror[contenteditable="true"]')
  await page.addStyleTag({ content: '* { scroll-behavior: auto !important; caret-color: transparent !important; }' })
  await page.waitForTimeout(400)
  if (mode === 'view') {
    await page.click('.mode-switch button[aria-label="View"]')
    await page.waitForTimeout(300)
  }
}

/** Bounding boxes (CSS px, relative to the viewport) for named selectors. */
async function rects(page, targets) {
  const out = {}
  for (const [name, selector] of Object.entries(targets)) {
    const box = await page.evaluate(sel => {
      const el = typeof sel === 'string' ? document.querySelector(sel) : null
      if (!el) return null
      const r = el.getBoundingClientRect()
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]
    }, selector)
    if (box) out[name] = box
  }
  return out
}

async function shot(page, name, { title, caption, targets = {}, viewport = VIEWPORT, theme = 'light' }) {
  await page.waitForTimeout(350)
  const file = `${name}.jpg`
  await page.screenshot({ path: outDir + file, type: 'jpeg', quality: 86 })
  manifest.shots[name] = { file, title, caption, theme, viewport, rects: await rects(page, targets) }
  console.log('shot', name)
}

// In-page helpers, run through page.evaluate.
const editor = page => ({
  run: (fn, arg) => page.evaluate(fn, arg),
  mode: async mode => {
    await page.click(`.mode-switch button[aria-label="${mode === 'edit' ? 'Edit' : 'View'}"]`)
    await page.waitForTimeout(250)
  },
  scrollTo: async (selector, offset = 24) => {
    await page.evaluate(
      ([sel, off]) => {
        const canvas = document.querySelector('.pg-canvas')
        const el = document.querySelector(sel)
        if (!canvas || !el) return
        canvas.scrollTop += el.getBoundingClientRect().top - canvas.getBoundingClientRect().top - off
      },
      [selector, offset],
    )
    await page.waitForTimeout(200)
  },
  cursorAfterText: text =>
    page.evaluate(t => {
      const ed = document.querySelector('.ProseMirror').editor
      let target = null
      ed.state.doc.descendants((node, pos) => {
        if (target === null && node.isTextblock && node.textContent.includes(t)) target = pos + node.nodeSize - 1
      })
      ed.chain().focus().setTextSelection(target).run()
    }, text),
  selectNode: (type, index = 0) =>
    page.evaluate(
      ([t, i]) => {
        const ed = document.querySelector('.ProseMirror').editor
        const found = []
        ed.state.doc.descendants((node, pos) => {
          if (node.type.name === t) found.push(pos)
        })
        ed.chain().focus().setNodeSelection(found[i]).run()
      },
      [type, index],
    ),
  foldHeading: text =>
    page.evaluate(t => {
      const ed = document.querySelector('.ProseMirror').editor
      ed.state.doc.descendants(node => {
        if (node.type.name === 'heading' && node.textContent.includes(t)) ed.commands.toggleCollapsed(node.attrs['data-toc-id'])
      })
    }, text),
})

// ── 1. Sign-in ────────────────────────────────────────────────────────────────
{
  const { context, page } = await open({ signedIn: false })
  await page.fill('input[name="username"]', 'your.name')
  await page.fill('input[name="password"]', 'placeholder')
  await shot(page, 'signin', {
    title: 'Sign in',
    caption: 'Your private workspace opens behind a sign-in screen.',
    targets: { card: '.login__card', user: 'input[name="username"]', password: 'input[name="password"]', submit: '.login__submit' },
  })
  await context.close()
}

// ── 2. Pages list and the read-only template ────────────────────────────────
{
  const { context, page } = await open({ theme: 'light' })
  await page.click('.home__actions .btn--primary')
  await page.fill('dialog input.input', 'Team update — November')
  await page.click('dialog button[type="submit"]')
  await page.waitForSelector('.ProseMirror')
  await page.click('.topbar__back')
  await page.waitForSelector('.home')
  await openClone(page)
  await page.click('.topbar__back')
  await page.waitForSelector('.home')
  await page.mouse.move(900, 480)
  await shot(page, 'pages', {
    title: 'All your pages in one list',
    caption: 'Name, type, author, creation date and last change for every page.',
    targets: { create: '.home__actions .btn--primary', table: '.table-card', cloneTemplate: 'tr[data-template] .row-actions button' },
  })
  await page.click('tr[data-template] a.pages-table__name')
  await page.waitForSelector('.readonly-banner')
  await shot(page, 'template', {
    title: 'Templates are read-only',
    caption: 'Clone the template to get an editable copy.',
    targets: { banner: '.readonly-banner', clone: '.topbar__clone' },
  })
  await context.close()
}

// ── 3. View mode, light: the finished page ───────────────────────────────────
{
  const { context, page } = await open({ theme: 'light' })
  await openClone(page, 'view')
  await shot(page, 'view', {
    title: 'A page, not a document',
    caption: 'Banner, page properties and KPI tiles — the status report as a SharePoint-style page.',
    targets: { banner: '.pg-banner', kpis: '.pg-kpis', outline: '.outline', modeSwitch: '.mode-switch:not(.layout-switch)' },
  })

  // Tall capture of the whole canvas for the scrolling reveal.
  const height = await page.evaluate(() => document.querySelector('.pg-canvas').scrollHeight)
  await page.setViewportSize({ width: VIEWPORT.width, height: height + 80 })
  await page.waitForTimeout(400)
  const canvasBox = await page.evaluate(() => {
    const r = document.querySelector('.pg-canvas').getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  await page.screenshot({ path: `${outDir}page-full.jpg`, type: 'jpeg', quality: 82, clip: canvasBox })
  manifest.shots['page-full'] = { file: 'page-full.jpg', theme: 'light', viewport: { width: canvasBox.width, height: canvasBox.height }, rects: {} }
  console.log('shot page-full')

  // Element crops used as textures on the 3D blocks.
  await page.setViewportSize(VIEWPORT)
  await page.waitForTimeout(300)
  const crops = {
    kpi: '.pg-kpi',
    chart: '.pg-chart',
    callout: '.pg-callout[data-variant="bar"]',
    card: '.pg-card',
    links: '.pg-links',
    table: '.tableWrapper',
    pill: '.pg-kpis',
    faq: '.pg-callout[data-collapsible="true"]',
  }
  for (const [name, selector] of Object.entries(crops)) {
    const el = page.locator(selector).first()
    await el.scrollIntoViewIfNeeded()
    const box = await el.boundingBox()
    await el.screenshot({ path: `${outDir}crop-${name}.jpg`, type: 'jpeg', quality: 88 })
    manifest.crops[name] = { file: `crop-${name}.jpg`, width: Math.round(box.width), height: Math.round(box.height) }
    console.log('crop', name)
  }
  await context.close()
}

// ── 3. Regions: section toolbar and the add-section layout menu ──────────────
{
  const { context, page } = await open({ theme: 'light' })
  await openClone(page)
  const ed = editor(page)
  await ed.scrollTo('.ProseMirror > h2:nth-of-type(1)', 16)
  const sectionSel = '.ProseMirror > .pg-section-view:nth-of-type(3) section.pg-section'
  await ed.cursorAfterText('Nightly job to clean data')
  await page.hover(`${sectionSel} .pg-column`)
  await page.click(`${sectionSel} .pg-add-button`)
  await shot(page, 'regions', {
    title: 'Lay out regions',
    caption: 'Every page is a stack of sections — one, two or three columns, or one-third layouts.',
    targets: { section: sectionSel, toolbar: `${sectionSel} .pg-section__toolbar`, add: `${sectionSel} .pg-add-button`, menu: `${sectionSel} .layout-menu`, pane: '.pane' },
  })
  await context.close()
}

// ── 4. "/" menu ──────────────────────────────────────────────────────────────
{
  const { context, page } = await open({ theme: 'light' })
  await openClone(page)
  const ed = editor(page)
  await ed.cursorAfterText('are published for every drop')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await ed.scrollTo('.ProseMirror > h2:nth-of-type(2)', 40)
  await page.keyboard.type('/')
  await page.waitForSelector('.slash-menu')
  await shot(page, 'slash', {
    title: 'Type “/” to insert',
    caption: 'Sections, web parts and data blocks from one searchable catalog.',
    targets: { menu: '.slash-menu', caret: '.suggestion', insert: '.toolbar__insert' },
  })
  await context.close()
}

// ── 5. Property pane on KPI tiles ────────────────────────────────────────────
{
  const { context, page } = await open({ theme: 'light' })
  await openClone(page)
  const ed = editor(page)
  await ed.selectNode('kpiGrid', 0)
  await ed.scrollTo('.pg-kpis', 120)
  await shot(page, 'pane', {
    title: 'Configure in the property pane',
    caption: 'Click a web part to edit it — tiles, values, status tones and progress, live.',
    targets: { kpis: '.pg-kpis', pane: '.pane', crumbs: '.pane__crumbs', items: '.items-editor' },
  })
  await context.close()
}

// ── 6. Colors on regions and blocks (dark) ───────────────────────────────────
{
  const { context, page } = await open({ theme: 'dark' })
  await openClone(page)
  const ed = editor(page)
  await page.evaluate(() => {
    const ed = document.querySelector('.ProseMirror').editor
    let pos = null
    ed.state.doc.forEach((node, offset) => {
      if (pos === null && node.type.name === 'section' && node.textContent.includes('CSV feed released')) pos = offset
    })
    ed.chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(pos, 'background', 'teal').setNodeAttribute(pos, 'backgroundVariant', 'tint').setNodeAttribute(pos, 'border', 'accent')
        return true
      })
      .setNodeSelection(pos)
      .run()
  })
  await ed.scrollTo('.ProseMirror > h2:nth-of-type(3)', 120)
  await shot(page, 'colors', {
    title: 'Color regions and blocks',
    caption: 'Soft or strong section backgrounds, accent borders and tinted, solid or barred blocks.',
    targets: { section: '.pg-section[data-bg="teal"]', pane: '.pane', swatches: '.pane .swatches', heading: '.ProseMirror > h2:nth-of-type(3)' },
    theme: 'dark',
  })
  await context.close()
}

// ── 7. Fold and navigate (view mode) ─────────────────────────────────────────
{
  const { context, page } = await open({ theme: 'light' })
  const ed = editor(page)
  await openClone(page, 'view')
  await ed.foldHeading('1. Delivery summary')
  await ed.foldHeading('2. Appreciation')
  await ed.scrollTo('.pg-kpis', 60)
  await shot(page, 'fold', {
    title: 'Fold and jump',
    caption: 'Any heading folds its content, even across regions; the outline jumps anywhere.',
    targets: { folded: '.is-collapsed-heading', outline: '.outline__list', toggle: '.pg-heading-toggle[aria-expanded="false"]' },
  })
  await context.close()
}

// ── 8. FAQ, quick links and cards (dark, view) ───────────────────────────────
{
  const { context, page } = await open({ theme: 'dark' })
  const ed = editor(page)
  await openClone(page, 'view')
  await ed.scrollTo('.pg-section[data-layout="oneThirdRight"]', 40)
  await shot(page, 'webparts', {
    title: 'Callouts, FAQs, links and cards',
    caption: 'Fast-win web parts: collapsible FAQs, quick links and editorial cards.',
    targets: { faq: '.pg-callout[data-collapsible="true"]', links: '.pg-links', cards: '.pg-section[data-layout="three"]' },
    theme: 'dark',
  })
  await context.close()
}

// ── 9. Data: charts and tables (light, view) ────────────────────────────────
{
  const { context, page } = await open({ theme: 'light' })
  const ed = editor(page)
  await openClone(page, 'view')
  await ed.scrollTo('.pg-chart', 90)
  await shot(page, 'data', {
    title: 'Data that reads at a glance',
    caption: 'Bar charts with honest axes, status pills and styled tables with cell colors.',
    targets: { chart: '.pg-chart', table: '.tableWrapper' },
  })
  await context.close()
}

/** Switch layout with the real top-bar control and let pagination settle. */
async function layout(page, name) {
  await page.click(`.layout-switch button[aria-label="${name}"]`)
  await page.waitForTimeout(900)
}

/** Scroll the canvas so the first gap between two sheets sits at `fraction` of the canvas height. */
async function centerGap(page, fraction = 0.55) {
  await page.evaluate(f => {
    const canvas = document.querySelector('.pg-canvas')
    const gap = document.querySelector('.pg-page-gap__between')
    if (!canvas || !gap) return
    const c = canvas.getBoundingClientRect()
    canvas.scrollTop += gap.getBoundingClientRect().top - c.top - c.height * f
  }, fraction)
  await page.waitForTimeout(300)
}

// ── 10. Layouts: portrait pages, 16:9 slides, seamless canvas ───────────────
{
  const { context, page } = await open({ theme: 'light' })
  await openClone(page)
  await page.click('.pane .pane__header .icon-btn') // close the property pane: more room for the slides
  await layout(page, 'Landscape')
  await centerGap(page, 0.62)
  await page.mouse.move(720, 893) // rest on the status bar, away from block handles
  await shot(page, 'layouts', {
    title: 'Pages, slides or one canvas',
    caption: 'Word-style pages, 16:9 slides or a seamless canvas, with automatic page breaks.',
    targets: {
      layoutSwitch: '.layout-switch',
      gap: '.pg-page-gap',
      footer: '.pg-page-gap .pg-hf--footer',
      status: '.statusbar__layout',
      sheet: '.pg-sheet',
    },
  })
  await context.close()
}

// ── 11. Header & footer (dark) ───────────────────────────────────────────────
{
  const { context, page } = await open({ theme: 'dark' })
  await openClone(page)
  await layout(page, 'Portrait')
  await centerGap(page, 0.5)
  // Double-click the footer band, like a reader would in Word, then customise it.
  await page.dblclick('.pg-page-gap .pg-hf--footer')
  await page.waitForSelector('.hf-pane')
  await page.fill('input[aria-label="Header left"]', 'Contoso · Board update')
  await page.click('input[aria-label="Header right"]')
  await page.click('.hf-field[title="Insert {date}"]')
  await page.click('.hf-pane button[aria-label="Divider lines"]')
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const body = document.querySelector('.hf-pane')
    const slots = document.querySelector('.hf-pane .hf-slots')
    if (body && slots) body.scrollTop += slots.getBoundingClientRect().top - body.getBoundingClientRect().top - 120
    document.activeElement?.blur()
  })
  await centerGap(page, 0.5)
  await page.mouse.move(700, 880)
  await shot(page, 'headerFooter', {
    title: 'Headers and footers',
    caption: 'Left, center and right slots with page numbers, title, author and date fields.',
    targets: {
      gap: '.pg-page-gap',
      header: '.pg-page-gap .pg-hf--header',
      footer: '.pg-page-gap .pg-hf--footer',
      pane: '.hf-pane',
      presets: '.hf-presets',
      slots: '.hf-pane .hf-slots',
      fields: '.hf-fields',
    },
    theme: 'dark',
  })
  await context.close()
}

// ── 12. Downloads ────────────────────────────────────────────────────────────
{
  const { context, page } = await open({ theme: 'light' })
  await openClone(page)
  await page.click('.pane .pane__header .icon-btn')
  await layout(page, 'Portrait')
  await centerGap(page, 0.6)
  await page.click('button[title="Download"]')
  await page.waitForSelector('.download-menu')
  await page.hover('.download-menu button:nth-of-type(3)')
  await shot(page, 'downloads', {
    title: 'Download as PDF, Word or PowerPoint',
    caption: 'PDF as laid out, an editable Word document and a PowerPoint deck.',
    targets: {
      button: 'button[title="Download"]',
      menu: '.download-menu',
      pdf: '.download-menu button:nth-of-type(1)',
      word: '.download-menu button:nth-of-type(2)',
      pptx: '.download-menu button:nth-of-type(3)',
      gap: '.pg-page-gap',
    },
  })
  await context.close()
}

// ── 13. Phone ────────────────────────────────────────────────────────────────
{
  const viewport = { width: 390, height: 844 }
  const { context, page } = await open({ theme: 'dark', viewport, scale: 3 })
  const ed = editor(page)
  await openClone(page, 'view')
  await shot(page, 'mobile', {
    title: 'Ready on any screen',
    caption: 'Columns stack and panels tuck away on phones.',
    targets: {},
    viewport,
    theme: 'dark',
  })
  await context.close()
}

await browser.close()
writeFileSync(`${root}src/tour/shots.json`, JSON.stringify(manifest, null, 2))
console.log('wrote src/tour/shots.json')
