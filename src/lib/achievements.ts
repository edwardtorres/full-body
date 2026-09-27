import { analyticsExercises, earnedProgressionStep } from './muscleAnalytics'
import { historicalVariantId, resolveExercise } from '../data/exerciseVariants'
import { getDifficultyAdvanceEvents, type DifficultyAdvanceEvent } from './variants'
import { exerciseUnit } from './activeWorkout'
import { exerciseSucceeded, repCeiling, type ExercisePerformance } from './progression'
import { getBestPerfectWeekStreak, getCurrentPerfectWeekStreak, getPerfectWeeks, getWeeklyCompletion, localDateKey, requiredWorkoutIds } from './consistency'
import type { BenchmarkHistory, BenchmarkResult } from '../types/profile'
import type { Exercise, WorkoutHistoryEntry } from '../types/training'

export interface ProgressionEvent {
  workoutId: string
  completedAt: string
  exercise: Exercise
  targets: number[]
  weight: number
  reachedCeiling: boolean
}

export function getEarnedProgressionEvents(history: readonly WorkoutHistoryEntry[]): ProgressionEvent[] {
  const exercises = new Map(analyticsExercises.filter((item) => exerciseUnit(item) === 'reps').map((item) => [item.id, item]))
  const previous = new Map<string, ExercisePerformance>()
  const events: ProgressionEvent[] = []
  const ordered = history.filter((entry) => requiredWorkoutIds.some((id) => id === entry.workoutId) && Number.isFinite(Date.parse(entry.completedAt)))
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id))
  for (const workout of ordered) {
    for (const item of workout.exercises) {
      const exercise = exercises.get(item.exerciseId)
      if (!exercise || item.dumbbellCount !== exercise.dumbbellCount || item.status !== 'completed' || item.sets.length !== exercise.defaultSets) continue
      const concrete = resolveExercise(exercise, historicalVariantId(item))
      const key = `${exercise.id}:${historicalVariantId(item)}:${workout.dumbbellWeight}:${item.dumbbellCount}`
      const current = { workout, exercise: item }
      if (earnedProgressionStep(previous.get(key) ?? null, current, concrete)) {
        const targets = item.sets.map((set) => set.targetReps)
        const ceiling = repCeiling(concrete)
        events.push({ workoutId: workout.id, completedAt: workout.completedAt, exercise: concrete, targets, weight: workout.dumbbellWeight,
          reachedCeiling: ceiling !== null && targets.every((target) => target === ceiling) && exerciseSucceeded(current, concrete) })
      }
      previous.set(key, current)
    }
  }
  return events
}

export function getEarnedProgressionCount(history: readonly WorkoutHistoryEntry[]): number {
  return getEarnedProgressionEvents(history).length
}

export const achievementDefinitions = [
  { id: 'first-session', title: 'First Session', description: 'Complete your first scheduled workout.' },
  { id: 'first-perfect-week', title: 'First Perfect Week', description: 'Complete A, B, and C in one week.' },
  { id: 'three-week-streak', title: '3-Week Streak', description: 'Complete three consecutive perfect weeks.' },
  { id: 'five-week-streak', title: '5-Week Streak', description: 'Complete five consecutive perfect weeks.' },
  { id: 'ten-week-streak', title: '10-Week Streak', description: 'Complete ten consecutive perfect weeks.' },
  { id: 'first-progression', title: 'First Progression', description: 'Earn your first automatic rep step.' },
  { id: 'ten-progression-steps', title: '10 Progression Steps', description: 'Earn ten automatic rep steps.' },
  { id: 'first-rep-ceiling', title: 'First Rep Range Complete', description: 'Reach a rep ceiling through successful progression.' },
  { id: 'all-three-workouts', title: 'All Three Workouts', description: 'Complete A, B, and C at least once.' },
  { id: 'first-benchmark-retest', title: 'First Benchmark Retest', description: 'Save a second benchmark result.' },
] as const
export type AchievementId = typeof achievementDefinitions[number]['id']
export interface AchievementState { id: AchievementId; title: string; description: string; unlocked: boolean; unlockedAt: string | null; progress?: string }

