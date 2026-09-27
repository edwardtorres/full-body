import { workouts } from '../data/workouts'
import { exerciseUnit } from './activeWorkout'
import { allExercisesResolved } from './activeWorkout'
import type { ActiveWorkoutSession, Exercise, HistoricalExercise, Workout, WorkoutHistoryEntry } from '../types/training'

export function historyEntryFromSession(session: ActiveWorkoutSession, workout: Workout, completedAt: Date): WorkoutHistoryEntry | null {
  if (session.status !== 'completed' || !allExercisesResolved(session) || session.workoutId !== workout.id || session.exercises.length !== workout.exercises.length) return null
  return {
    id: session.id,
    workoutId: workout.id,
    dumbbellWeight: session.dumbbellWeight,
    scheduledDay: session.scheduledDay,
    startedAt: session.startedAt,
    completedAt: completedAt.toISOString(),
    durationSeconds: Math.max(0, Math.round((completedAt.getTime() - Date.parse(session.startedAt)) / 1000)),
    exercises: session.exercises.map((item, index) => ({
      exerciseId: item.exerciseId,
      variantId: item.variantId ?? item.exerciseId,
      status: item.status === 'completed' ? 'completed' : 'skipped',
      dumbbellCount: workout.exercises[index].dumbbellCount,
      sets: item.sets.map((set) => ({ ...set })),
    })),
  }
}

export function sortHistory(entries: readonly WorkoutHistoryEntry[]): WorkoutHistoryEntry[] {
  return [...entries].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt) || b.id.localeCompare(a.id))
}

export function historyEntrySummary(entry: WorkoutHistoryEntry): { completed: number; skipped: number; sets: number; reps: number; minutes: number } {
  const workout = workouts.find((item) => item.id === entry.workoutId)
  return {
    completed: entry.exercises.filter((item) => item.status === 'completed').length,
    skipped: entry.exercises.filter((item) => item.status === 'skipped').length,
    sets: entry.exercises.reduce((sum, item) => sum + item.sets.length, 0),
    reps: entry.exercises.reduce((sum, item, index) => sum + (workout && exerciseUnit(workout.exercises[index]) === 'reps'
      ? item.sets.reduce((total, set) => total + set.actualReps, 0) : 0), 0),
    minutes: Math.max(0, Math.round(entry.durationSeconds / 60)),
  }
}

export function exerciseFromHistory(entry: WorkoutHistoryEntry, exercise: Exercise): HistoricalExercise | null {
  return entry.exercises.find((item) => item.exerciseId === exercise.id && item.dumbbellCount === exercise.dumbbellCount) ?? null
}
