import { exerciseUnit, initialExerciseTarget } from './activeWorkout'
import { sortHistory } from './workoutHistory'
import { historicalVariantId } from '../data/exerciseVariants'
import type { BenchmarkHistory } from '../types/profile'
import type { Exercise, HistoricalExercise, WorkoutHistoryEntry } from '../types/training'

export type TargetStatus = 'starting-benchmark' | 'starting-seed' | 'increase' | 'hold' | 'ceiling' | 'timed'
export interface ExercisePerformance { workout: WorkoutHistoryEntry; exercise: HistoricalExercise }
export interface NextExerciseTargets { targets: number[]; status: TargetStatus; previous: ExercisePerformance | null }

export function repCeiling(exercise: Exercise): number | null {
  if (exerciseUnit(exercise) === 'sec') return null
  const match = exercise.repRange.match(/\d+\s*[–-]\s*(\d+)/)
  return match ? Number(match[1]) : null
}

export function incrementBalancedTarget(targets: readonly number[], ceiling: number): number[] {
  const result = [...targets]
  const eligible = result.map((value, index) => ({ value, index })).filter((item) => item.value < ceiling)
  if (!eligible.length) return result
  const lowest = eligible.reduce((best, candidate) => candidate.value < best.value ? candidate : best)
  result[lowest.index] += 1
  return result
}

export function getLatestExercisePerformance(history: readonly WorkoutHistoryEntry[], exercise: Exercise, weight: number): ExercisePerformance | null {
  const variantId = exercise.variantId ?? exercise.id
  for (const workout of sortHistory(history)) {
    if (workout.dumbbellWeight !== weight) continue
    const item = workout.exercises.find((candidate) => candidate.exerciseId === exercise.id
      && historicalVariantId(candidate) === variantId
      && candidate.dumbbellCount === exercise.dumbbellCount && candidate.status === 'completed'
      && candidate.sets.length === exercise.defaultSets)
    if (item) return { workout, exercise: item }
  }
  return null
}

export function exerciseSucceeded(performance: ExercisePerformance, exercise: Exercise): boolean {
  const item = performance.exercise
  return item.status === 'completed' && item.sets.length === exercise.defaultSets
    && item.sets.every((set) => set.actualReps >= set.targetReps && set.rir >= 2)
}

export function evaluateExerciseProgression(performance: ExercisePerformance, exercise: Exercise): { targets: number[]; status: 'increase' | 'hold' | 'ceiling' | 'timed' } {
  const targets = performance.exercise.sets.map((set) => set.targetReps)
  if (exerciseUnit(exercise) === 'sec') return { targets, status: 'timed' }
  const ceiling = repCeiling(exercise)
  if (ceiling !== null && targets.every((value) => value >= ceiling) && exerciseSucceeded(performance, exercise)) return { targets, status: 'ceiling' }
  if (!exerciseSucceeded(performance, exercise)) return { targets, status: 'hold' }
  return { targets: incrementBalancedTarget(targets, ceiling ?? 999), status: 'increase' }
}

export function getNextExerciseTargets(exercise: Exercise, history: readonly WorkoutHistoryEntry[], benchmarks: BenchmarkHistory, weight: number): NextExerciseTargets {
  const previous = getLatestExercisePerformance(history, exercise, weight)
  if (previous) return { ...evaluateExerciseProgression(previous, exercise), previous }
  if (exercise.variantId && exercise.variantId !== exercise.id) {
    const lower = Number(exercise.repRange.match(/\d+/)?.[0] ?? 8)
    return { targets: Array(exercise.defaultSets).fill(lower), status: 'starting-seed', previous: null }
  }
  const initial = initialExerciseTarget(exercise, benchmarks, weight)
  const matchingBenchmark = benchmarks[exercise.id]?.some((item) => item.weight === weight)
  return { targets: Array(exercise.defaultSets).fill(initial), status: matchingBenchmark ? 'starting-benchmark' : 'starting-seed', previous: null }
}

export function earnedProgressionStep(previous: ExercisePerformance | null, current: ExercisePerformance, exercise: Exercise): boolean {
  if (!previous || exerciseUnit(exercise) !== 'reps'
    || previous.workout.dumbbellWeight !== current.workout.dumbbellWeight
    || previous.exercise.exerciseId !== exercise.id || current.exercise.exerciseId !== exercise.id
    || historicalVariantId(previous.exercise) !== (exercise.variantId ?? exercise.id)
    || historicalVariantId(current.exercise) !== (exercise.variantId ?? exercise.id)
    || previous.exercise.dumbbellCount !== exercise.dumbbellCount || current.exercise.dumbbellCount !== exercise.dumbbellCount
    || previous.exercise.sets.some((set) => set.targetWasEdited) || current.exercise.sets.some((set) => set.targetWasEdited)
    || !exerciseSucceeded(previous, exercise) || !exerciseSucceeded(current, exercise)) return false
  const prior = previous.exercise.sets.map((set) => set.targetReps)
  const actual = current.exercise.sets.map((set) => set.targetReps)
  const ceiling = repCeiling(exercise)
  if (ceiling === null || prior.length !== actual.length || actual.reduce((sum, value) => sum + value, 0) !== prior.reduce((sum, value) => sum + value, 0) + 1) return false
  const expected = incrementBalancedTarget(prior, ceiling)
  return expected.every((value, index) => value === actual[index])
}

export const targetReason: Record<TargetStatus, { label: string; description: string }> = {
  'starting-benchmark': { label: 'STARTING TARGET', description: 'Based on your matching-weight benchmark.' },
  'starting-seed': { label: 'STARTING TARGET', description: 'No previous completed performance at this weight.' },
  increase: { label: '+1 REP', description: 'Last session met every target with 2+ reps in reserve.' },
  hold: { label: 'REPEAT TARGET', description: 'Last session was challenging, so the target stays the same.' },
  ceiling: { label: 'REP RANGE COMPLETE', description: 'You reached the current target ceiling with this weight.' },
  timed: { label: 'TIME TARGET', description: 'Timed targets stay the same automatically.' },
}
