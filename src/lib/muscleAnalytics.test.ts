import { describe, expect, it } from 'vitest'
import { workouts } from '../data/workouts'
import type { HistoricalExercise, WorkoutHistoryEntry } from '../types/training'
import { earnedProgressionStep, getExerciseAnalytics, getMuscleAnalytics, inAnalyticsWindow } from './muscleAnalytics'
import type { ExercisePerformance } from './progression'

const workout = workouts[0]
const floorPress = workout.exercises.find((item) => item.id === 'floor-press')!
const overheadPress = workout.exercises.find((item) => item.id === 'overhead-press')!
const calfRaise = workout.exercises.find((item) => item.id === 'calf-raise-a')!
const suitcaseMarch = workout.exercises.find((item) => item.id === 'suitcase-march-a')!
const now = new Date('2026-09-24T23:00:00.000Z')
type Result = { targets?: number[]; actual?: number[]; rir?: number[]; skip?: boolean; count?: 1 | 2 }

function entry(day: string, values: Record<string, Result>, weight = 20): WorkoutHistoryEntry {
  const completedAt = `${day}T12:00:00.000Z`
  return {
    id: `${day}-${weight}`, workoutId: workout.id, dumbbellWeight: weight, scheduledDay: 'monday',
    startedAt: `${day}T11:00:00.000Z`, completedAt, durationSeconds: 3600,
    exercises: workout.exercises.map((exercise): HistoricalExercise => {
      const result = values[exercise.id]
      if (!result || result.skip) return { exerciseId: exercise.id, dumbbellCount: result?.count ?? exercise.dumbbellCount, status: 'skipped', sets: [] }
      return { exerciseId: exercise.id, dumbbellCount: result.count ?? exercise.dumbbellCount, status: 'completed',
        sets: (result.targets ?? []).map((targetReps, index) => ({ setNumber: index + 1, targetReps, actualReps: result.actual?.[index] ?? targetReps, rir: result.rir?.[index] ?? 2, completedAt })) }
    }),
  }
}

function performance(date: string, targets: number[], rir = 2): ExercisePerformance {
  const workoutEntry = entry(date, { 'floor-press': { targets, rir: targets.map(() => rir) } })
  return { workout: workoutEntry, exercise: workoutEntry.exercises.find((item) => item.exerciseId === floorPress.id)! }
}

describe('earned progression steps', () => {
  it('counts only successful, prescribed +1 transitions', () => {
    const a = performance('2026-09-01', [12, 12, 12])
    const b = performance('2026-09-08', [13, 12, 12])
    const c = performance('2026-09-15', [13, 13, 12])
    expect(earnedProgressionStep(a, b, floorPress)).toBe(true)
    expect(earnedProgressionStep(b, c, floorPress)).toBe(true)
    const history = [a.workout, b.workout, c.workout]
    expect(getExerciseAnalytics(floorPress, history, 20, 'all', now).progressionSteps).toBe(2)
  })

  it('does not count a manual target jump or a failed new target', () => {
    const a = entry('2026-09-01', { 'calf-raise-a': { targets: [12, 12, 12] } })
    const b = entry('2026-09-08', { 'calf-raise-a': { targets: [16, 12, 12] } })
    const c = entry('2026-09-15', { 'calf-raise-a': { targets: [16, 13, 12], rir: [2, 1, 2] } })
    const d = entry('2026-09-22', { 'calf-raise-a': { targets: [16, 13, 12] } })
    expect(getExerciseAnalytics(calfRaise, [a, b, c, d], 20, 'all', now).progressionSteps).toBe(0)
  })

  it('rejects cross-weight and mismatched dumbbell-count steps directly', () => {
    const previous = performance('2026-09-01', [12, 12, 12])
    const current = performance('2026-09-08', [13, 12, 12])
    expect(earnedProgressionStep(previous, { ...current, workout: { ...current.workout, dumbbellWeight: 25 } }, floorPress)).toBe(false)
    expect(earnedProgressionStep(previous, { ...current, exercise: { ...current.exercise, dumbbellCount: 2 } }, floorPress)).toBe(false)
  })

  it('ignores skips, but retains the prior completed performance as the step basis', () => {
    const history = [
      entry('2026-09-01', { 'floor-press': { targets: [12, 12, 12] } }),
      entry('2026-09-05', { 'floor-press': { skip: true } }),
      entry('2026-09-08', { 'floor-press': { targets: [13, 12, 12] } }),
    ]
    const result = getExerciseAnalytics(floorPress, history, 20, 'all', now)
    expect(result).toMatchObject({ progressionSteps: 1, completedPerformances: 2, skippedOccurrences: 1, consecutiveHolds: 0 })
  })
})

