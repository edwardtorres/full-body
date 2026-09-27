import { initialTargetPerSet } from './profile'
import { muscleGroups, type ActiveWorkoutSession, type Exercise, type LoggedSet, type MuscleGroup, type SessionExercise, type Workout } from '../types/training'
import type { BenchmarkHistory } from '../types/profile'
import type { WeekDay } from '../types/profile'
import { getExerciseVariant, resolveExercise } from '../data/exerciseVariants'
import type { VariantSelections } from './variants'

export function exerciseUnit(exercise: Exercise): 'reps' | 'sec' {
  return exercise.repRange.includes('sec') ? 'sec' : 'reps'
}

export function initialExerciseTarget(exercise: Exercise, benchmarks: BenchmarkHistory, weight: number): number {
  const benchmark = [...(benchmarks[exercise.id] ?? [])].reverse().find((item) => item.weight === weight)
  if (benchmark) return initialTargetPerSet(benchmark, exercise)
  const lower = Number(exercise.repRange.match(/\d+/)?.[0] ?? 8)
  return lower
}

export function isUnilateral(exercise: Exercise): boolean {
  return Boolean(getExerciseVariant(exercise.id, exercise.variantId)?.unilateral)
    || exercise.repRange.includes('/ side')
}

export function restSeconds(exercise: Exercise): number {
  return ['isolation', 'core', 'carry'].includes(exercise.movementPattern) ? 75 : 120
}

export function remainingRestSeconds(restEndsAt: string | null, nowMs: number): number {
  return restEndsAt ? Math.max(0, Math.ceil((Date.parse(restEndsAt) - nowMs) / 1000)) : 0
}

export function createActiveWorkout(workout: Workout, scheduledDay: WeekDay, now: Date, id: string, dumbbellWeight = 20, selections: VariantSelections = {}): ActiveWorkoutSession {
  return {
    id, workoutId: workout.id, dumbbellWeight, scheduledDay, startedAt: now.toISOString(), currentExerciseIndex: 0,
    status: 'active', restEndsAt: null,
    exercises: workout.exercises.map((exercise, index) => ({ exerciseId: exercise.id, variantId: resolveExercise(exercise, selections[exercise.id]).variantId!, status: index === 0 ? 'active' : 'pending', sets: [] })),
  }
}

export function sessionCounts(session: ActiveWorkoutSession) {
  const completed = session.exercises.filter((exercise) => exercise.status === 'completed').length
  const skipped = session.exercises.filter((exercise) => exercise.status === 'skipped').length
  return { completed, skipped, remaining: session.exercises.length - completed - skipped }
}

export function allExercisesResolved(session: ActiveWorkoutSession): boolean {
  return sessionCounts(session).remaining === 0
}

function nextPendingIndex(exercises: SessionExercise[], from: number): number {
  const next = exercises.findIndex((exercise, index) => index > from && exercise.status === 'pending')
  if (next !== -1) return next
  return exercises.findIndex((exercise) => exercise.status === 'pending')
}

export function completeSet(session: ActiveWorkoutSession, workout: Workout, targetReps: number, actualReps: number, rir: number, now: Date, targetWasEdited = false): ActiveWorkoutSession {
  const index = session.currentExerciseIndex
  const prescription = workout.exercises[index]
  const item = session.exercises[index]
  if (session.status !== 'active' || !prescription || item?.status !== 'active' || item.sets.length >= prescription.defaultSets
    || !Number.isInteger(targetReps) || targetReps < 1 || targetReps > 999
    || !Number.isInteger(actualReps) || actualReps < 0 || actualReps > 999
    || !Number.isInteger(rir) || rir < 0 || rir > 4) return session
  const logged: LoggedSet = { setNumber: item.sets.length + 1, targetReps, targetWasEdited, actualReps, rir, completedAt: now.toISOString() }
  const complete = logged.setNumber === prescription.defaultSets
  const exercises = session.exercises.map((exercise, position) => position === index
    ? { ...exercise, status: complete ? 'completed' as const : 'active' as const, sets: [...exercise.sets, logged] }
    : exercise)
  const nextIndex = complete ? nextPendingIndex(exercises, index) : index
  if (nextIndex >= 0 && nextIndex !== index) exercises[nextIndex] = { ...exercises[nextIndex], status: 'active' }
  const resolved = exercises.every((exercise) => exercise.status === 'completed' || exercise.status === 'skipped')
  return { ...session, exercises, currentExerciseIndex: nextIndex < 0 ? index : nextIndex,
    restEndsAt: resolved ? null : new Date(now.getTime() + restSeconds(prescription) * 1000).toISOString() }
}

export function editLoggedSet(session: ActiveWorkoutSession, exerciseIndex: number, setIndex: number, actualReps: number, rir: number): ActiveWorkoutSession {
  if (!Number.isInteger(actualReps) || actualReps < 0 || actualReps > 999 || !Number.isInteger(rir) || rir < 0 || rir > 4
    || !session.exercises[exerciseIndex]?.sets[setIndex]) return session
  return { ...session, exercises: session.exercises.map((exercise, index) => index === exerciseIndex
    ? { ...exercise, sets: exercise.sets.map((set, setPosition) => setPosition === setIndex ? { ...set, actualReps, rir } : set) }
    : exercise) }
}

export function skipExercise(session: ActiveWorkoutSession): ActiveWorkoutSession {
  const index = session.currentExerciseIndex
  if (session.exercises[index]?.status !== 'active') return session
  const exercises = session.exercises.map((exercise, position) => position === index ? { ...exercise, status: 'skipped' as const } : exercise)
  const nextIndex = nextPendingIndex(exercises, index)
  if (nextIndex >= 0) exercises[nextIndex] = { ...exercises[nextIndex], status: 'active' }
  return { ...session, exercises, currentExerciseIndex: nextIndex < 0 ? index : nextIndex, restEndsAt: null }
}

export function jumpToExercise(session: ActiveWorkoutSession, index: number): ActiveWorkoutSession {
  if (session.exercises[index]?.status !== 'pending' || session.exercises[session.currentExerciseIndex]?.status !== 'active') return session
  const exercises = session.exercises.map((exercise, position) => position === index ? { ...exercise, status: 'active' as const }
    : position === session.currentExerciseIndex ? { ...exercise, status: 'pending' as const } : exercise)
  return { ...session, exercises, currentExerciseIndex: index, restEndsAt: null }
}

export function completedMusclesForSession(workout: Workout, session: ActiveWorkoutSession): Set<MuscleGroup> {
  const completedIds = new Set(session.exercises.filter((exercise) => exercise.status === 'completed').map((exercise) => exercise.exerciseId))
  return new Set(muscleGroups.filter((muscle) => {
    const primary = workout.exercises.filter((exercise) => exercise.primaryMuscles.includes(muscle))
    return primary.length > 0 && primary.every((exercise) => completedIds.has(exercise.id))
  }))
}

export function sessionSummary(session: ActiveWorkoutSession, workout: Workout, now: Date) {
  const counts = sessionCounts(session)
  const sets = session.exercises.flatMap((exercise) => exercise.sets)
  const reps = session.exercises.reduce((sum, exercise, index) => sum + (exerciseUnit(workout.exercises[index]) === 'reps'
    ? exercise.sets.reduce((total, set) => total + set.actualReps, 0) : 0), 0)
  return { ...counts, sets: sets.length, reps,
    minutes: Math.max(0, Math.round((now.getTime() - Date.parse(session.startedAt)) / 60000)) }
}
