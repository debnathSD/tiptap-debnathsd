import * as CANNON from 'cannon-es'
import { manifest } from '../theme'

/**
 * Deterministic physics for the intro: web-part tiles (textured with real
 * screenshot crops) tumble onto the floor. Remotion renders frames in
 * parallel and out of order, so the whole simulation is precomputed once
 * with a fixed timestep and frames read positions from the table.
 */

export type Tile = {
  crop: keyof typeof manifest.crops
  size: [w: number, d: number]
  /** Where the tile lands when the blocks assemble into a page (top-down layout). */
  target: [x: number, z: number]
}

const T = 0.06 // tile thickness
const UNIT = 300 // css px per world unit

const sized = (crop: string, scale = 1): [number, number] => {
  const c = manifest.crops[crop]
  return [(c.width / UNIT) * scale, (c.height / UNIT) * scale]
}

export const TILES: Tile[] = [
  { crop: 'pill', size: sized('pill'), target: [0, -2.35] },
  { crop: 'chart', size: sized('chart'), target: [-0.9, -1.25] },
  { crop: 'links', size: sized('links'), target: [1.18, -1.28] },
  { crop: 'table', size: sized('table'), target: [0, 0.27] },
  { crop: 'faq', size: sized('faq'), target: [-0.62, 1.4] },
  { crop: 'callout', size: sized('callout', 0.55), target: [-0.62, 1.82] },
  { crop: 'card', size: sized('card', 0.82), target: [1.28, 1.6] },
  ...[-1.5, -0.98, -0.46, 0.06].map(x => ({ crop: 'kpi' as const, size: sized('kpi', 0.82), target: [x, 2.62] as [number, number] })),
]

export const THICKNESS = T
export const SIM_FRAMES = 150
const SUBSTEPS = 4

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Pose = { p: [number, number, number]; q: [number, number, number, number] }

function simulate(): Pose[][] {
  const rand = mulberry32(2026)
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
  world.allowSleep = true
  const material = new CANNON.Material('tile')
  world.addContactMaterial(new CANNON.ContactMaterial(material, material, { friction: 0.45, restitution: 0.18 }))

  const floor = new CANNON.Body({ mass: 0, material, shape: new CANNON.Plane() })
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  world.addBody(floor)

  const bodies = TILES.map((tile, i) => {
    const [w, d] = tile.size
    const body = new CANNON.Body({
      mass: w * d,
      material,
      shape: new CANNON.Box(new CANNON.Vec3(w / 2, T / 2, d / 2)),
      position: new CANNON.Vec3((rand() - 0.5) * 3.2, 2.2 + i * 0.75, (rand() - 0.5) * 2.6),
      angularDamping: 0.25,
      linearDamping: 0.05,
    })
    body.quaternion.setFromEuler((rand() - 0.5) * 1.6, rand() * Math.PI * 2, (rand() - 0.5) * 1.6)
    body.angularVelocity.set((rand() - 0.5) * 6, (rand() - 0.5) * 6, (rand() - 0.5) * 6)
    world.addBody(body)
    return body
  })

  const frames: Pose[][] = []
  for (let f = 0; f < SIM_FRAMES; f++) {
    frames.push(
      bodies.map(b => ({
        p: [b.position.x, b.position.y, b.position.z],
        q: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w],
      })),
    )
    for (let s = 0; s < SUBSTEPS; s++) world.step(1 / (30 * SUBSTEPS))
  }
  return frames
}

export const SIMULATION = simulate()

export function poseAt(frame: number, index: number): Pose {
  const f = Math.max(0, Math.min(SIM_FRAMES - 1, Math.floor(frame)))
  return SIMULATION[f][index]
}
