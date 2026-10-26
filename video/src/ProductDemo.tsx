import type { ReactNode } from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { BlocksIntro, INTRO_FRAMES } from './scenes/BlocksIntro'
import { Devices, DEVICES_FRAMES, Outro, OUTRO_FRAMES } from './scenes/Closing'
import { FeatureStep, STEP_FRAMES } from './scenes/FeatureStep'
import { PageReveal, REVEAL_FRAMES } from './scenes/PageReveal'
import { STEPS } from './steps'
import { backdrop } from './theme'

/** Scenes overlap slightly so each cross-fades into the next. */
const OVERLAP = 14

const timeline = (() => {
  const scenes: Array<{ key: string; frames: number; render: () => ReactNode }> = [
    { key: 'intro', frames: INTRO_FRAMES, render: () => <BlocksIntro /> },
    { key: 'reveal', frames: REVEAL_FRAMES, render: () => <PageReveal /> },
    ...STEPS.map((step, i) => ({ key: `step-${i}`, frames: STEP_FRAMES, render: () => <FeatureStep step={step} index={i} total={STEPS.length} /> })),
    { key: 'devices', frames: DEVICES_FRAMES, render: () => <Devices /> },
    { key: 'outro', frames: OUTRO_FRAMES, render: () => <Outro /> },
  ]
  let from = 0
  return scenes.map((scene, i) => {
    const start = from
    from += scene.frames - (i < scenes.length - 1 ? OVERLAP : 0)
    return { ...scene, from: start }
  })
})()

export const DEMO_FRAMES = timeline[timeline.length - 1].from + timeline[timeline.length - 1].frames

export function ProductDemo() {
  return (
    <AbsoluteFill style={{ background: backdrop }}>
      {timeline.map(scene => (
        <Sequence key={scene.key} from={scene.from} durationInFrames={scene.frames} name={scene.key}>
          {scene.render()}
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
