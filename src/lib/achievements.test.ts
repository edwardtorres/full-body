import { describe, expect, it } from 'vitest'
import { workouts } from '../data/workouts'
import type { BenchmarkHistory, BenchmarkResult } from '../types/profile'
import type { HistoricalExercise, WorkoutHistoryEntry } from '../types/training'
import { compareBenchmark, getAchievementStates, getEarnedProgressionCount, getEarnedProgressionEvents, getWorkoutCelebrations } from './achievements'

let sequence = 0
function entry(workoutIndex: 0 | 1 | 2, date: Date, target?: { exerciseId: string; reps: number[]; rir?: number; count?: 1 | 2 }, weight = 20): WorkoutHistoryEntry {
  const workout = workouts[workoutIndex]
  const completedAt = date.toISOString()
  return { id: String(++sequence), workoutId: workout.id, dumbbellWeight: weight, scheduledDay: workout.day, startedAt: completedAt, completedAt, durationSeconds: 1800,
    exercises: workout.exercises.map((exercise): HistoricalExercise => exercise.id === target?.exerciseId
      ? { exerciseId: exercise.id, status: 'completed', dumbbellCount: target.count ?? exercise.dumbbellCount,
        sets: target.reps.map((reps, index) => ({ setNumber: index + 1, targetReps: reps, actualReps: reps, rir: target.rir ?? 2, completedAt })) }
      : { exerciseId: exercise.id, status: 'skipped', dumbbellCount: exercise.dumbbellCount, sets: [] }),
  }
}
const day = (year: number, month: number, date: number) => new Date(year, month - 1, date, 12)
const state = (history: WorkoutHistoryEntry[], benchmarks: BenchmarkHistory = {}) => new Map(getAchievementStates(history, benchmarks).map((item) => [item.id, item]))
const perfect = (monday: Date) => [entry(0, monday), entry(1, new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2, 12)), entry(2, new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4, 12))]

