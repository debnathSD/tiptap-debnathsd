import { Composition } from 'remotion'
import { DEMO_FRAMES, ProductDemo } from './ProductDemo'
import { FPS, HEIGHT, WIDTH } from './theme'

export function Root() {
  return <Composition id="ProductDemo" component={ProductDemo} durationInFrames={DEMO_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
}
