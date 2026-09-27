import type { WeekDay } from './profile'

export const muscleGroups = [
  'chest', 'shoulders', 'biceps', 'triceps', 'abs', 'quadriceps',
  'hamstrings', 'glutes', 'calves', 'upperBack', 'lats',
] as const

export type MuscleGroup = (typeof muscleGroups)[number]
export type MuscleStatus = 'idle' | 'selected' | 'completed' | 'selected-completed'
export type SessionKind = 'regional' | 'scheduled'
export type MovementPattern = 'squat' | 'lunge' | 'hinge' | 'push' | 'pull' | 'carry' | 'core' | 'isolation'
export type TrainingDay = 'monday' | 'wednesday' | 'friday'

export interface Exercise {
  id: string
  variantId?: string
  name: string
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  movementPattern: MovementPattern
  defaultSets: number
  repRange: string
  dumbbellCount: 1 | 2
}

export interface Workout {
  id: string
  day: TrainingDay
  name: string
  exercises: Exercise[]
}

export type ExerciseStatus = 'pending' | 'active' | 'completed' | 'skipped'
export type WorkoutStatus = 'active' | 'completed' | 'abandoned'

export interface LoggedSet {
  setNumber: number
  targetReps: number
  targetWasEdited?: boolean
  actualReps: number
  rir: number
  completedAt: string
}

export interface SessionExercise {
  exerciseId: string
  variantId?: string
  status: ExerciseStatus
  sets: LoggedSet[]
}

export interface ActiveWorkoutSession {
  id: string
  workoutId: string
  dumbbellWeight: number
  scheduledDay: WeekDay
  startedAt: string
  currentExerciseIndex: number
  status: WorkoutStatus
  exercises: SessionExercise[]
  restEndsAt: string | null
}

export interface HistoricalExercise {
  exerciseId: string
  variantId?: string
  status: 'completed' | 'skipped'
  dumbbellCount: 1 | 2
  sets: LoggedSet[]
}

export interface WorkoutHistoryEntry {
  id: string
  workoutId: string
  dumbbellWeight: number
  scheduledDay: WeekDay
  startedAt: string
  completedAt: string
  durationSeconds: number
  exercises: HistoricalExercise[]
}
