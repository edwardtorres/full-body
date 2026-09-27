import type { MuscleGroup } from '../types/training'

export const muscleInfo: Record<MuscleGroup, { label: string; description: string }> = {
  chest: { label: 'Chest', description: 'Anterior torso · pressing' },
  shoulders: { label: 'Shoulders', description: 'Deltoids · pressing & raising' },
  biceps: { label: 'Biceps', description: 'Anterior upper arm · elbow flexion' },
  triceps: { label: 'Triceps', description: 'Posterior upper arm · elbow extension' },
  abs: { label: 'Abs / Core', description: 'Anterior trunk · bracing' },
  quadriceps: { label: 'Quadriceps', description: 'Anterior thigh · knee extension' },
  hamstrings: { label: 'Hamstrings', description: 'Posterior thigh · hip hinge' },
  glutes: { label: 'Glutes', description: 'Posterior hip · extension' },
  calves: { label: 'Calves', description: 'Lower leg · plantar flexion' },
  upperBack: { label: 'Upper back', description: 'Scapular muscles · rowing' },
  lats: { label: 'Lats', description: 'Lateral back · pulling' },
}
