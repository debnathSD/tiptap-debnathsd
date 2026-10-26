import { ThreeCanvas } from '@remotion/three'
import { useLoader, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo } from 'react'
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import * as THREE from 'three'
import { poseAt, SIM_FRAMES, THICKNESS, TILES } from '../lib/physics'
import { backdrop, colors, font, HEIGHT, manifest, WIDTH } from '../theme'

/**
 * Act 1 — "blocks become a page". Real web-part crops fall under physics,
 * then fly into a page layout while the camera swings to a top-down view.
 */

export const INTRO_FRAMES = 240
const ASSEMBLE_AT = 118

function CameraRig() {
  const frame = useCurrentFrame()
  const camera = useThree(state => state.camera)
  useLayoutEffect(() => {
    const swing = interpolate(frame, [ASSEMBLE_AT - 10, ASSEMBLE_AT + 70], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    })
    const orbit = interpolate(frame, [0, ASSEMBLE_AT], [-0.55, 0.15], { extrapolateRight: 'clamp' })
    const radius = 6.6
    const from = new THREE.Vector3(Math.sin(orbit) * radius, 4.4, Math.cos(orbit) * radius)
    const to = new THREE.Vector3(0, 8.9, 0.12)
    camera.position.lerpVectors(from, to, swing)
    camera.up.set(0, 1, 0).lerp(new THREE.Vector3(0, 0, -1), swing).normalize()
    camera.lookAt(0, interpolate(swing, [0, 1], [1.5, 0]), interpolate(swing, [0, 1], [-0.6, 0.12]))
    camera.updateProjectionMatrix()
  }, [frame, camera])
  return null
}

function Tiles() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // useLoader suspends; ThreeCanvas holds the render until every texture is in.
  const files = Object.values(manifest.crops).map(c => staticFile(`shots/${c.file}`))
  const loaded = useLoader(THREE.TextureLoader, files)

  const geometries = useMemo(() => TILES.map(t => new THREE.BoxGeometry(t.size[0], THICKNESS, t.size[1])), [])
  const edge = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dff7f2', roughness: 0.5 }), [])
  const materials = useMemo(() => {
    const byFile = Object.fromEntries(files.map((file, i) => [file, loaded[i]]))
    return TILES.map(t => {
      const map = byFile[staticFile(`shots/${manifest.crops[t.crop].file}`)]
      map.colorSpace = THREE.SRGBColorSpace
      map.anisotropy = 8
      const top = new THREE.MeshStandardMaterial({ map, roughness: 0.55 })
      // Texture both faces: some tiles land upside down.
      return [edge, edge, top, top, edge, edge]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, edge])

  return (
    <>
      {TILES.map((tile, i) => {
        const pose = poseAt(Math.min(frame, SIM_FRAMES - 1), i)
        const assemble = spring({ frame: frame - ASSEMBLE_AT - i * 2.5, fps, config: { damping: 18, stiffness: 70, mass: 0.9 } })
        const from = new THREE.Vector3(...pose.p)
        const to = new THREE.Vector3(tile.target[0], THICKNESS / 2 + 0.002 * i, tile.target[1])
        const position = from.lerp(to, assemble)
        // Lift a little mid-flight so tiles don't clip through each other.
        position.y += Math.sin(Math.min(assemble, 1) * Math.PI) * 0.9
        const quaternion = new THREE.Quaternion(...pose.q).slerp(new THREE.Quaternion(), Math.min(1, assemble))
        return <mesh key={i} geometry={geometries[i]} material={materials[i]} position={position} quaternion={quaternion} castShadow receiveShadow />
      })}
    </>
  )
}

export function BlocksIntro() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const title = spring({ frame: frame - 18, fps, config: { damping: 16 } })
  const titleOut = interpolate(frame, [ASSEMBLE_AT - 8, ASSEMBLE_AT + 14], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const tagIn = interpolate(frame, [ASSEMBLE_AT + 40, ASSEMBLE_AT + 62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [INTRO_FRAMES - 24, INTRO_FRAMES], [1, 0], { extrapolateLeft: 'clamp' })

  return (
    <AbsoluteFill style={{ background: backdrop, opacity: fadeOut }}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} shadows flat camera={{ fov: 36, position: [0, 5, 8] }} gl={{ antialias: true, alpha: true }}>
        <CameraRig />
        <ambientLight intensity={1.6} />
        <directionalLight
          position={[4, 10, 5]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <shadowMaterial opacity={0.35} />
        </mesh>
        <Tiles />
      </ThreeCanvas>

      <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 120, fontFamily: font, opacity: titleOut }}>
        <div style={{ transform: `translateY(${(1 - title) * 40}px)`, opacity: title, textAlign: 'center' }}>
          <div style={{ fontSize: 26, letterSpacing: '0.32em', color: colors.mint, fontWeight: 700 }}>INTRODUCING</div>
          <div style={{ fontSize: 120, fontWeight: 800, color: colors.white, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Tiptap Pages</div>
          <div style={{ fontSize: 36, color: colors.muted, marginTop: 10 }}>SharePoint-style pages, built on Tiptap</div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-start', padding: '64px 0 0 80px', fontFamily: font, opacity: tagIn }}>
        <div
          style={{
            padding: '14px 28px',
            borderRadius: 999,
            background: 'rgba(4, 22, 26, 0.72)',
            border: '1px solid rgba(153, 246, 228, 0.35)',
            color: colors.text,
            fontSize: 34,
            fontWeight: 600,
          }}
        >
          Real web parts → one structured page
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
