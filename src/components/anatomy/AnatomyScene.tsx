import { Canvas } from '@react-three/fiber'
import { memo, Suspense } from 'react'
import type { MuscleGroup } from '../../types/training'
import { AnatomyModel } from './AnatomyModel'
import { CameraControls, type BodyView } from './CameraControls'

interface Props {
  view: BodyView
  selectedMuscle: MuscleGroup | null
  activeMuscles?: ReadonlySet<MuscleGroup>
  completedMuscles: ReadonlySet<MuscleGroup>
  analytics?: { mode: 'strong' | 'weak'; highlighted: ReadonlySet<MuscleGroup> }
  onSelect: (muscle: MuscleGroup) => void
  onClear: () => void
  reducedMotion: boolean
}

export const AnatomyScene = memo(function AnatomyScene({ view, selectedMuscle, activeMuscles, completedMuscles, analytics, onSelect, onClear, reducedMotion }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0.15, 7.8], fov: 38, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      onPointerMissed={onClear}
      gl={{ antialias: true, alpha: true }}
      aria-label="Interactive anatomical mannequin. Select a muscle region to inspect it."
    >
      <ambientLight intensity={1.0} />
      <hemisphereLight args={['#fff8ee', '#596e6a', 1.4]} />
      <directionalLight position={[3, 5, 5]} intensity={2.25} color="#fff7e9" />
      <directionalLight position={[-3, 2, -4]} intensity={1.15} color="#83a9a5" />
      <CameraControls view={view} reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <AnatomyModel selectedMuscle={selectedMuscle} activeMuscles={activeMuscles} completedMuscles={completedMuscles} analytics={analytics} onSelect={onSelect} />
      </Suspense>
    </Canvas>
  )
})