describe('exercise trends', () => {
  it('keeps one performance in BUILDING DATA', () => {
    const result = getExerciseAnalytics(floorPress, [entry('2026-09-01', { 'floor-press': { targets: [12, 12, 12] } })], 20, 'all', now)
    expect(result).toMatchObject({ confidence: 'low-data', status: 'building-data', completedPerformances: 1 })
  })

  it('classifies PROGRESSING from a step in the latest two completions', () => {
    const history = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((day, index) =>
      entry(day, { 'floor-press': { targets: [[12, 12, 12], [13, 12, 12], [13, 13, 12], [13, 13, 13]][index] } }))
    expect(getExerciseAnalytics(floorPress, history, 20, 'all', now)).toMatchObject({ status: 'progressing', progressionSteps: 3, confidence: 'enough-data', currentTarget: [14, 13, 13] })
  })

  it('classifies STEADY when a step is older than the latest two completions', () => {
    const targets = [[10, 10, 10], [11, 10, 10], [11, 10, 10], [11, 10, 10]]
    const history = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((day, index) =>
      entry(day, { 'floor-press': { targets: targets[index], rir: index > 1 ? [1, 2, 2] : undefined } }))
    expect(getExerciseAnalytics(floorPress, history, 20, 'all', now)).toMatchObject({ status: 'steady', progressionSteps: 1, consecutiveHolds: 2 })
  })

  it('classifies STALLED after three completed holds, without using skips as holds', () => {
    const history = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((day) =>
      entry(day, { 'overhead-press': { targets: [10, 10, 10], rir: [1, 2, 2] } }))
    history.splice(2, 0, entry('2026-09-10', { 'overhead-press': { skip: true } }))
    expect(getExerciseAnalytics(overheadPress, history, 20, 'all', now)).toMatchObject({ status: 'stalled', progressionSteps: 0, consecutiveHolds: 4, skippedOccurrences: 1 })
  })

  it('treats the rep ceiling as complete, not stalled', () => {
    const history = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((day) =>
      entry(day, { 'calf-raise-a': { targets: [20, 20, 20] } }))
    expect(getExerciseAnalytics(calfRaise, history, 20, 'all', now)).toMatchObject({ status: 'ceiling', atCeiling: true, consecutiveHolds: 0 })
  })

  it('excludes timed work from rep steps and target totals', () => {
    const history = ['2026-09-01', '2026-09-08', '2026-09-15'].map((day) => entry(day, { 'suitcase-march-a': { targets: [30, 30, 30] } }))
    expect(getExerciseAnalytics(suitcaseMarch, history, 20, 'all', now)).toMatchObject({ status: 'time-target', progressionSteps: 0, targetTotals: [] })
    expect(getMuscleAnalytics(history, 20, 'all', now).find((item) => item.muscle === 'abs')?.completedPerformances).toBe(0)
  })

  it('uses only matching weight and dumbbell count', () => {
    const history = [entry('2026-09-01', { 'floor-press': { targets: [12, 12, 12] } }),
      entry('2026-09-08', { 'floor-press': { targets: [13, 12, 12] } }, 25),
      entry('2026-09-15', { 'floor-press': { targets: [13, 12, 12], count: 2 } })]
    expect(getExerciseAnalytics(floorPress, history, 20, 'all', now)).toMatchObject({ completedPerformances: 1, progressionSteps: 0 })
    expect(getExerciseAnalytics(floorPress, history, 25, 'all', now)).toMatchObject({ completedPerformances: 1, progressionSteps: 0 })
  })

  it('filters last six weeks and retains all-time history separately', () => {
    const old = entry('2026-07-01', { 'floor-press': { targets: [10, 10, 10] } })
    const recent = entry('2026-09-15', { 'floor-press': { targets: [11, 10, 10] } })
    expect(inAnalyticsWindow(old.completedAt, 'recent', now)).toBe(false)
    expect(inAnalyticsWindow(recent.completedAt, 'recent', now)).toBe(true)
    expect(getExerciseAnalytics(floorPress, [old, recent], 20, 'recent', now).completedPerformances).toBe(1)
    expect(getExerciseAnalytics(floorPress, [old, recent], 20, 'all', now).completedPerformances).toBe(2)
  })
})

