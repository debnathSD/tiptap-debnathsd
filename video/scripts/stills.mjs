#!/usr/bin/env node
/** Render preview stills from one bundle: node scripts/stills.mjs <outDir> <frame> [frame…] */
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const [outDir, ...frames] = process.argv.slice(2)
const here = path.dirname(fileURLToPath(import.meta.url))
mkdirSync(outDir, { recursive: true })

const serveUrl = await bundle({ entryPoint: path.join(here, '../src/index.ts'), publicDir: path.join(here, '../../public/tour') })
const composition = await selectComposition({ serveUrl, id: 'ProductDemo', chromiumOptions: { gl: 'angle' } })
console.log('duration', composition.durationInFrames)
for (const frame of frames.map(Number)) {
  const output = path.join(outDir, `f${String(frame).padStart(4, '0')}.jpg`)
  await renderStill({ serveUrl, composition, frame, output, imageFormat: 'jpeg', jpegQuality: 80, chromiumOptions: { gl: 'angle' } })
  console.log('rendered', output)
}
