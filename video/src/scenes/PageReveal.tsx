import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrowserFrame } from '../components/Chrome'
import { backdrop, colors, font, manifest } from '../theme'
import { REVEAL_FRAMES, REVEAL_LABELS as LABELS } from '../timeline'

/** Act 2 — the assembled page, scrolled top to bottom in a tilted browser window. */

const WIN_W = 1180
const WIN_H = 760

export function PageReveal() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const full = manifest.shots['page-full']
  const imageH = (WIN_W / full.viewport.width) * full.viewport.height
  const scroll = interpolate(frame, [26, REVEAL_FRAMES - 26], [0, imageH - WIN_H], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.45, 0, 0.25, 1),
  })
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 80 } })
  const tiltX = interpolate(frame, [0, REVEAL_FRAMES], [22, 8])
  const tiltY = interpolate(frame, [0, REVEAL_FRAMES], [-16, -6])
  const fade = interpolate(frame, [0, 14, REVEAL_FRAMES - 14, REVEAL_FRAMES], [0, 1, 1, 0])

  return (
    <AbsoluteFill style={{ background: backdrop, fontFamily: font, opacity: fade }}>
      <div style={{ position: 'absolute', left: 90, top: 110, width: 520, color: colors.text }}>
        <div style={{ fontSize: 22, letterSpacing: '0.2em', fontWeight: 700, color: colors.mint }}>THE RESULT</div>
        <div style={{ fontSize: 64, fontWeight: 800, color: colors.white, lineHeight: 1.05, margin: '14px 0 20px', letterSpacing: '-0.02em' }}>
          Your report,
          <br />
          as a page
        </div>
        <div style={{ fontSize: 26, color: colors.muted, lineHeight: 1.45 }}>A bi-weekly status report rebuilt from real web parts, from the banner down to the cards.</div>
        <div style={{ marginTop: 34, display: 'grid', gap: 14 }}>
          {LABELS.map(label => {
            const on = spring({ frame: frame - label.at, fps, config: { damping: 15 } })
            return (
              <div key={label.text} style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: on, transform: `translateX(${(1 - on) * -30}px)`, fontSize: 25, color: colors.text }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: colors.tealBright, boxShadow: `0 0 18px ${colors.tealBright}` }} />
                {label.text}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ position: 'absolute', right: 80, top: 120, perspective: 2200 }}>
        <div
          style={{
            transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(${(1 - enter) * 120}px) scale(${0.92 + enter * 0.08})`,
            transformOrigin: 'center top',
          }}
        >
          <BrowserFrame width={WIN_W} height={WIN_H}>
            <Img src={staticFile(`shots/${full.file}`)} style={{ width: WIN_W, display: 'block', transform: `translateY(${-scroll}px)` }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 80%, rgba(4,22,26,0.25))' }} />
          </BrowserFrame>
        </div>
      </div>
    </AbsoluteFill>
  )
}
