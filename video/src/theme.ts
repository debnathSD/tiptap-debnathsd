import manifestJson from '../../src/tour/shots.json'

export const FPS = 30
export const WIDTH = 1920
export const HEIGHT = 1080

export const colors = {
  ink: '#04161a',
  deep: '#062a2f',
  teal: '#0f766e',
  tealBright: '#2dd4bf',
  mint: '#99f6e4',
  blue: '#3b82f6',
  white: '#ffffff',
  text: '#e6f4f1',
  muted: 'rgba(230, 244, 241, 0.68)',
}

export const font = '"Segoe UI Variable Display", "Segoe UI", -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'

export type Rect = [x: number, y: number, w: number, h: number]
export type Shot = {
  file: string
  title?: string
  caption?: string
  theme: 'light' | 'dark'
  viewport: { width: number; height: number }
  rects: Record<string, Rect>
}
export type Manifest = {
  viewport: { width: number; height: number }
  shots: Record<string, Shot>
  crops: Record<string, { file: string; width: number; height: number }>
}

export const manifest = manifestJson as unknown as Manifest

export const backdrop = `radial-gradient(1200px 700px at 85% 0%, rgba(45, 212, 191, 0.22), transparent 60%),
  radial-gradient(900px 600px at 0% 100%, rgba(59, 130, 246, 0.18), transparent 60%),
  linear-gradient(160deg, ${colors.deep} 0%, ${colors.ink} 70%)`
