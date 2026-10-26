import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrowserFrame, Cursor } from '../components/Chrome'
import { cameraTransform, frameTarget, type TourStep as Step } from '../../../src/tour/steps'
import { backdrop, colors, font, manifest, type Rect } from '../theme'

/**
 * Act 3 — one feature per chapter: the real screenshot in a browser frame,
 * a smooth eased zoom onto each highlighted control, a spotlight with a
 * pulsing ring, a cursor that clicks it, and an explanation card.
 */

export type { Highlight, TourStep as Step } from '../../../src/tour/steps'

export const STEP_FRAMES = 225

const WIN_W = 1300
const WIN_H = Math.round(WIN_W * (900 / 1440))
const FRAME_X = 70
const FRAME_Y = (1080 - WIN_H - 46) / 2 + 10
const MOVE = 34 // frames for each camera move

const ease = Easing.bezier(0.65, 0, 0.35, 1)

type Camera = { z: number; cx: number; cy: number }
const WIN = { w: WIN_W, h: WIN_H }
const cameraFor = (rect: Rect | undefined, scale: number, zoom?: number): Camera => frameTarget(rect, scale, WIN, zoom)
const transformFor = (cam: Camera) => cameraTransform(cam, WIN)

export function FeatureStep({ step, index, total }: { step: Step; index: number; total: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const shot = manifest.shots[step.shot]
  const scale = WIN_W / shot.viewport.width
  const rect = (name: string) => shot.rects[name]

  // Camera keyframes: overview → each highlight → ease back out before the cut.
  const keys: Array<{ at: number; cam: Camera }> = [{ at: 0, cam: cameraFor(undefined, scale) }]
  for (const h of step.highlights) keys.push({ at: h.at, cam: cameraFor(rect(h.target), scale, h.zoom) })
  keys.push({ at: STEP_FRAMES - MOVE - 8, cam: cameraFor(undefined, scale) })

  let cam = keys[0].cam
  for (let i = 1; i < keys.length; i++) {
    const p = interpolate(frame, [keys[i].at, keys[i].at + MOVE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
    if (p <= 0) break
    const prev = cam
    cam = {
      z: prev.z + (keys[i].cam.z - prev.z) * p,
      cx: prev.cx + (keys[i].cam.cx - prev.cx) * p,
      cy: prev.cy + (keys[i].cam.cy - prev.cy) * p,
    }
  }
  const { tx, ty } = transformFor(cam)
  const toScreen = (x: number, y: number) => ({ x: FRAME_X + tx + x * cam.z, y: FRAME_Y + 46 + ty + y * cam.z })

  // Active highlight: the latest one whose camera move has finished.
  const active = [...step.highlights].reverse().find(h => frame >= h.at + MOVE * 0.6 && frame < STEP_FRAMES - MOVE - 8)
  const activeIndex = active ? step.highlights.indexOf(active) : -1
  const spotIn = active ? interpolate(frame, [active.at + MOVE * 0.6, active.at + MOVE + 6], [0, 1], { extrapolateRight: 'clamp' }) : 0

  // Cursor path through clickable highlights.
  const clicks = step.highlights.filter(h => h.click && rect(h.target))
  let cursor = { x: FRAME_X + WIN_W * 0.72, y: FRAME_Y + WIN_H * 0.85 }
  let click = 0
  for (const h of clicks) {
    const [x, y, w, hgt] = rect(h.target)!.map(v => v * scale)
    const target = toScreen(x + w / 2, y + hgt / 2)
    const arrive = h.at + MOVE + 4
    const p = interpolate(frame, [h.at + 6, arrive], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
    cursor = { x: cursor.x + (target.x - cursor.x) * p, y: cursor.y + (target.y - cursor.y) * p }
    if (frame >= arrive) click = interpolate(frame, [arrive, arrive + 18], [0, 1], { extrapolateRight: 'clamp' })
  }

  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 90 } })
  const exit = interpolate(frame, [STEP_FRAMES - 14, STEP_FRAMES], [1, 0], { extrapolateLeft: 'clamp' })
  const card = spring({ frame: frame - 10, fps, config: { damping: 18 } })
  const tilt = (1 - enter) * 14

  return (
    <AbsoluteFill style={{ background: backdrop, fontFamily: font, opacity: exit }}>
      {/* Chapter progress */}
      <div style={{ position: 'absolute', top: 34, left: FRAME_X, right: 70, display: 'flex', gap: 8 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: i < index ? '100%' : i === index ? `${(frame / STEP_FRAMES) * 100}%` : '0%',
                background: colors.tealBright,
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', left: FRAME_X, top: FRAME_Y, perspective: 2400 }}>
        <div style={{ transform: `rotateY(${tilt}deg) translateY(${(1 - enter) * 60}px)`, transformOrigin: 'left center', opacity: enter }}>
          <BrowserFrame width={WIN_W} height={WIN_H} dark={shot.theme === 'dark'}>
            <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${cam.z})` }}>
              <Img src={staticFile(`shots/${shot.file}`)} style={{ width: WIN_W, height: WIN_H, display: 'block' }} />
              {active && rect(active.target) && <Spotlight rect={rect(active.target)!.map(v => v * scale) as Rect} zoom={cam.z} opacity={spotIn} frame={frame - active.at} />}
            </div>
          </BrowserFrame>
        </div>
      </div>

      {active?.label && rect(active.target) && (() => {
        const [x, y, w, h] = rect(active.target)!.map(v => v * scale)
        const top = toScreen(x + w / 2, y)
        const bottom = toScreen(x + w / 2, y + h)
        // Labels sit above the highlight unless that would leave the window.
        const below = top.y < FRAME_Y + 150
        return <Callout x={Math.min(Math.max(top.x, FRAME_X + 160), FRAME_X + WIN_W - 160)} y={below ? bottom.y : top.y} below={below} text={active.label!} opacity={spotIn} />
      })()}

      {clicks.length > 0 && <Cursor x={cursor.x} y={cursor.y} click={click} />}

      {/* Explanation card */}
      <div
        style={{
          position: 'absolute',
          left: FRAME_X + WIN_W + 44,
          right: 60,
          top: FRAME_Y + 40,
          opacity: card,
          transform: `translateX(${(1 - card) * 60}px)`,
          color: colors.text,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.18em', color: colors.mint }}>
          FEATURE {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
        <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.08, margin: '14px 0 18px', color: colors.white, letterSpacing: '-0.02em' }}>{step.title}</div>
        <div style={{ fontSize: 25, lineHeight: 1.45, color: colors.muted }}>{step.body}</div>
        <div style={{ marginTop: 26, display: 'grid', gap: 14 }}>
          {step.points.map((point, i) => {
            const on = spring({ frame: frame - 34 - i * 10, fps, config: { damping: 16 } })
            const lit = activeIndex >= 0 && i === Math.min(activeIndex, step.points.length - 1)
            return (
              <div key={point} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', opacity: on, transform: `translateX(${(1 - on) * 24}px)` }}>
                <span
                  style={{
                    flex: 'none',
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    display: 'grid',
                    placeItems: 'center',
                    background: lit ? colors.tealBright : 'rgba(45, 212, 191, 0.16)',
                    color: lit ? colors.ink : colors.tealBright,
                    fontSize: 18,
                    fontWeight: 800,
                    marginTop: 1,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 23, lineHeight: 1.4, color: lit ? colors.white : colors.text, fontWeight: lit ? 600 : 400 }}>{point}</span>
              </div>
            )
          })}
        </div>
        {step.hint && (
          <div style={{ marginTop: 30, display: 'inline-flex', gap: 10, alignItems: 'center', fontSize: 20, color: colors.muted, opacity: spring({ frame: frame - 70, fps }) }}>
            <span style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', borderBottomWidth: 3, color: colors.white, fontWeight: 700 }}>
              {step.hint.split(' ')[0]}
            </span>
            {step.hint.split(' ').slice(1).join(' ')}
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}

function Spotlight({ rect, zoom, opacity, frame }: { rect: Rect; zoom: number; opacity: number; frame: number }) {
  const [x, y, w, h] = rect
  const pad = 8 / zoom
  const pulse = (frame % 36) / 36
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - pad,
          top: y - pad,
          width: w + pad * 2,
          height: h + pad * 2,
          borderRadius: 12 / zoom,
          boxShadow: `0 0 0 4000px rgba(2, 12, 14, ${0.52 * opacity})`,
          border: `${3 / zoom}px solid rgba(45, 212, 191, ${opacity})`,
          outline: `${10 / zoom}px solid rgba(45, 212, 191, ${0.16 * opacity})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - pad,
          top: y - pad,
          width: w + pad * 2,
          height: h + pad * 2,
          borderRadius: 12 / zoom,
          border: `${2 / zoom}px solid ${colors.tealBright}`,
          opacity: opacity * (1 - pulse) * 0.8,
          transform: `scale(${1 + pulse * 0.06})`,
        }}
      />
    </>
  )
}

function Callout({ x, y, text, opacity, below }: { x: number; y: number; text: string; opacity: number; below: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: below ? y + 22 : y - 18,
        transform: `translate(-50%, ${below ? '0' : '-100%'}) translateY(${(1 - opacity) * (below ? -12 : 12)}px)`,
        opacity,
        padding: '10px 18px',
        borderRadius: 12,
        background: colors.tealBright,
        color: colors.ink,
        fontSize: 22,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
        zIndex: 15,
      }}
    >
      {text}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          ...(below ? { top: -7 } : { bottom: -7 }),
          width: 14,
          height: 14,
          background: colors.tealBright,
          transform: 'translateX(-50%) rotate(45deg)',
        }}
      />
    </div>
  )
}
