import type { Editor, JSONContent } from '@tiptap/core'
import contentCss from '../../styles/content.css?raw'
import tokensCss from '../../styles/tokens.css?raw'

function download(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'page'

export function pageTitle(editor: Editor) {
  let title = ''
  editor.state.doc.descendants(node => {
    if (title) return false
    if (node.type.name === 'heading') title = node.textContent
    return !title
  })
  return title || 'Untitled page'
}

export function exportJSON(editor: Editor) {
  download(`${slug(pageTitle(editor))}.json`, JSON.stringify(editor.getJSON(), null, 2), 'application/json')
}

/** Standalone HTML: the page markup plus the same content stylesheet the editor uses. */
export function exportHTML(editor: Editor, theme: 'light' | 'dark') {
  const title = pageTitle(editor)
  const width = editor.state.doc.attrs.pageWidth ?? 'standard'
  const html = `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title.replace(/</g, '&lt;')}</title>
<style>
${tokensCss}
${contentCss}
body { margin: 0; background: var(--canvas-bg); color: var(--text); font-family: var(--font-sans); }
</style>
</head>
<body>
<main class="pg-page" data-width="${width}"><div class="pg-content">${editor.getHTML()}</div></main>
</body>
</html>`
  download(`${slug(title)}.html`, html, 'text/html')
}

export function importJSONFile(): Promise<JSONContent | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      try {
        const parsed = JSON.parse(await file.text())
        resolve(parsed?.type === 'doc' ? parsed : null)
      } catch {
        resolve(null)
      }
    }
    input.click()
  })
}
