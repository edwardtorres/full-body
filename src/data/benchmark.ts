import { workouts } from './workouts'
import type { Exercise } from '../types/training'
import type { MuscleGroup } from '../types/training'

export const benchmarkExerciseIds = [
  'goblet-squat', 'romanian-deadlift', 'floor-press', 'one-arm-row', 'overhead-press',
] as const

export const benchmarkExercises: Exercise[] = benchmarkExerciseIds.map((id) => {
  const exercise = workouts.flatMap((workout) => workout.exercises).find((item) => item.id === id)
  if (!exercise) throw new Error(`Missing benchmark exercise: ${id}`)
  return exercise
})

export const benchmarkCues: Record<(typeof benchmarkExerciseIds)[number], string[]> = {
  'goblet-squat': ['Keep your torso controlled', 'Let knees track over feet', 'Squat to a comfortable depth'],
  'romanian-deadlift': ['Keep a soft bend in your knees', 'Hinge at the hips', 'Keep the dumbbell close'],
  'floor-press': ['Keep elbows controlled', 'Pause lightly at the floor', 'Press without bouncing'],
  'one-arm-row': ['Brace your free hand', 'Pull elbow toward your hip', 'Avoid twisting your torso'],
  'overhead-press': ['Stand tall', 'Keep ribs stacked over hips', 'Press in a controlled path'],
}

export const muscleBenchmarkExercise: Partial<Record<MuscleGroup, string>> = {
  chest: 'floor-press',
  shoulders: 'overhead-press',
  quadriceps: 'goblet-squat',
  hamstrings: 'romanian-deadlift',
  glutes: 'romanian-deadlift',
  upperBack: 'one-arm-row',
  lats: 'one-arm-row',
}