describe('derived achievements', () => {
  it('unlocks First Session only for scheduled workout history', () => {
    const quick = { ...entry(0, day(2026, 9, 1)), workoutId: 'regional-chest' }
    expect(state([quick]).get('first-session')?.unlocked).toBe(false)
    const scheduled = entry(0, day(2026, 9, 2))
    expect(state([quick, scheduled]).get('first-session')?.unlockedAt).toBe(scheduled.completedAt)
  })

  it('unlocks perfect week and all three workouts once, at the third distinct completion', () => {
    const week = perfect(day(2026, 9, 21))
    const duplicate = entry(0, day(2026, 9, 22))
    const states = getAchievementStates([...week, duplicate], {})
    expect(states.filter((item) => item.id === 'first-perfect-week' && item.unlocked)).toHaveLength(1)
    expect(state([...week, duplicate]).get('first-perfect-week')?.unlockedAt).toBe(week[2].completedAt)
    expect(state(week).get('all-three-workouts')?.unlockedAt).toBe(week[2].completedAt)
  })

  it('unlocks 3-week streak at the third perfect week', () => {
    const weeks = [...perfect(day(2026, 9, 7)), ...perfect(day(2026, 9, 14)), ...perfect(day(2026, 9, 21))]
    expect(state(weeks).get('three-week-streak')?.unlockedAt).toBe(weeks[8].completedAt)
    expect(state(weeks).get('five-week-streak')?.unlocked).toBe(false)
  })

  it('counts only earned +1 steps at matching weight/count with successful RIR', () => {
    const first = entry(0, day(2026, 9, 1), { exerciseId: 'floor-press', reps: [12, 12, 12] })
    const earned = entry(0, day(2026, 9, 8), { exerciseId: 'floor-press', reps: [13, 12, 12] })
    const manual = entry(0, day(2026, 9, 15), { exerciseId: 'floor-press', reps: [15, 15, 15] })
    const failed = entry(0, day(2026, 9, 22), { exerciseId: 'floor-press', reps: [15, 15, 15], rir: 1 })
    expect(getEarnedProgressionCount([first, earned, manual, failed])).toBe(1)
    expect(state([first, earned]).get('first-progression')?.unlockedAt).toBe(earned.completedAt)
    expect(getWorkoutCelebrations(manual, [first, earned]).progressions).toHaveLength(0)
  })

  it('does not cross weights and counts all historical weights separately', () => {
    const a = entry(0, day(2026, 9, 1), { exerciseId: 'floor-press', reps: [12, 12, 12] }, 20)
    const b = entry(0, day(2026, 9, 8), { exerciseId: 'floor-press', reps: [13, 12, 12] }, 25)
    const c = entry(0, day(2026, 9, 15), { exerciseId: 'floor-press', reps: [13, 12, 12] }, 20)
    const d = entry(0, day(2026, 9, 22), { exerciseId: 'floor-press', reps: [13, 13, 12] }, 25)
    expect(getEarnedProgressionCount([a, b, c, d])).toBe(2)
    const wrongCount = entry(0, day(2026, 9, 29), { exerciseId: 'floor-press', reps: [14, 13, 12], count: 2 }, 25)
    expect(getEarnedProgressionCount([a, b, c, d, wrongCount])).toBe(2)
  })

  it('unlocks ten progression steps exactly at the tenth event', () => {
    const reps = [[8, 8, 8], [9, 8, 8], [9, 9, 8], [9, 9, 9], [10, 9, 9], [10, 10, 9], [10, 10, 10], [11, 10, 10], [11, 11, 10], [11, 11, 11], [12, 11, 11]]
    const history = reps.map((targets, index) => entry(0, day(2026, 1, 1 + index * 7), { exerciseId: 'floor-press', reps: targets }))
    expect(getEarnedProgressionCount(history)).toBe(10)
    expect(state(history.slice(0, 10)).get('ten-progression-steps')?.unlocked).toBe(false)
    expect(state(history).get('ten-progression-steps')?.unlockedAt).toBe(history[10].completedAt)
  })

  it('requires successful prescribed progression to reach a rep ceiling', () => {
    const before = entry(0, day(2026, 9, 1), { exerciseId: 'floor-press', reps: [15, 15, 14] })
    const ceiling = entry(0, day(2026, 9, 8), { exerciseId: 'floor-press', reps: [15, 15, 15] })
    expect(getEarnedProgressionEvents([before, ceiling])[0]?.reachedCeiling).toBe(true)
    expect(state([before, ceiling]).get('first-rep-ceiling')?.unlocked).toBe(true)
    expect(getWorkoutCelebrations(ceiling, [before]).ceilings).toHaveLength(1)
    expect(state([ceiling]).get('first-rep-ceiling')?.unlocked).toBe(false)
  })

  it('celebrates a perfect week only on the newly completing workout', () => {
    const week = perfect(day(2026, 9, 21))
    expect(getWorkoutCelebrations(week[2], week.slice(0, 2))).toMatchObject({ perfectWeek: true, weekStreak: 1 })
    expect(getWorkoutCelebrations(entry(0, day(2026, 9, 26)), week).perfectWeek).toBe(false)
  })

  it('unlocks first benchmark retest from a second persisted result', () => {
    const first: BenchmarkResult = { exerciseId: 'floor-press', weight: 20, reps: 12, targetRir: 2, completedAt: day(2026, 9, 1).toISOString() }
    const second = { ...first, reps: 14, completedAt: day(2026, 9, 10).toISOString() }
    expect(state([], { 'floor-press': [first] }).get('first-benchmark-retest')?.unlocked).toBe(false)
    expect(state([], { 'floor-press': [first, second] }).get('first-benchmark-retest')?.unlockedAt).toBe(second.completedAt)
  })

  it('compares retests with the original only at the same weight', () => {
    const first: BenchmarkResult = { exerciseId: 'floor-press', weight: 20, reps: 13, targetRir: 2, completedAt: day(2026, 9, 1).toISOString() }
    expect(compareBenchmark(first, { ...first, reps: 17 })).toMatchObject({ status: 'improved', delta: 4 })
    expect(compareBenchmark(first, { ...first })).toMatchObject({ status: 'matched', delta: 0 })
    expect(compareBenchmark(first, { ...first, reps: 12 })).toMatchObject({ status: 'saved', delta: -1 })
    expect(compareBenchmark(first, { ...first, weight: 25, reps: 17 })).toMatchObject({ status: 'saved', delta: null })
  })
})
