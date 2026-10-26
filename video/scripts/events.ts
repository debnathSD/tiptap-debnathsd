/**
 * Every on-screen action with its exact time, for the soundtrack. Bundled
 * with esbuild by scripts/soundtrack.mjs, so it reads the very same timeline,
 * tour script and physics simulation the picture is rendered from.
 */
import { TOUR_STEPS } from '../../src/tour/steps'
import { SIM_FRAMES, SIMULATION, TILES } from '../src/lib/physics'
import * as T from '../src/timeline'

export type SoundEvent = {
  /** Seconds from the start of the film. */
  t: number
  type:
    | 'titleHit'
    | 'land'
    | 'assemble'
    | 'settle'
    | 'pop'
    | 'transition'
    | 'swish'
    | 'tick'
    | 'zoomIn'
    | 'zoomOut'
    | 'click'
    | 'rise'
    | 'chip'
    | 'logoHit'
    | 'shimmer'
    | 'chime'
  /** 0–1 loudness / intensity hint. */
  strength?: number
  /** Position in a run (pitch climbs with it). */
  index?: number
  /** Seconds the gesture lasts (camera moves). */
  duration?: number
}

const sec = (frame: number) => frame / T.FPS

export function soundEvents(): { duration: number; drop: number; scenes: Array<{ key: string; start: number }>; events: SoundEvent[] } {
  const events: SoundEvent[] = []
  const add = (frame: number, type: SoundEvent['type'], extra: Partial<SoundEvent> = {}) => events.push({ t: sec(frame), type, ...extra })

  // Act 1 — physics: a note for every real landing, then the assembly.
  const intro = T.sceneStart('intro')
  add(intro + T.TITLE_AT, 'titleHit')
  TILES.forEach((_, i) => {
    let previous = 0
    let last = -99
    for (let f = 1; f < Math.min(SIM_FRAMES, T.ASSEMBLE_AT); f++) {
      const vy = (SIMULATION[f][i].p[1] - SIMULATION[f - 1][i].p[1]) * T.FPS
      // A collision shows up as a sudden loss of downward speed.
      if (previous < -1.4 && vy > previous * 0.35 && f - last > 8) {
        add(intro + f, 'land', { strength: Math.min(1, -previous / 9), index: i })
        last = f
      }
      previous = vy
    }
  })
  add(intro + T.ASSEMBLE_AT, 'assemble', { duration: 1.4 })
  TILES.forEach((_, i) => add(intro + T.ASSEMBLE_AT + i * T.ASSEMBLE_STAGGER + 20, 'settle', { index: i }))
  add(intro + T.TAGLINE_AT, 'pop', { strength: 0.6 })

  // Act 2 — reveal.
  const reveal = T.sceneStart('reveal')
  add(reveal, 'transition', { strength: 0.8 })
  T.REVEAL_LABELS.forEach((label, i) => add(reveal + label.at, 'tick', { index: i }))

  // Act 3 — one chapter per feature.
  TOUR_STEPS.forEach((step, i) => {
    const start = T.sceneStart(`step-${i}`)
    if (i > 0) add(start, 'transition', { strength: 0.6 })
    add(start + T.CARD_AT, 'swish')
    step.points.forEach((_, p) => add(start + T.POINT_AT(p), 'tick', { index: p, strength: 0.5 }))
    step.highlights.forEach((h, k) => {
      add(start + h.at, 'zoomIn', { duration: T.MOVE / T.FPS, index: k })
      add(start + T.SPOT_AT(h.at), 'pop', { index: k })
      if (h.click) add(start + T.CLICK_AT(h.at), 'click')
    })
    add(start + T.ZOOM_OUT_AT, 'zoomOut', { duration: T.MOVE / T.FPS })
  })

  // Act 4 — devices and the feature wall.
  const devices = T.sceneStart('devices')
  add(devices, 'transition', { strength: 0.7 })
  add(devices + 4, 'rise', { duration: 1.2 })
  T.FEATURE_CHIPS.forEach((_, i) => add(devices + T.CHIP_AT(i), 'chip', { index: i }))

  // Outro.
  const outro = T.sceneStart('outro')
  add(outro + T.LOGO_AT, 'logoHit')
  add(outro + T.OUTRO_TEXT_AT, 'shimmer')
  add(outro + T.OUTRO_URL_AT, 'chime')

  events.sort((a, b) => a.t - b.t)
  return {
    duration: sec(T.DEMO_FRAMES),
    // The beat drops on the first feature chapter; every chapter starts on a bar line.
    drop: sec(T.sceneStart('step-0')),
    scenes: T.SCENES.map(s => ({ key: s.key, start: sec(s.from) })),
    events,
  }
}
