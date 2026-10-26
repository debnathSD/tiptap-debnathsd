# Tiptap Pages

A SharePoint-style page editor built on [Tiptap](https://tiptap.dev). It
includes regions with column layouts and backgrounds, colored blocks,
dividers, spacers, callouts and FAQs, editorial cards, banners, quick links,
KPI tiles, charts, status pills, an outline panel, folding headings and
reading time.

See [ROADMAP.md](ROADMAP.md) for the phase-by-phase plan and what is shipped.

## Run it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm test` | Unit tests (schema round-trip, layouts, folding, stats, sign-in verifier) |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build in `dist/` |

## Using the editor

- **Edit / View**: switch in the top bar. View mode is read-only, with live links, the outline and folding.
- **Insert**: type `/` anywhere, use **Insert** in the toolbar, or hover a block and click **+**.
- **Configure**: click a web part (KPI tiles, chart, divider…) or put the cursor in a container to open its settings in the property pane. Use the breadcrumb to reach the section or the page.
- **Sections**: hover a section for its toolbar (settings, move, duplicate, delete). Click the **+** under it to add a section with a chosen layout.
- **Fold**: hover a heading and click its chevron. FAQ callouts and collapsible sections have their own chevrons.
- **Move**: drag the ⋮⋮ handle, including between columns.

Pages save to your browser automatically. Use **⋯ → Export HTML / JSON** to take them elsewhere.

## Project layout

```
src/
  App.tsx                 shell: top bar, toolbar, outline, canvas, property pane
  auth/                   sign-in gate (verifier, screen)
  editor/
    extensions/           schema and behaviour (sections, containers, web parts, folding, slash menu)
    nodeviews/            React node views (section chrome, spacer resize, callout, card)
    panels/               outline (TOC) and property pane
    menus/catalog.ts      single catalog behind "/", Insert and "+"
    content/              JSON builders and the sample page
    lib/                  palette, stats, export, helpers
  styles/                 tokens.css (theme), content.css (page + export), app.css (chrome)
```

## Hosting and sign-in

Every push to `main` runs `.github/workflows/deploy.yml`. It tests, builds with
the repository's base path and publishes `dist/` to the `gh-pages` branch, which
GitHub Pages serves at `https://<owner>.github.io/<repo>/`.

The hosted app opens on a sign-in screen. The repository holds only a random
salt and a PBKDF2-SHA256 digest (600,000 iterations), never the user ID or
password. To change the credentials:

```bash
AUTH_USER='new-user' AUTH_PASSWORD='new-password' node scripts/hash-credentials.mjs
```

Then commit the regenerated `src/auth/credentials.ts`.

> **Limits of a static sign-in.** GitHub Pages can't run server code, so the
> check runs in the browser. It keeps casual visitors out. It does not protect
> secrets: the JavaScript bundle is downloadable, and this repository is
> public. For real access control, put the site behind an identity-aware proxy
> such as Cloudflare Access, or host it with server-side auth.

## License

MIT
