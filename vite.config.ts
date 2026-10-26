/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Node globals without pulling @types/node into the app's type scope.
declare const process: { env: Record<string, string | undefined> }

// GitHub Pages serves the project at /<repo>/; the deploy workflow sets BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { port: 5173 },
  // The PDF/Word/PowerPoint exporters are loaded on demand; pre-bundle them so the dev server doesn't reload on first export.
  optimizeDeps: { include: ['jspdf', 'docx', 'pptxgenjs', 'dom-to-image-more'] },
  // Tiptap + ProseMirror + React land around 1 MB minified (~320 kB gzip) in one chunk.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'jsdom',
  },
})
