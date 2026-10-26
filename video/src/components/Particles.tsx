import { ThreeCanvas } from '@remotion/three'
import { useMemo } from 'react'
import { useCurrentFrame } from 'remotion'
import * as THREE from 'three'
import { HEIGHT, WIDTH } from '../theme'

/** A slow, deterministic Three.js particle field with a few floating page tiles. */
function Field({ count }: { count: number }) {
  const frame = useCurrentFrame()
  const geometry = useMemo(() => {
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 4 + rand() * 9
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.6, r * Math.sin(phi) * Math.sin(theta)], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [count])

  const t = frame / 30
  return (
    <group rotation={[0.25, t * 0.08, 0]}>
      <points geometry={geometry}>
        <pointsMaterial color="#5eead4" size={0.045} sizeAttenuation transparent opacity={0.75} depthWrite={false} />
      </points>
      {[0, 1, 2, 3, 4].map(i => (
        <mesh
          key={i}
          position={[Math.cos(i * 1.3) * 6, Math.sin(t * 0.8 + i) * 0.4 + (i - 2) * 0.9, Math.sin(i * 1.3) * 3 - 6]}
          rotation={[t * 0.2 + i, t * 0.3 + i * 0.5, 0]}
        >
          <boxGeometry args={[1.2, 0.05, 0.8]} />
          <meshStandardMaterial color={i % 2 ? '#0f766e' : '#1d4ed8'} roughness={0.35} metalness={0.2} transparent opacity={0.28} />
        </mesh>
      ))}
    </group>
  )
}

export function Particles({ count = 1600 }: { count?: number }) {
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} camera={{ position: [0, 0, 11], fov: 45 }} gl={{ alpha: true, antialias: true }} style={{ position: 'absolute', inset: 0 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 6]} intensity={1.4} />
      <Field count={count} />
    </ThreeCanvas>
  )
}
