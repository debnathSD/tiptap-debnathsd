# Tiptap Pages

A SharePoint-style page editor built on [Tiptap](https://tiptap.dev). It
includes regions with column layouts and backgrounds, colored blocks,
dividers, spacers, callouts and FAQs, editorial cards, banners, quick links,
KPI tiles, charts, status pills, an outline panel, folding headings and
reading time. Pages can be laid out as Word-style portrait pages, 16:9
PowerPoint-style slides or one seamless canvas, with automatic page breaks,
custom headers and footers with page numbers, and downloads as PDF, Word
and PowerPoint.

See [ROADMAP.md](ROADMAP.md) for the phase-by-phase plan and what is shipped.

## Run it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm test` | Unit tests (schema round-trip, layouts, folding, stats, sign-in, page store, page settings, page breaks) |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build in `dist/` |

## Pages, templates and accounts

- After signing in you land on the **Pages** list. It's a table of every page you can open, with name, type, who created it, creation date, last change and word count.
- **Create new page** starts from a blank page or from the status-report template, in the layout you pick: Portrait, Landscape or Canvas.
- The built-in **status report is a read-only template**. Open it to read, or **Clone** it to get your own editable copy.
- **Rename** your pages from the ✎ button in the list, or click the page name in the editor's top bar. Enter saves, Escape cancels. Templates can't be renamed.
- Pages you create or clone belong to the signed-in account and are kept in that browser tab's session storage. Other accounts never see them, and they disappear when the tab closes.

## Using the editor

- **Edit / View**: switch in the top bar. View mode is read-only, with live links, the outline and folding.
- **Insert**: type `/` anywhere, use **Insert** in the toolbar, or hover a block and click **+**.
- **Configure**: click a web part (KPI tiles, chart, divider…) or put the cursor in a container to open its settings in the property pane. Use the breadcrumb to reach the section or the page.
- **Sections**: hover a section for its toolbar (settings, move, duplicate, delete). Click the **+** under it to add a section with a chosen layout.
- **Fold**: hover a heading and click its chevron. FAQ callouts and collapsible sections have their own chevrons.
- **Move**: drag the ⋮⋮ handle, including between columns.

Your pages autosave for the session. Use **⋯ → Export HTML / JSON** to keep a copy.

## Pages, slides and downloads

- **Layout** (top bar): **Portrait** is a Word page (A4, Letter or Legal) with a fixed page height. **Landscape** is a 16:9 PowerPoint slide (13.33 × 7.5 in). **Canvas** is one seamless page with no breaks. Switch at any time; nothing in the content changes. On phones the layout choice is in the **⋯** menu.
- **Automatic page breaks**: in Portrait and Landscape, blocks flow onto the next page or slide as soon as they no longer fit. A block taller than a page makes its sheet taller rather than being cut. Wide sheets scale down to fit the window.
- **Manual page break**: type `/page`, use **Insert → Page break**, or press **⌘/Ctrl + Enter**. Everything after it starts on a new page or slide.
- **Header & footer**: open them from the top bar, from **Page setup**, or by double-clicking the top or bottom margin of any page. Each has left, center and right slots. Insert fields with one click: **page number**, **page count**, **title**, **author** and **date**. Quick styles (Page X of Y, Title and page, Report, Centered number, None), **Different first page** for a cover page, and **Divider lines** are built in.
- **Page setup**: paper size for portrait pages, and narrow, normal or wide margins.
- **Download** (⤓ in the top bar):
  - **PDF**: one page per sheet, exactly as laid out (canvas pages print as portrait).
  - **Word (.docx)**: native, editable headings, lists, tables, columns, callouts and links on portrait pages. Header and footer are real Word headers with live page-number fields.
  - **PowerPoint (.pptx)**: one 16:9 slide per landscape page. Text, lists and tables are editable PowerPoint objects; KPI tiles, charts and cards are images. Header and footer are on every slide.
- The read-only template can switch layout and be downloaded too; the choice just isn't saved.

## Product tour and demo video

Signed-in users can open **Product tour** (`#/tour`). It has:

- a demo video rendered with Remotion: real web-part tiles under cannon-es physics in a React Three Fiber scene, then a chapter per feature with a smooth zoom, spotlight, cursor and explanation;
- an interactive tutorial that animates the same chapters over the same screenshots.

The screenshots are real captures of the running app (`video/scripts/capture.mjs`, Playwright), together with the on-screen position of every UI element a chapter points at. The chapter script lives in `src/tour/steps.ts` and is shared by the video and the tutorial.

```bash
cd video && npm install
```

```bash
npx vite preview --port 4317
```

```bash
cd video && APP_URL=http://localhost:4317/ npm run capture && npm run render && npm run poster
```

The first command installs the video tooling, the second serves a fresh `npm run build`, and the third re-captures the screenshots and re-renders `public/tour/`. `npm run studio` in `video/` opens Remotion Studio for editing.

### Soundtrack

The film has an original score with sound design, synthesized in code by `video/scripts/soundtrack.mjs` (no samples or licensed music):

- **Music:** D major at 102.4 BPM, so each feature chapter is exactly three bars and every cut lands on a bar line. An ambient intro leads into a build under the page reveal; the beat drops on the first chapter, then come a breakdown, a final lift and a logo hit with a long tail.
- **Sound design:** every on-screen action has a sound — physics landings (pitched, from the real simulation), whooshes on cuts, swooshes on zooms, spotlight pops, cursor clicks, list ticks and the feature-chip melody.
- **Timing:** `video/scripts/events.ts` reads the same timeline, tour script and physics simulation as the picture, so sound can't drift from it.
- **Mastering:** two-pass EBU R128 to −16 LUFS integrated and −1.5 dBTP true peak.

```bash
cd video && npm run soundtrack && npm run render
```

Run the soundtrack step after changing timings or the tour script, then re-render.

## Project layout

```
src/
  App.tsx                 shell: top bar, toolbar, outline, canvas, property pane
  auth/                   sign-in gate (verifier, screen)
  editor/
    extensions/           schema and behaviour (sections, containers, web parts, folding, slash menu)
    nodeviews/            React node views (section chrome, spacer resize, callout, card)
    pagination/           page settings, page/slide geometry, automatic page breaks, header & footer
    export/               PDF, Word and PowerPoint downloads (loaded on demand)
    panels/               outline (TOC) and property pane
    menus/catalog.ts      single catalog behind "/", Insert and "+"
    content/              JSON builders and the sample page
    lib/                  palette, stats, export, helpers
  pages/                  page store (per account, per session) and the Pages list
  tour/                   product tour page, shared chapter script, screenshot manifest
  styles/                 tokens.css (theme), content.css (page + export), app.css (chrome)
video/                    Remotion project for the demo video (own package.json)
```

## Hosting and sign-in

Every push to `main` runs `.github/workflows/deploy.yml`. It tests, builds with
the repository's base path and publishes `dist/` to the `gh-pages` branch, which
GitHub Pages serves at `https://<owner>.github.io/<repo>/`.

The hosted app opens on a sign-in screen. For each account the repository
holds only a random salt and a PBKDF2-SHA256 digest (600,000 iterations),
never a user ID or password. To replace all accounts, or to add one:

```bash
AUTH_USER='new-user' AUTH_PASSWORD='new-password' node scripts/hash-credentials.mjs
```

```bash
AUTH_USER='another-user' AUTH_PASSWORD='another-password' node scripts/hash-credentials.mjs --append
```

Then commit the regenerated `src/auth/credentials.ts`.

> **Limits of a static sign-in.** GitHub Pages can't run server code, so the
> check runs in the browser. It keeps casual visitors out. It does not protect
> secrets: the JavaScript bundle is downloadable, and this repository is
> public. For real access control, put the site behind an identity-aware proxy
> such as Cloudflare Access, or host it with server-side auth.

## License

MIT
