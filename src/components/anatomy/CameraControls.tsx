import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'

export type BodyView = 'front' | 'back'

const positions: Record<BodyView, [number, number, number]> = {
  front: [0, 0.15, 7.8],
  back: [0, 0.15, -7.8],
}

export function CameraControls({ view, reducedMotion }: { view: BodyView; reducedMotion: boolean }) {
  const { camera } = useThree()
  const target = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    target.set(...positions[view])
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-5 * delta)
    camera.position.lerp(target, alpha)
    camera.lookAt(0, 0.05, 0)
  })

  return null
}
