import { workouts } from '../data/workouts'
import { muscleGroups, type Exercise, type MuscleGroup, type WorkoutHistoryEntry } from '../types/training'
import { exerciseUnit } from './activeWorkout'
import { earnedProgressionStep, evaluateExerciseProgression } from './progression'
export { earnedProgressionStep } from './progression'
import { sortHistory } from './workoutHistory'
import { historicalVariantId, resolveExercise } from '../data/exerciseVariants'
import { getDifficultyAdvanceEvents, type VariantSelections } from './variants'

export type AnalyticsPeriod = 'recent' | 'all'
export type DataConfidence = 'low-data' | 'building-data' | 'enough-data'
export type ExerciseTrend = 'building-data' | 'progressing' | 'steady' | 'stalled' | 'ceiling' | 'time-target' | 'advanced-variation'

export interface ExerciseAnalytics {
  exercise: Exercise
  weight: number
  period: AnalyticsPeriod
  completedPerformances: number
  skippedOccurrences: number
  firstTarget: number[] | null
  latestTarget: number[] | null
  currentTarget: number[] | null
  progressionSteps: number
  difficultyAdvances: number
  successfulProgressionEvents: number
  heldTargetSessions: number
  consecutiveHolds: number
  lastProgressionAt: string | null
  lastDifficultyAdvanceAt: string | null
  mostRecentAt: string | null
  atCeiling: boolean
  confidence: DataConfidence
  status: ExerciseTrend
  targetTotals: { completedAt: string; total: number }[]
}

export interface MuscleAnalytics {
  muscle: MuscleGroup
  exercises: ExerciseAnalytics[]
  completedPerformances: number
  skippedOccurrences: number
  progressionSteps: number
  difficultyAdvances: number
  progressingExercises: number
  stalledExercises: number
  ceilingExercises: number
  eligibleExercises: number
  lastProgressionAt: string | null
  confidence: DataConfidence
  classification: 'strong' | 'weak' | 'building-data' | 'unclassified'
  rankingValue: number
}

export const analyticsExercises = workouts.flatMap((workout) => workout.exercises)
  .filter((exercise, index, all) => all.findIndex((candidate) => candidate.id === exercise.id) === index)

export function dataConfidence(count: number): DataConfidence {
  if (count < 2) return 'low-data'
  if (count < 4) return 'building-data'
  return 'enough-data'
}

export function inAnalyticsWindow(iso: string, period: AnalyticsPeriod, now: Date): boolean {
  const time = Date.parse(iso)
  return Number.isFinite(time) && time <= now.getTime() && (period === 'all' || time >= now.getTime() - 42 * 24 * 60 * 60 * 1000)
}

export function getExerciseAnalytics(exercise: Exercise, history: readonly WorkoutHistoryEntry[], weight: number, period: AnalyticsPeriod, now: Date, variantId = exercise.id): ExerciseAnalytics {
  const concrete = resolveExercise(exercise, variantId)
  const occurrences = sortHistory(history).reverse().flatMap((workout) => {
    if (workout.dumbbellWeight !== weight || Date.parse(workout.completedAt) > now.getTime()) return []
    const item = workout.exercises.find((candidate) => candidate.exerciseId === exercise.id && historicalVariantId(candidate) === concrete.variantId && candidate.dumbbellCount === exercise.dumbbellCount)
    return item ? [{ workout, exercise: item }] : []
  })
  const skippedOccurrences = occurrences.filter((item) => item.exercise.status === 'skipped' && inAnalyticsWindow(item.workout.completedAt, period, now)).length
  const complete = occurrences.filter((item) => item.exercise.status === 'completed' && item.exercise.sets.length === exercise.defaultSets)
  const timed = exerciseUnit(concrete) === 'sec'
  const performances = complete.filter((item) => inAnalyticsWindow(item.workout.completedAt, period, now))
  const steps = new Set<string>()
  if (!timed) complete.forEach((item, index) => {
    if (index > 0 && inAnalyticsWindow(item.workout.completedAt, period, now) && earnedProgressionStep(complete[index - 1], item, concrete)) steps.add(item.workout.id)
  })
  const latest = performances.at(-1) ?? null
  const first = performances[0] ?? null
  const latestResult = latest ? evaluateExerciseProgression(latest, concrete) : null
  const heldTargetSessions = timed ? 0 : performances.filter((item) => evaluateExerciseProgression(item, concrete).status === 'hold').length
  let consecutiveHolds = 0
  if (!timed) for (let index = performances.length - 1; index >= 0; index--) {
    if (evaluateExerciseProgression(performances[index], concrete).status !== 'hold') break
    consecutiveHolds++
  }
  const lastStep = [...performances].reverse().find((item) => steps.has(item.workout.id))
  const lastTwo = performances.slice(-2)
  const lastThree = performances.slice(-3)
  const difficultyEvents = getDifficultyAdvanceEvents(history).filter((event) => event.exerciseId === exercise.id && event.toVariantId === concrete.variantId
    && event.weight === weight && inAnalyticsWindow(event.completedAt, period, now))
  const difficultyAdvances = difficultyEvents.length
  const familyCount = sortHistory(history).flatMap((workout) => workout.dumbbellWeight === weight && inAnalyticsWindow(workout.completedAt, period, now)
    ? workout.exercises.filter((item) => item.exerciseId === exercise.id && item.status === 'completed' && item.dumbbellCount === exercise.dumbbellCount) : []).length
  const confidence = dataConfidence(Math.max(performances.length, difficultyAdvances ? familyCount : 0))
  const status: ExerciseTrend = timed ? 'time-target' : difficultyAdvances > 0 && performances.length < 3 ? 'advanced-variation'
    : latestResult?.status === 'ceiling' ? 'ceiling'
      : performances.length < 3 ? 'building-data'
      : lastTwo.some((item) => steps.has(item.workout.id)) ? 'progressing'
        : lastThree.length === 3 && lastThree.every((item) => !steps.has(item.workout.id)) ? 'stalled' : 'steady'
  return {
    exercise: concrete, weight, period,
    completedPerformances: performances.length,
    skippedOccurrences,
    firstTarget: first?.exercise.sets.map((set) => set.targetReps) ?? null,
    latestTarget: latest?.exercise.sets.map((set) => set.targetReps) ?? null,
    currentTarget: latestResult?.targets ?? null,
    progressionSteps: steps.size, difficultyAdvances,
    successfulProgressionEvents: steps.size,
    heldTargetSessions, consecutiveHolds,
    lastProgressionAt: lastStep?.workout.completedAt ?? null,
    lastDifficultyAdvanceAt: difficultyEvents.at(-1)?.completedAt ?? null,
    mostRecentAt: latest?.workout.completedAt ?? null,
    atCeiling: latestResult?.status === 'ceiling',
    confidence, status,
    targetTotals: timed ? [] : performances.map((item) => ({ completedAt: item.workout.completedAt, total: item.exercise.sets.reduce((sum, set) => sum + set.targetReps, 0) })),
  }
}

