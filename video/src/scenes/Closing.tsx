import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Chip } from '../components/Chrome'
import { Particles } from '../components/Particles'
import { backdrop, colors, font, manifest } from '../theme'

/** Act 4 — light, dark and phone, plus the full feature list. */
export const DEVICES_FRAMES = 210

const FEATURES = [
  'Regions & layouts',
  'Section backgrounds',
  'Block colors',
  'Dividers & spacers',
  'Callouts & FAQs',
  'Editorial cards',
  'Banners',
  'Quick links',
  'KPI tiles',
  'Bar charts',
  'Status pills',
  'Styled tables',
  'Outline / TOC',
  'Folding headings',
  'Reading time',
  'HTML & JSON export',
]

export function Devices() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const mobile = manifest.shots.mobile
  const phoneH = 820
  const phoneW = (mobile.viewport.width / mobile.viewport.height) * phoneH
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 70 } })
  const bob = Math.sin(frame / 22) * 10
  const fade = interpolate(frame, [0, 14, DEVICES_FRAMES - 14, DEVICES_FRAMES], [0, 1, 1, 0])

  return (
    <AbsoluteFill style={{ background: backdrop, fontFamily: font, opacity: fade }}>
      <Particles count={1200} />
      <div style={{ position: 'absolute', left: 170, top: 130 + bob, perspective: 1800 }}>
        <div
          style={{
            transform: `rotateY(${interpolate(frame, [0, DEVICES_FRAMES], [18, -6])}deg) translateY(${(1 - enter) * 160}px)`,
            width: phoneW + 28,
            height: phoneH + 28,
            borderRadius: 64,
            padding: 14,
            background: 'linear-gradient(145deg, #1f2937, #0b0f14)',
            boxShadow: '0 50px 120px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ width: phoneW, height: phoneH, borderRadius: 50, overflow: 'hidden', position: 'relative' }}>
            <Img src={staticFile(`shots/${mobile.file}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 12, left: '50%', width: 110, height: 30, marginLeft: -55, borderRadius: 20, background: '#000' }} />
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 760, right: 110, top: 160, color: colors.text }}>
        <div style={{ fontSize: 22, letterSpacing: '0.2em', fontWeight: 700, color: colors.mint }}>EVERYWHERE</div>
        <div style={{ fontSize: 66, fontWeight: 800, color: colors.white, lineHeight: 1.05, margin: '14px 0 18px', letterSpacing: '-0.02em' }}>
          Light, dark and phone-ready
        </div>
        <div style={{ fontSize: 27, color: colors.muted, lineHeight: 1.45, maxWidth: 860 }}>
          Columns stack on small screens, and panels tuck away. Every color comes from one theme, so pages look right everywhere.
        </div>
        <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', gap: 14, maxWidth: 1000 }}>
          {FEATURES.map((feature, i) => {
            const on = spring({ frame: frame - 24 - i * 4, fps, config: { damping: 13, stiffness: 120 } })
            return (
              <Chip key={feature} accent={i % 5 === 0} style={{ opacity: on, transform: `translateY(${(1 - on) * 30}px) scale(${0.8 + on * 0.2})` }}>
                {feature}
              </Chip>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export const OUTRO_FRAMES = 180

export function Outro() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const logo = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 90 } })
  const text = spring({ frame: frame - 20, fps, config: { damping: 18 } })
  const url = spring({ frame: frame - 40, fps, config: { damping: 18 } })
  const fade = interpolate(frame, [0, 12, OUTRO_FRAMES - 20, OUTRO_FRAMES], [0, 1, 1, 0])

  return (
    <AbsoluteFill style={{ background: backdrop, fontFamily: font, opacity: fade, alignItems: 'center', justifyContent: 'center' }}>
      <Particles count={2000} />
      <div style={{ textAlign: 'center', color: colors.text, position: 'relative' }}>
        <Img src={staticFile('logo.svg')} style={{ width: 130, height: 130, transform: `scale(${logo}) rotate(${(1 - logo) * -40}deg)` }} />
        <div style={{ fontSize: 110, fontWeight: 800, color: colors.white, letterSpacing: '-0.03em', marginTop: 20, opacity: text, transform: `translateY(${(1 - text) * 30}px)` }}>
          Tiptap Pages
        </div>
        <div style={{ fontSize: 34, color: colors.muted, opacity: text }}>Build SharePoint-style pages in the browser</div>
        <div
          style={{
            marginTop: 46,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '18px 34px',
            borderRadius: 999,
            background: colors.tealBright,
            color: colors.ink,
            fontSize: 34,
            fontWeight: 800,
            opacity: url,
            transform: `translateY(${(1 - url) * 24}px)`,
            boxShadow: `0 20px 60px rgba(45, 212, 191, 0.35)`,
          }}
        >
          debnathsd.github.io/tiptap-debnathsd
        </div>
        <div style={{ marginTop: 28, fontSize: 24, color: colors.muted, opacity: url }}>Sign in to explore the live editor · Built with Tiptap 3, React, Three.js and Remotion</div>
      </div>
    </AbsoluteFill>
  )
}
