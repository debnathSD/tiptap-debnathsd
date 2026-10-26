# Roadmap — SharePoint authoring on Tiptap

The goal is to bring SharePoint's fluid page-authoring experience to a Tiptap
editor in a waterfall order. Each phase builds only on the phases before it, so
end users get a usable editor at every step.

Status: ✅ shipped · 🟡 partial · ⬜ planned

---

## Phase 0 — Foundation ✅

| Capability | How it is built |
| --- | --- |
| Tiptap 3 base editor | `@tiptap/react` + StarterKit, lists, task lists, links, colors, highlight, alignment |
| Page schema | `doc → (block \| region)+`; sections live in their own `region` group so they can't nest |
| Save | Debounced autosave to `localStorage` |
| Export / import | Export as standalone HTML (bundled content CSS) or JSON; import JSON |
| Theming | Light, dark and system themes from one token set (`src/styles/tokens.css`) |

## Phase 1 — Authoring shell ✅

| SharePoint concept | Tiptap Pages |
| --- | --- |
| Edit / Publish / Preview | **Edit** and **View** modes. View is read-only, with the outline, folding and live links |
| Command bar | Toolbar: insert, undo/redo, text style, marks, text/highlight/block color, links, alignment, lists |
| "+" toolbox | `/` slash menu, the toolbar **Insert** menu and the drag-handle **+**. All three share one catalog (`menus/catalog.ts`) |
| Property pane | Right-hand pane follows the selection, with a breadcrumb (Page › Section › Callout › Text) to edit any container |
| Move web parts | Drag handle for any block, including inside columns. Sections also have ↑ / ↓ / duplicate / delete |

## Phase 2 — Regions, colors and dividers ✅

| Feature | Notes |
| --- | --- |
| Sections (regions) | One, two, three, one-third-left and one-third-right layouts. Changing the layout merges overflowing columns instead of dropping content |
| Section backgrounds | None, Soft or Strong, in any palette color or a custom hex |
| Section frame | Accent color, border (none / subtle / accent), padding (compact / normal / relaxed) |
| Section header | Optional title bar (accent bar / solid / plain) |
| Collapsible sections | SharePoint-style; can start collapsed |
| Block colors | Paragraphs, headings and quotes get **tint**, **solid** or **accent bar** in any color |
| Divider | Solid, dashed, dotted, double or gradient; weight, length, alignment, color. `---` still works |
| Spacer | Drag the grip or use the arrow keys to resize (8–480 px) |

## Phase 3 — Fast-win web parts ✅

| Fast win | Implementation |
| --- | --- |
| Callout / FAQ box | `callout` container: tint, bar, outline or solid, with an icon slot. The **Collapsible (FAQ)** toggle keeps the first block as the question and folds the rest |
| Editorial card | `card` = image + any blocks + optional link. **Card row** inserts three cards in a three-column section |
| Banner | Full-bleed hero with gradient, solid color or background image + overlay. Three heights, left or centered text |
| Quick links | Tiles, list, buttons or compact; 1–4 columns. Links open in view mode only |

## Phase 4 — Navigation and reading ✅

| Fast win | Implementation |
| --- | --- |
| Table of contents / outline | Left panel in **both** edit and view mode. Scroll spy, click to jump (unfolds hidden targets), fold controls, collapse/expand all |
| Collapsible sections (headings) | Any heading folds everything up to the next heading of the same or higher level, even across regions. Folding is view state: no undo entries, and it works read-only |
| Word / reading-time count | One document walk that also counts text held in web-part attributes. Shown in the status bar, outline and page pane |
| Reading progress | Thin progress bar in view mode |

## Phase 5 — Data web parts from the status report ✅

| Feature | Notes |
| --- | --- |
| KPI tiles | Label, value + unit, status pill, change, progress bar, target and footnote; auto or fixed tiles per row |
| Status pills | Inline On track / At risk / Off track / In progress / neutral, with presets |
| Bar charts | Columns or bars, number / percent / compact formats, non-zero axis (e.g. 97–98.5%), highlight latest or highest |
| Tables | Resizable columns, style presets (default / striped / minimal / grid), header color, per-cell colors, row and column tools |
| Page properties | Metadata strip (period, scope, owner, classification…) for banners and headers |

## Phase 6 — Publishing ✅

| Feature | Notes |
| --- | --- |
| Hosting | GitHub Actions builds every push to `main` and publishes it to the `gh-pages` branch (GitHub Pages) |
| Sign-in gate | Multiple accounts. The bundle holds only one salted PBKDF2 (600k iterations) verifier per account. Client-side only, see README |
| Pages list | Home screen table: name, type, created by, created, last modified, words; search; create, clone, delete |
| Templates | The status report is a read-only template; **Clone** makes an editable copy |
| Per-user pages | Created and cloned pages belong to the signed-in account and last for the browser session |

## Phase 6b — Product tour ✅

| Feature | Notes |
| --- | --- |
| Demo video | Remotion + React Three Fiber + cannon-es physics. Real web-part tiles fall and assemble into a page, then one chapter per feature with zoom, spotlight, cursor and explanation |
| Animated tutorial | In-app `#/tour` walkthrough of the same chapters over real screenshots; auto-play and keyboard controls |
| Real captures | Playwright captures the running app plus the position of each UI element, so highlights land on real controls |

---

## Next phases ⬜

These continue in the same order: authoring depth first, then collaboration,
then governance.

### Phase 7 — More web parts

| SharePoint feature | Suggested approach |
| --- | --- |
| Hero web part (1–5 tiles) | Composite of `card` in a dedicated `hero` grid node |
| Image gallery / carousel | Atom with an image list in attrs, edited from the pane (same pattern as quick links) |
| Embed / video | Iframe atom with an allow-list (YouTube, Vimeo, Stream, Forms) |
| Button / call to action | Inline or block atom reusing the quick-link button style |
| Countdown, events, people | Attribute-driven atoms like KPI tiles |
| Vertical section | Page-level layout attribute that pins one column beside the region stack |

### Phase 8 — Templates and reuse

| Feature | Suggested approach |
| --- | --- |
| More page templates | More read-only templates alongside the status report; "Save as template" |
| Section templates | "Save section as template" stores a section's JSON in the catalog |

### Phase 9 — Real-time co-authoring (Fluid / Loop-style)

| Feature | Suggested approach |
| --- | --- |
| Live co-editing, presence, cursors | `@tiptap/extension-collaboration` + `collaboration-caret` over Y.js (Hocuspocus or Tiptap Cloud) |
| Comments | Comment marks anchored to ranges, with a thread sidebar |
| Version history | Y.js snapshots, or periodic JSON snapshots with diff and restore |

### Phase 10 — Governance

| Feature | Suggested approach |
| --- | --- |
| Real authentication and storage | Move sign-in server-side (OIDC / Entra ID) and keep pages in a database, so they outlive the session and can be shared |
| Draft → publish, approvals, scheduling | Store documents server-side with a status field |
| Audience targeting, page analytics, accessibility checker | Built on the server-side document store |
