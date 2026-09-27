import type { ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import { useMemo, useState } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { MuscleGroup } from '../../types/training'
import { muscleStatus } from '../../lib/training'

type Vec3 = [number, number, number]
type ProfilePoint = [y: number, width: number, depth: number, x?: number, z?: number]

interface ModelProps {
  selectedMuscle: MuscleGroup | null
  activeMuscles?: ReadonlySet<MuscleGroup>
  completedMuscles: ReadonlySet<MuscleGroup>
  analytics?: { mode: 'strong' | 'weak'; highlighted: ReadonlySet<MuscleGroup> }
  onSelect: (muscle: MuscleGroup) => void
}

interface RegionProps extends ModelProps {
  muscle: MuscleGroup
  position: Vec3
  scale: Vec3
  rotation?: Vec3
  outline?: [number, number][]
  surface?: 'front' | 'back'
}

const skin = '#aa9d8f'
const face = '#b7a99a'

// Ring-based shells create connected human contours. Region meshes remain separate
// raycast targets so an anatomical GLTF can replace the sculpture later.
function shellGeometry(profile: ProfilePoint[]): BufferGeometry {
  const vertices: number[] = []
  const indices: number[] = []
  const radial = 28
  const steps = 6
  const sample = (index: number, field: number) => profile[Math.max(0, Math.min(profile.length - 1, index))][field] ?? 0
  const curve = (a: number, b: number, c: number, d: number, t: number) =>
    0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)

  for (let segment = 0; segment < profile.length - 1; segment++) {
    for (let step = 0; step < steps; step++) {
      const t = step / steps
      const fields = [0, 1, 2, 3, 4].map((field) => curve(
        sample(segment - 1, field), sample(segment, field), sample(segment + 1, field), sample(segment + 2, field), t,
      ))
      const [y, width, depth, x, z] = fields
      for (let spoke = 0; spoke < radial; spoke++) {
        const angle = spoke / radial * Math.PI * 2
        vertices.push(x + Math.cos(angle) * Math.max(width, 0.005), y, z + Math.sin(angle) * Math.max(depth, 0.005))
      }
    }
  }
  const end = profile[profile.length - 1]
  for (let spoke = 0; spoke < radial; spoke++) {
    const angle = spoke / radial * Math.PI * 2
    vertices.push((end[3] ?? 0) + Math.cos(angle) * end[1], end[0], (end[4] ?? 0) + Math.sin(angle) * end[2])
  }
  const rings = (profile.length - 1) * steps + 1
  for (let ring = 0; ring < rings - 1; ring++) {
    for (let spoke = 0; spoke < radial; spoke++) {
      const next = (spoke + 1) % radial
      const a = ring * radial + spoke
      const b = ring * radial + next
      const c = (ring + 1) * radial + spoke
      const d = (ring + 1) * radial + next
      indices.push(a, b, c, b, d, c)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function torsoDepth(x: number, y: number) {
  let top = torso[0]
  let bottom = torso[torso.length - 1]
  for (let index = 0; index < torso.length - 1; index++) {
    if (y <= torso[index][0] && y >= torso[index + 1][0]) {
      top = torso[index]
      bottom = torso[index + 1]
      break
    }
  }
  const span = top[0] - bottom[0]
  const t = span ? (top[0] - y) / span : 0
  const width = top[1] + (bottom[1] - top[1]) * t
  const depth = top[2] + (bottom[2] - top[2]) * t
  return depth * Math.sqrt(Math.max(0, 1 - Math.min(1, (x / width) ** 2)))
}

function patchGeometry(outline: [number, number][], surface: 'front' | 'back'): BufferGeometry {
  const direction = surface === 'front' ? 1 : -1
  const centerX = outline.reduce((sum, point) => sum + point[0], 0) / outline.length
  const centerY = outline.reduce((sum, point) => sum + point[1], 0) / outline.length
  const vertices = [centerX, centerY, direction * (torsoDepth(centerX, centerY) + .07)]
  for (const [x, y] of outline) vertices.push(x, y, direction * (torsoDepth(x, y) + .045))
  const indices: number[] = []
  for (let index = 0; index < outline.length; index++) {
    const next = (index + 1) % outline.length
    if (direction === 1) indices.push(0, index + 1, next + 1)
    else indices.push(0, next + 1, index + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function Shell({ profile, color = skin }: { profile: ProfilePoint[]; color?: string }) {
  const geometry = useMemo(() => shellGeometry(profile), [profile])
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.91} metalness={0.01} side={2} /></mesh>
}

function Oval({ position, scale, color = skin, rotation = [0, 0, 0] }: { position: Vec3; scale: Vec3; color?: string; rotation?: Vec3 }) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
    <sphereGeometry args={[1, 36, 28]} />
    <meshStandardMaterial color={color} roughness={0.9} metalness={0.01} />
  </mesh>
}

function Region({ muscle, position, scale, rotation = [0, 0, 0], outline, surface = 'front', selectedMuscle, activeMuscles, completedMuscles, analytics, onSelect }: RegionProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered, 'pointer', 'auto')
  const outlineKey = outline?.flat().join(',') ?? ''
  const patch = useMemo(() => outline ? patchGeometry(outline, surface) : null, [outlineKey, surface])
  const status = muscleStatus(muscle, selectedMuscle, completedMuscles)
  const active = activeMuscles?.has(muscle) ?? false
  const analyticsHighlighted = analytics?.highlighted.has(muscle) ?? false
  const tone = analytics ? analyticsHighlighted ? analytics.mode === 'strong' ? selectedMuscle === muscle ? '#28685f' : '#5d9b80' : selectedMuscle === muscle ? '#8b683e' : '#b9935f'
    : selectedMuscle === muscle ? '#688883' : hovered ? '#a9bcb1' : '#9a8575'
    : active ? '#c97752' : status === 'selected-completed' ? '#174f50' : status === 'selected' ? '#c97752' : status === 'completed' ? '#2e8587' : hovered ? '#8db4ae' : '#9a8575'
  const muted = analytics ? !analyticsHighlighted && selectedMuscle !== muscle && !hovered : status === 'idle' && !active && !hovered
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect(muscle)
  }
  return <mesh position={position} scale={scale} rotation={rotation} onClick={select} onPointerOver={(event) => { event.stopPropagation(); setHovered(true) }} onPointerOut={() => setHovered(false)} castShadow>
    {patch ? <primitive object={patch} attach="geometry" /> : <sphereGeometry args={[1, 36, 28]} />}
    <meshStandardMaterial color={tone} roughness={0.83} metalness={0.02} side={2} transparent={muted} opacity={muted ? 0.48 : 1} emissive={muted ? '#000000' : tone} emissiveIntensity={muted ? 0 : 0.1} />
  </mesh>
}

const torso: ProfilePoint[] = [
  [1.68, .11, .12], [1.48, .28, .2], [1.32, .49, .26], [1.04, .53, .3],
  [.69, .48, .28], [.39, .38, .24], [.05, .32, .23], [-.28, .38, .27], [-.56, .3, .22],
]
const neck: ProfilePoint[] = [[1.91, .12, .13], [1.72, .14, .15], [1.55, .18, .17]]
const head: ProfilePoint[] = [
  [2.5, .06, .09], [2.44, .18, .2], [2.29, .255, .265],
  [2.09, .27, .26], [1.94, .23, .22], [1.84, .16, .16],
]
const arm = (side: number): ProfilePoint[] => [
  [1.4, .18, .17, side * .57], [1.25, .2, .2, side * .67], [.99, .17, .18, side * .73],
  [.57, .15, .15, side * .77], [.25, .12, .13, side * .81], [.04, .12, .12, side * .82],
  [-.27, .15, .14, side * .85], [-.62, .11, .11, side * .9], [-.83, .085, .09, side * .92],
  [-1.0, .088, .09, side * .92], [-1.14, .07, .075, side * .92],
]
const leg = (side: number): ProfilePoint[] => [
  [-.32, .18, .2, side * .2], [-.69, .24, .24, side * .21], [-1.07, .2, .22, side * .24],
  [-1.39, .16, .17, side * .26], [-1.59, .13, .15, side * .26], [-1.74, .12, .13, side * .27],
  [-1.98, .16, .17, side * .27], [-2.24, .12, .13, side * .27], [-2.42, .09, .1, side * .27],
]

const mirror = (side: number, points: [number, number][]): [number, number][] =>
  points.map(([x, y]) => [side * x, y])

export function AnatomyModel(props: ModelProps) {
  return <group position={[0, .01, 0]}>
    <Shell profile={torso} />
    <Shell profile={neck} color={face} />
    <Shell profile={head} color={face} />
    <Oval position={[0, 2.075, .247]} scale={[.037, .095, .055]} color={face} />
    {([-1, 1] as const).map((side) => <group key={side}>
      <Oval position={[side * .275, 2.12, -.005]} scale={[.046, .088, .065]} color={face} />
      <Shell profile={arm(side)} />
      <Shell profile={leg(side)} />
      <Oval position={[side * .92, -1.06, .005]} scale={[.09, .14, .075]} color={face} />
      {[0, 1, 2, 3].map((finger) => <Oval key={finger} position={[side * (.855 + finger * .042), -1.21 - (finger === 1 || finger === 2 ? .025 : 0), .018]} scale={[.022, .11, .03]} color={face} />)}
      <Oval position={[side * .27, -2.47, .115]} scale={[.15, .09, .29]} color={face} />
      <Region {...props} muscle="shoulders" position={[side * .68, 1.23, .115]} scale={[.17, .18, .115]} />
      <Region {...props} muscle="biceps" position={[side * .77, .76, .148]} scale={[.118, .28, .045]} rotation={[0, 0, side * .06]} />
      <Region {...props} muscle="triceps" position={[side * .76, .77, -.148]} scale={[.12, .29, .045]} rotation={[0, 0, side * .06]} />
      <Region {...props} muscle="chest" position={[0, 0, 0]} scale={[1, 1, 1]} outline={mirror(side, [
        [.04, 1.31], [.18, 1.36], [.34, 1.33], [.46, 1.26], [.49, 1.17], [.47, 1.1],
        [.39, 1.04], [.31, 1.0], [.18, 1.0], [.08, 1.05], [.04, 1.14],
      ])} />
      <Region {...props} muscle="quadriceps" position={[side * .22, -1.02, .21]} scale={[.18, .44, .045]} rotation={[0, 0, side * .025]} />
      <Region {...props} muscle="hamstrings" position={[side * .23, -1.08, -.205]} scale={[.17, .39, .045]} />
      <Region {...props} muscle="glutes" position={[side * .205, -.43, -.205]} scale={[.21, .21, .055]} />
      <Region {...props} muscle="calves" position={[side * .27, -1.98, -.143]} scale={[.13, .27, .045]} />
      <Region {...props} muscle="upperBack" position={[0, 0, 0]} scale={[1, 1, 1]} surface="back" outline={mirror(side, [
        [.03, 1.52], [.16, 1.48], [.31, 1.4], [.44, 1.29], [.48, 1.21],
        [.44, 1.12], [.35, 1.04], [.2, 1.05], [.09, 1.1],
      ])} />
      <Region {...props} muscle="lats" position={[0, 0, 0]} scale={[1, 1, 1]} surface="back" outline={mirror(side, [
        [.31, 1.0], [.42, .97], [.49, .88], [.47, .72], [.43, .52],
        [.35, .27], [.29, .18], [.21, .26], [.18, .42], [.2, .7],
      ])} />
      {([.75, .51, .28] as const).map((y, index) => <Region key={y} {...props} muscle="abs"
        position={[side * .115, y, torsoDepth(.115, y) + .02]}
        scale={[index === 2 ? .09 : .105, index === 2 ? .085 : .095, .025]}
      />)}
    </group>)}
  </group>
}
