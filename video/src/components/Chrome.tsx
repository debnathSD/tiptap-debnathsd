import type { CSSProperties, ReactNode } from 'react'
import { colors, font } from '../theme'

/** Minimal browser window around a screenshot. */
export function BrowserFrame({
  width,
  height,
  url = 'debnathsd.github.io/tiptap-debnathsd',
  dark,
  children,
  style,
}: {
  width: number
  height: number
  url?: string
  dark?: boolean
  children: ReactNode
  style?: CSSProperties
}) {
  const bar = dark ? '#14171a' : '#f1f5f4'
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        overflow: 'hidden',
        background: bar,
        boxShadow: '0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      <div style={{ height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', fontFamily: font }}>
        {['#ff5f57', '#febc2e', '#28c840'].map(c => (
          <span key={c} style={{ width: 13, height: 13, borderRadius: '50%', background: c }} />
        ))}
        <div
          style={{
            marginLeft: 18,
            flex: 1,
            maxWidth: 560,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            fontSize: 15,
            color: dark ? '#a3aab1' : '#475569',
            background: dark ? '#0b0d0f' : '#ffffff',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {url}
        </div>
      </div>
      <div style={{ width, height, overflow: 'hidden', position: 'relative' }}>{children}</div>
    </div>
  )
}

/** macOS-style pointer with a click ripple. */
export function Cursor({ x, y, click }: { x: number; y: number; click: number }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 20 }}>
      {click > 0 && click < 1 && (
        <div
          style={{
            position: 'absolute',
            left: -40 * click,
            top: -40 * click,
            width: 80 * click,
            height: 80 * click,
            borderRadius: '50%',
            border: `3px solid ${colors.tealBright}`,
            opacity: 1 - click,
          }}
        />
      )}
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ position: 'absolute', left: -4, top: -3, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.45))', transform: `scale(${1 - Math.sin(Math.min(click, 1) * Math.PI) * 0.12})` }}>
        <path d="M4 2.5v17.2l4.6-4.3 2.9 6.6 3.1-1.4-2.9-6.4H18L4 2.5z" fill="#111" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function Chip({ children, accent = false, style }: { children: ReactNode; accent?: boolean; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderRadius: 999,
        fontFamily: font,
        fontSize: 22,
        fontWeight: 600,
        color: accent ? colors.ink : colors.text,
        background: accent ? colors.tealBright : 'rgba(255,255,255,0.07)',
        border: accent ? 'none' : '1px solid rgba(255,255,255,0.14)',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