describe('muscle classification', () => {
  const dates = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22']
  const chestTargets = [[12, 12, 12], [13, 12, 12], [13, 13, 12], [13, 13, 13]]
  const growingChest = dates.map((day, index) => entry(day, { 'floor-press': { targets: chestTargets[index] } }))

  it('uses primary muscles only and requires comparable sufficient data', () => {
    const early = getMuscleAnalytics(growingChest.slice(0, 1), 20, 'all', now)
    expect(early.find((item) => item.muscle === 'chest')?.classification).toBe('building-data')
    expect(early.find((item) => item.muscle === 'shoulders')?.completedPerformances).toBe(0)
    expect(getMuscleAnalytics(growingChest, 20, 'all', now).filter((item) => item.classification === 'strong')).toEqual([])
  })

  it('finds a progressing chest and slower shoulders with evidence', () => {
    const history = dates.map((day, index) => entry(day, {
      'floor-press': { targets: chestTargets[index] },
      'overhead-press': { targets: [10, 10, 10], rir: [1, 2, 2] },
    }))
    const muscles = getMuscleAnalytics(history, 20, 'all', now)
    expect(muscles.find((item) => item.muscle === 'chest')).toMatchObject({ classification: 'strong', progressionSteps: 3, progressingExercises: 1 })
    expect(muscles.find((item) => item.muscle === 'shoulders')).toMatchObject({ classification: 'weak', stalledExercises: 1, progressionSteps: 0 })
  })

  it('allows multiple strong points and zero weak points', () => {
    const history = dates.map((day, index) => entry(day, {
      'floor-press': { targets: chestTargets[index] },
      'overhead-press': { targets: [[8, 8, 8], [9, 8, 8], [9, 9, 8], [9, 9, 9]][index] },
    }))
    const muscles = getMuscleAnalytics(history, 20, 'all', now)
    const strong = muscles.filter((item) => item.classification === 'strong').map((item) => item.muscle)
    expect(strong).toContain('chest')
    expect(strong).toContain('shoulders')
    expect(muscles.filter((item) => item.classification === 'weak')).toEqual([])
  })

  it('does not manufacture strong or weak points from only holds', () => {
    const history = dates.map((day) => entry(day, {
      'floor-press': { targets: [10, 10, 10], rir: [1, 2, 2] },
      'overhead-press': { targets: [10, 10, 10], rir: [1, 2, 2] },
    }))
    const muscles = getMuscleAnalytics(history, 20, 'all', now)
    expect(muscles.filter((item) => item.classification === 'strong')).toEqual([])
    expect(muscles.filter((item) => item.classification === 'weak')).toEqual([])
  })

  it('does not call skips or rep ceilings weak points', () => {
    const history = dates.map((day, index) => entry(day, {
      'floor-press': { targets: chestTargets[index] },
      'overhead-press': index === 0 ? { targets: [10, 10, 10], rir: [1, 2, 2] } : { skip: true },
      'calf-raise-a': { targets: [20, 20, 20] },
    }))
    const muscles = getMuscleAnalytics(history, 20, 'all', now)
    expect(muscles.find((item) => item.muscle === 'shoulders')?.classification).toBe('building-data')
    expect(muscles.find((item) => item.muscle === 'calves')?.classification).not.toBe('weak')
  })

  it('drops old-weight classifications after a weight change', () => {
    const history = dates.map((day, index) => entry(day, {
      'floor-press': { targets: chestTargets[index] },
      'overhead-press': { targets: [10, 10, 10], rir: [1, 2, 2] },
    }))
    expect(getMuscleAnalytics(history, 20, 'all', now).some((item) => item.classification === 'strong')).toBe(true)
    expect(getMuscleAnalytics(history, 25, 'all', now).some((item) => item.classification === 'strong' || item.classification === 'weak')).toBe(false)
  })
})
