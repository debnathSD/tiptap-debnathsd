import { TOUR_STEPS } from '../../src/tour/steps'

/**
 * Every timing in the film, in frames. Scenes, the soundtrack and the sound
 * effects all read from here, so picture and sound cannot drift apart.
 * Pure data: no React, so scripts/events.ts can bundle it for Node.
 */

export const FPS = 30

export const INTRO_FRAMES = 240
/** Frame (within the intro) when the fallen tiles start flying into the page layout. */
export const ASSEMBLE_AT = 118
/** Stagger between tiles assembling, in frames. */
export const ASSEMBLE_STAGGER = 2.5
export const TITLE_AT = 18
export const TAGLINE_AT = ASSEMBLE_AT + 40

export const REVEAL_FRAMES = 200
export const REVEAL_LABELS = [
  { at: 30, text: 'Banner + page properties' },
  { at: 52, text: 'KPI tiles with status' },
  { at: 74, text: 'Two-column regions' },
  { at: 96, text: 'Charts and styled tables' },
  { at: 118, text: 'FAQs and quick links' },
  { at: 140, text: 'Editorial cards' },
]

export const STEP_FRAMES = 225
/** Frames for each camera move inside a feature chapter. */
export const MOVE = 34
/** Frame (within a chapter) when the camera eases back out before the cut. */
export const ZOOM_OUT_AT = STEP_FRAMES - MOVE - 8
export const CARD_AT = 10
export const POINT_AT = (i: number) => 34 + i * 10
export const SPOT_AT = (at: number) => at + MOVE * 0.6
export const CLICK_AT = (at: number) => at + MOVE + 4

export const DEVICES_FRAMES = 210
export const FEATURE_CHIPS = [
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
export const CHIP_AT = (i: number) => 24 + i * 4

export const OUTRO_FRAMES = 180
export const LOGO_AT = 6
export const OUTRO_TEXT_AT = 20
export const OUTRO_URL_AT = 40

/** Scenes overlap slightly so each cross-fades into the next. */
export const OVERLAP = 14

export type SceneKey = 'intro' | 'reveal' | 'devices' | 'outro' | `step-${number}`

export const SCENES = (() => {
  const list: Array<{ key: SceneKey; frames: number; step?: number }> = [
    { key: 'intro', frames: INTRO_FRAMES },
    { key: 'reveal', frames: REVEAL_FRAMES },
    ...TOUR_STEPS.map((_, i) => ({ key: `step-${i}` as const, frames: STEP_FRAMES, step: i })),
    { key: 'devices', frames: DEVICES_FRAMES },
    { key: 'outro', frames: OUTRO_FRAMES },
  ]
  let from = 0
  return list.map((scene, i) => {
    const start = from
    from += scene.frames - (i < list.length - 1 ? OVERLAP : 0)
    return { ...scene, from: start }
  })
})()

export const DEMO_FRAMES = SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].frames

export const sceneStart = (key: SceneKey) => SCENES.find(s => s.key === key)!.from
