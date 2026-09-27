import { describe, expect, it } from 'vitest'
import { workouts } from '../data/workouts'
import type { BenchmarkHistory } from '../types/profile'
import type { HistoricalExercise, WorkoutHistoryEntry } from '../types/training'
import { evaluateExerciseProgression, exerciseSucceeded, getLatestExercisePerformance, getNextExerciseTargets, incrementBalancedTarget } from './progression'

const workout = workouts[0]
const press = workout.exercises[1]
const march = workout.exercises[6]
const time = '2026-09-21T12:00:00.000Z'

function entry(id: string, targets: number[], actual: number[], rir: number[], options: { weight?: number; completedAt?: string; skipped?: boolean; exerciseId?: string } = {}): WorkoutHistoryEntry {
  const exerciseId = options.exerciseId ?? press.id
  return {
    id, workoutId: workout.id, dumbbellWeight: options.weight ?? 20, scheduledDay: 'monday',
    startedAt: time, completedAt: options.completedAt ?? '2026-09-21T13:00:00.000Z', durationSeconds: 3600,
    exercises: workout.exercises.map((exercise): HistoricalExercise => exercise.id === exerciseId
      ? { exerciseId: exercise.id, status: options.skipped ? 'skipped' : 'completed', dumbbellCount: exercise.dumbbellCount,
        sets: options.skipped ? [] : targets.map((targetReps, index) => ({ setNumber: index + 1, targetReps, actualReps: actual[index], rir: rir[index], completedAt: time })) }
      : { exerciseId: exercise.id, status: 'skipped', dumbbellCount: exercise.dumbbellCount, sets: [] }),
  }
}

describe('conservative rep progression', () => {
  it('adds one total rep to the earliest lowest set', () => {
    expect(incrementBalancedTarget([12, 12, 12], 20)).toEqual([13, 12, 12])
    expect(incrementBalancedTarget([13, 12, 12], 20)).toEqual([13, 13, 12])
    expect(incrementBalancedTarget([13, 13, 12], 20)).toEqual([13, 13, 13])
    expect(incrementBalancedTarget([12, 12, 11], 20)).toEqual([12, 12, 12])
    expect(incrementBalancedTarget([15, 14, 14], 20)).toEqual([15, 15, 14])
  })

  it('progresses from targets rather than unusually high actual reps', () => {
    const performance = getLatestExercisePerformance([entry('one', [12, 12, 12], [15, 15, 15], [2, 2, 2])], press, 20)!
    expect(exerciseSucceeded(performance, press)).toBe(true)
    expect(evaluateExerciseProgression(performance, press)).toEqual({ targets: [13, 12, 12], status: 'increase' })
  })

  it('holds for low RIR or a missed target, then increases after success', () => {
    const first = entry('first', [10, 10, 10], [10, 10, 10], [2, 2, 3], { completedAt: '2026-09-01T13:00:00.000Z' })
    expect(getNextExerciseTargets(press, [first], {}, 20)).toMatchObject({ targets: [11, 10, 10], status: 'increase' })
    const lowRir = entry('low-rir', [11, 10, 10], [11, 10, 10], [2, 1, 2], { completedAt: '2026-09-08T13:00:00.000Z' })
    expect(getNextExerciseTargets(press, [first, lowRir], {}, 20)).toMatchObject({ targets: [11, 10, 10], status: 'hold' })
    const miss = entry('miss', [11, 10, 10], [10, 10, 10], [2, 3, 2], { completedAt: '2026-09-15T13:00:00.000Z' })
    expect(getNextExerciseTargets(press, [first, miss], {}, 20)).toMatchObject({ targets: [11, 10, 10], status: 'hold' })
    const success = entry('success', [11, 10, 10], [11, 10, 10], [2, 3, 2], { completedAt: '2026-09-22T13:00:00.000Z' })
    expect(getNextExerciseTargets(press, [first, lowRir, success], {}, 20)).toMatchObject({ targets: [11, 11, 10], status: 'increase' })
  })

  it('uses the most recent completed performance and ignores later skips', () => {
    const complete = entry('complete', [10, 10, 10], [10, 10, 10], [2, 2, 2], { completedAt: '2026-09-01T13:00:00.000Z' })
    const skipped = entry('skipped', [], [], [], { skipped: true, completedAt: '2026-09-08T13:00:00.000Z' })
    expect(getLatestExercisePerformance([complete, skipped], press, 20)?.workout.id).toBe('complete')
    expect(getNextExerciseTargets(press, [complete, skipped], {}, 20)).toMatchObject({ targets: [11, 10, 10], status: 'increase' })
  })

  it('stops automatic progression at the rep ceiling', () => {
    const maximum = entry('max', [15, 15, 15], [15, 15, 15], [2, 2, 2])
    expect(getNextExerciseTargets(press, [maximum], {}, 20)).toMatchObject({ targets: [15, 15, 15], status: 'ceiling' })
    expect(incrementBalancedTarget([15, 15, 15], 15)).toEqual([15, 15, 15])
    expect(incrementBalancedTarget([15, 14, 15], 15)).toEqual([15, 15, 15])
  })

  it('holds timed targets rather than treating seconds as reps', () => {
    const prior = entry('march', [30, 30, 30], [40, 40, 40], [2, 2, 2], { exerciseId: march.id })
    expect(getNextExerciseTargets(march, [prior], {}, 20)).toMatchObject({ targets: [30, 30, 30], status: 'timed' })
  })

  it('takes manually adjusted historical targets as the next basis', () => {
    const prior = entry('manual', [12, 12, 11], [12, 12, 11], [2, 2, 3])
    expect(getNextExerciseTargets(press, [prior], {}, 20)).toMatchObject({ targets: [12, 12, 12], status: 'increase' })
  })

  it('matches weight, or uses a matching benchmark or seed on first performance', () => {
    const prior20 = entry('old-weight', [11, 10, 10], [11, 10, 10], [2, 2, 2])
    const benchmarks: BenchmarkHistory = { 'floor-press': [
      { exerciseId: 'floor-press', weight: 25, reps: 10, targetRir: 2, completedAt: time },
      { exerciseId: 'floor-press', weight: 20, reps: 15, targetRir: 2, completedAt: '2026-09-22T12:00:00.000Z' },
    ] }
    expect(getNextExerciseTargets(press, [prior20], benchmarks, 25)).toMatchObject({ targets: [8, 8, 8], status: 'starting-benchmark', previous: null })
    expect(getNextExerciseTargets(press, [prior20], {}, 25)).toMatchObject({ targets: [8, 8, 8], status: 'starting-seed', previous: null })
    expect(getNextExerciseTargets(press, [], benchmarks, 20)).toMatchObject({ targets: [12, 12, 12], status: 'starting-benchmark', previous: null })
    expect(getNextExerciseTargets(press, [prior20], benchmarks, 20).status).toBe('increase')
  })
})