export function getAchievementStates(history: readonly WorkoutHistoryEntry[], benchmarks: BenchmarkHistory): AchievementState[] {
  const ordered = history.filter((entry) => requiredWorkoutIds.some((id) => id === entry.workoutId) && Number.isFinite(Date.parse(entry.completedAt)))
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt))
  const perfectWeeks = getPerfectWeeks(history)
  const steps = getEarnedProgressionEvents(history)
  const dates = new Map<AchievementId, string>()
  if (ordered[0]) dates.set('first-session', ordered[0].completedAt)
  if (perfectWeeks[0]?.perfectAt) dates.set('first-perfect-week', perfectWeeks[0].perfectAt)
  let run = 0
  perfectWeeks.forEach((week, index) => {
    const prior = perfectWeeks[index - 1]
    const expected = prior && new Date(prior.weekStart.getFullYear(), prior.weekStart.getMonth(), prior.weekStart.getDate() + 7)
    run = expected && localDateKey(expected) === localDateKey(week.weekStart) ? run + 1 : 1
    for (const [threshold, id] of [[3, 'three-week-streak'], [5, 'five-week-streak'], [10, 'ten-week-streak']] as const) {
      if (run === threshold && week.perfectAt && !dates.has(id)) dates.set(id, week.perfectAt)
    }
  })
  if (steps[0]) dates.set('first-progression', steps[0].completedAt)
  if (steps[9]) dates.set('ten-progression-steps', steps[9].completedAt)
  const ceiling = steps.find((step) => step.reachedCeiling)
  if (ceiling) dates.set('first-rep-ceiling', ceiling.completedAt)
  const seen = new Set<string>()
  for (const entry of ordered) {
    if (requiredWorkoutIds.some((id) => id === entry.workoutId)) seen.add(entry.workoutId)
    if (seen.size === 3) { dates.set('all-three-workouts', entry.completedAt); break }
  }
  const retestDates = Object.values(benchmarks).flatMap((results) => [...results].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt)).slice(1).map((result) => result.completedAt)).sort()
  if (retestDates[0]) dates.set('first-benchmark-retest', retestDates[0])
  const progress = new Map<AchievementId, string>([
    ['three-week-streak', `${Math.min(getBestPerfectWeekStreak(history), 3)} / 3 weeks`],
    ['five-week-streak', `${Math.min(getBestPerfectWeekStreak(history), 5)} / 5 weeks`],
    ['ten-week-streak', `${Math.min(getBestPerfectWeekStreak(history), 10)} / 10 weeks`],
    ['ten-progression-steps', `${Math.min(steps.length, 10)} / 10 steps`],
  ])
  return achievementDefinitions.map((definition) => ({ ...definition, unlocked: dates.has(definition.id), unlockedAt: dates.get(definition.id) ?? null, progress: dates.has(definition.id) ? undefined : progress.get(definition.id) }))
}

export interface WorkoutCelebrations { progressions: ProgressionEvent[]; ceilings: ProgressionEvent[]; advances: DifficultyAdvanceEvent[]; perfectWeek: boolean; weekStreak: number }
export function getWorkoutCelebrations(saved: WorkoutHistoryEntry, priorHistory: readonly WorkoutHistoryEntry[]): WorkoutCelebrations {
  const all = [...priorHistory, saved]
  const progressions = getEarnedProgressionEvents(all).filter((event) => event.workoutId === saved.id)
  const before = getWeeklyCompletion(priorHistory, new Date(saved.completedAt))
  const after = getWeeklyCompletion(all, new Date(saved.completedAt))
  const perfectWeek = !before.isPerfectWeek && after.isPerfectWeek
  return { progressions, ceilings: progressions.filter((event) => event.reachedCeiling), advances: getDifficultyAdvanceEvents(all).filter((event) => event.workoutId === saved.id), perfectWeek,
    weekStreak: perfectWeek ? getCurrentPerfectWeekStreak(all, new Date(saved.completedAt)) : 0 }
}

export interface BenchmarkComparison { status: 'improved' | 'matched' | 'saved'; original: BenchmarkResult | null; current: BenchmarkResult; delta: number | null }
export function compareBenchmark(original: BenchmarkResult | null, current: BenchmarkResult): BenchmarkComparison {
  const delta = original?.weight === current.weight ? current.reps - original.reps : null
  return { status: delta === null || delta < 0 ? 'saved' : delta === 0 ? 'matched' : 'improved', original, current, delta }
}
