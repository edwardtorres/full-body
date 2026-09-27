import { workouts } from '../data/workouts'
import { getExerciseFamily, getExerciseVariant, getNextVariant, historicalVariantId, resolveExercise, type ExerciseVariant } from '../data/exerciseVariants'
import { exerciseUnit } from './activeWorkout'
import { earnedProgressionStep, exerciseSucceeded, repCeiling, type ExercisePerformance } from './progression'
import type { Exercise, WorkoutHistoryEntry } from '../types/training'

export type VariantSelections = Record<string, string>
const scheduledIds = new Set(workouts.map((workout) => workout.id))
const baseExercises = new Map(workouts.flatMap((workout) => workout.exercises).map((exercise) => [exercise.id, exercise]))

export function getCurrentVariant(base: Exercise, selections: VariantSelections): ExerciseVariant {
  return getExerciseVariant(base.id, selections[base.id]) ?? getExerciseVariant(base.id)!
}

export function getVariantInitialTargets(base: Exercise, variantId: string): number[] {
  const variant = getExerciseVariant(base.id, variantId) ?? getExerciseVariant(base.id)!
  const lower = Number(variant.repRange.match(/\d+/)?.[0] ?? 8)
  return Array(base.defaultSets).fill(lower)
}

export function isSuccessfulCeiling(performance: ExercisePerformance, base: Exercise, variantId: string): boolean {
  const variant = getExerciseVariant(base.id, variantId)
  if (!variant || exerciseUnit(base) === 'sec' || performance.exercise.exerciseId !== base.id
    || historicalVariantId(performance.exercise) !== variantId || performance.exercise.dumbbellCount !== base.dumbbellCount) return false
  const concrete = resolveExercise(base, variantId)
  const ceiling = repCeiling(concrete)
  return ceiling !== null && performance.exercise.sets.every((set) => set.targetReps === ceiling && set.actualReps >= ceiling)
    && exerciseSucceeded(performance, concrete)
}

function performances(history: readonly WorkoutHistoryEntry[], base: Exercise, variantId: string, weight?: number): ExercisePerformance[] {
  return [...history].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id)).flatMap((workout) => {
    if (!scheduledIds.has(workout.workoutId)) return []
    if (weight !== undefined && workout.dumbbellWeight !== weight) return []
    const item = workout.exercises.find((exercise) => exercise.exerciseId === base.id && historicalVariantId(exercise) === variantId
      && exercise.dumbbellCount === base.dumbbellCount && exercise.status === 'completed' && exercise.sets.length === base.defaultSets)
    return item ? [{ workout, exercise: item }] : []
  })
}

// A ceiling must be reached through an actual prescribed +1 step. Later successful
// ceiling sessions retain the unlock without requiring another +1 step.
export function hasEarnedCeiling(history: readonly WorkoutHistoryEntry[], base: Exercise, variantId: string, weight?: number): boolean {
  const sequence = performances(history, base, variantId, weight)
  const concrete = resolveExercise(base, variantId)
  const previous = new Map<number, ExercisePerformance>()
  for (const current of sequence) {
    const prior = previous.get(current.workout.dumbbellWeight) ?? null
    if (isSuccessfulCeiling(current, base, variantId) && earnedProgressionStep(prior, current, concrete)) return true
    previous.set(current.workout.dumbbellWeight, current)
  }
  return false
}

export function getUnlockedVariants(history: readonly WorkoutHistoryEntry[], base: Exercise): ExerciseVariant[] {
  const family = getExerciseFamily(base.id)
  if (!family || exerciseUnit(base) === 'sec') return [getExerciseVariant(base.id)!]
  const unlocked: ExerciseVariant[] = [getExerciseVariant(base.id)!]
  for (let level = 0; level < family.variantIds.length - 1; level++) {
    if (!hasEarnedCeiling(history, base, family.variantIds[level])) break
    unlocked.push(getExerciseVariant(base.id, family.variantIds[level + 1])!)
  }
  return unlocked
}

export function isVariationUpgradeReady(history: readonly WorkoutHistoryEntry[], base: Exercise, variantId: string, weight: number): boolean {
  const next = getNextVariant(base.id, variantId)
  if (!next || !getUnlockedVariants(history, base).some((variant) => variant.id === next.id)
    || !hasEarnedCeiling(history, base, variantId, weight)) return false
  const latest = performances(history, base, variantId, weight).at(-1)
  return Boolean(latest && isSuccessfulCeiling(latest, base, variantId))
}

export function canSelectVariant(history: readonly WorkoutHistoryEntry[], base: Exercise, variantId: string): boolean {
  return getUnlockedVariants(history, base).some((variant) => variant.id === variantId)
}

export interface DifficultyAdvanceEvent { exerciseId: string; fromVariantId: string; toVariantId: string; workoutId: string; completedAt: string; weight: number }
export interface VariantHistoryGroup { variantId: string; performances: ExercisePerformance[] }
export function groupExerciseHistoryByVariant(history: readonly WorkoutHistoryEntry[], base: Exercise): VariantHistoryGroup[] {
  const family = getExerciseFamily(base.id)
  return (family?.variantIds ?? [base.id]).flatMap((variantId) => {
    const found = performances(history, base, variantId).reverse()
    return found.length ? [{ variantId, performances: found }] : []
  })
}
export function getDifficultyAdvanceEvents(history: readonly WorkoutHistoryEntry[]): DifficultyAdvanceEvent[] {
  const ordered = history.filter((entry) => scheduledIds.has(entry.workoutId)).sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id))
  const events: DifficultyAdvanceEvent[] = []
  for (const workout of ordered) for (const item of workout.exercises) {
    const base = baseExercises.get(item.exerciseId)
    if (!base || item.status !== 'completed' || item.sets.length !== base.defaultSets || item.dumbbellCount !== base.dumbbellCount) continue
    const variantId = historicalVariantId(item)
    const variant = getExerciseVariant(base.id, variantId)
    if (!variant || variant.level === 0) continue
    const earlier = ordered.filter((entry) => Date.parse(entry.completedAt) < Date.parse(workout.completedAt)
      || entry.completedAt === workout.completedAt && entry.id.localeCompare(workout.id) < 0)
    if (performances(earlier, base, variantId, workout.dumbbellWeight).length > 0) continue
    const previous = getExerciseVariant(base.id, `${base.id}-level-${variant.level - 1}`) ?? getExerciseVariant(base.id)!
    if (!hasEarnedCeiling(earlier, base, previous.id, workout.dumbbellWeight)) continue
    const latestPrior = performances(earlier, base, previous.id, workout.dumbbellWeight).at(-1)
    if (!latestPrior || !isSuccessfulCeiling(latestPrior, base, previous.id)) continue
    events.push({ exerciseId: base.id, fromVariantId: previous.id, toVariantId: variantId, workoutId: workout.id, completedAt: workout.completedAt, weight: workout.dumbbellWeight })
  }
  return events
}