export function getMuscleAnalytics(history: readonly WorkoutHistoryEntry[], weight: number, period: AnalyticsPeriod, now: Date, selections: VariantSelections = {}): MuscleAnalytics[] {
  const exerciseAnalytics = analyticsExercises.filter((exercise) => exerciseUnit(exercise) === 'reps')
    .map((exercise) => getExerciseAnalytics(exercise, history, weight, period, now, selections[exercise.id] ?? exercise.id))
  const muscles = muscleGroups.map((muscle): MuscleAnalytics => {
    const exercises = exerciseAnalytics.filter((item) => item.exercise.primaryMuscles.includes(muscle))
    const eligible = exercises.filter((item) => item.completedPerformances >= 3 || item.status === 'advanced-variation')
    const completedPerformances = exercises.reduce((sum, item) => sum + item.completedPerformances, 0)
    const progressionSteps = exercises.reduce((sum, item) => sum + item.progressionSteps, 0)
    const difficultyAdvances = exercises.reduce((sum, item) => sum + item.difficultyAdvances, 0)
    const progressingExercises = eligible.filter((item) => item.status === 'progressing' || item.status === 'advanced-variation').length
    const stalledExercises = eligible.filter((item) => item.status === 'stalled').length
    const ceilingExercises = eligible.filter((item) => item.status === 'ceiling').length
    const positiveExercises = eligible.filter((item) => item.status === 'progressing' || item.status === 'advanced-variation' || (item.status === 'ceiling' && item.progressionSteps >= 2)).length
    const eligibleCompletions = eligible.reduce((sum, item) => sum + item.completedPerformances, 0)
    const eligibleSteps = eligible.reduce((sum, item) => sum + item.progressionSteps, 0)
    const rankingValue = eligible.length && eligibleCompletions ? (eligibleSteps + difficultyAdvances * 2) / eligibleCompletions + .25 * positiveExercises / eligible.length : 0
    const dates = exercises.flatMap((item) => [item.lastProgressionAt, item.lastDifficultyAdvanceAt]).filter((item): item is string => Boolean(item))
    return {
      muscle, exercises, completedPerformances,
      skippedOccurrences: exercises.reduce((sum, item) => sum + item.skippedOccurrences, 0),
      progressionSteps, difficultyAdvances, progressingExercises, stalledExercises, ceilingExercises,
      eligibleExercises: eligible.length,
      lastProgressionAt: dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null,
      confidence: difficultyAdvances && exercises.some((item) => item.confidence === 'enough-data') ? 'enough-data' : dataConfidence(completedPerformances),
      classification: 'unclassified', rankingValue,
    }
  })
  const comparable = muscles.filter((item) => item.confidence === 'enough-data' && item.eligibleExercises > 0)
  const evidenceSignatures = new Set(comparable.map((item) => item.exercises
    .filter((exercise) => exercise.completedPerformances >= 3).map((exercise) => exercise.exercise.id).sort().join(',')))
  const top = Math.max(0, ...comparable.map((item) => item.rankingValue))
  return muscles.map((item) => {
    if (item.confidence !== 'enough-data' || item.eligibleExercises === 0 || evidenceSignatures.size < 2) return { ...item, classification: 'building-data' }
    const eligible = item.exercises.filter((exercise) => exercise.completedPerformances >= 3 || exercise.status === 'advanced-variation')
    const positive = eligible.filter((exercise) => exercise.status === 'progressing' || exercise.status === 'advanced-variation' || (exercise.status === 'ceiling' && exercise.progressionSteps >= 2)).length
    const isStrong = item.progressionSteps + item.difficultyAdvances * 2 >= 2 && positive / eligible.length >= .5 && item.rankingValue >= top * .8
    const isWeak = top >= .4 && item.stalledExercises > 0 && item.progressingExercises === 0
      && item.ceilingExercises === 0 && item.rankingValue <= top * .45
    return { ...item, classification: isStrong ? 'strong' : isWeak ? 'weak' : 'unclassified' }
  })
}

export const exerciseTrendLabel: Record<ExerciseTrend, string> = {
  'building-data': 'BUILDING DATA', progressing: 'PROGRESSING', steady: 'STEADY', stalled: 'STALLED', ceiling: 'REP RANGE COMPLETE', 'time-target': 'TIME TARGET', 'advanced-variation': 'ADVANCED VARIATION',
}
