import { describe, expect, it } from 'vitest'
import type { WorkoutHistoryEntry } from '../types/training'
import { completedWorkoutIdsOnLocalDate, endOfLocalWeek, getBestPerfectWeekStreak, getCurrentPerfectWeekStreak, getPerfectWeekCount, getRecentWeeks, getWeekHistory, getWeeklyCompletion, localDateKey, startOfLocalWeek } from './consistency'

let id = 0
function entry(workout: 'a' | 'b' | 'c', date: Date, skipped = false): WorkoutHistoryEntry {
  const completedAt = date.toISOString()
  return { id: String(++id), workoutId: `full-body-${workout}`, dumbbellWeight: 20, scheduledDay: 'monday', startedAt: completedAt, completedAt, durationSeconds: 100,
    exercises: skipped ? [{ exerciseId: 'goblet-squat', status: 'skipped', dumbbellCount: 1, sets: [] }] : [] }
}
const day = (year: number, month: number, date: number) => new Date(year, month - 1, date, 12)
const perfect = (monday: Date) => [entry('a', monday), entry('b', new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2, 12)), entry('c', new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4, 12))]

describe('local training weeks', () => {
  it('groups Monday through Sunday using local calendar dates', () => {
    const monday = day(2026, 9, 21)
    const sunday = day(2026, 9, 27)
    const nextMonday = day(2026, 9, 28)
    expect(localDateKey(startOfLocalWeek(sunday))).toBe('2026-09-21')
    expect(localDateKey(endOfLocalWeek(monday))).toBe('2026-09-27')
    expect(getWeekHistory([entry('a', monday), entry('b', sunday), entry('c', nextMonday)], monday)).toHaveLength(2)
  })

  it('counts A/B/C once, in any order or scheduled day, including skipped exercises', () => {
    const history = [entry('c', day(2026, 9, 26)), entry('a', day(2026, 9, 22), true), entry('b', day(2026, 9, 24)), entry('a', day(2026, 9, 25))]
    expect(getWeeklyCompletion(history, day(2026, 9, 23))).toMatchObject({ completedCount: 3, requiredCount: 3, isPerfectWeek: true, completedWorkoutIds: ['full-body-a', 'full-body-b', 'full-body-c'] })
    expect(getWeeklyCompletion(history.slice(0, 2), day(2026, 9, 23)).completedCount).toBe(2)
  })

  it('excludes regional-like entries and marks completed calendar dates from history', () => {
    const date = day(2026, 9, 22)
    const quick = { ...entry('a', date), workoutId: 'quick-chest' }
    expect(getWeeklyCompletion([quick], date).completedCount).toBe(0)
    expect(completedWorkoutIdsOnLocalDate([entry('a', date), entry('b', date), quick], date)).toEqual(['full-body-a', 'full-body-b'])
    expect(completedWorkoutIdsOnLocalDate([entry('a', date)], day(2026, 9, 23))).toEqual([])
  })

  it('retains the previous perfect streak during an incomplete current week', () => {
    const history = [...perfect(day(2026, 9, 7)), ...perfect(day(2026, 9, 14)), entry('a', day(2026, 9, 21))]
    expect(getCurrentPerfectWeekStreak(history, day(2026, 9, 23))).toBe(2)
    expect(getWeeklyCompletion(history, day(2026, 9, 23)).completedCount).toBe(1)
    expect(getRecentWeeks(history, day(2026, 9, 23), 2).map((week) => week.completedCount)).toEqual([1, 3])
  })

  it('breaks current streak after an imperfect previous week, while preserving best', () => {
    const history = [...perfect(day(2026, 9, 7)), ...perfect(day(2026, 9, 14)), entry('a', day(2026, 9, 21)), entry('b', day(2026, 9, 23))]
    expect(getCurrentPerfectWeekStreak(history, day(2026, 9, 30))).toBe(0)
    expect(getBestPerfectWeekStreak(history)).toBe(2)
    expect(getPerfectWeekCount(history)).toBe(2)
  })

  it('handles month, year, and daylight saving boundaries with calendar arithmetic', () => {
    const history = [...perfect(day(2025, 12, 29)), ...perfect(day(2026, 1, 5)), ...perfect(day(2026, 1, 12))]
    expect(getCurrentPerfectWeekStreak(history, day(2026, 1, 20))).toBe(3)
    expect(getBestPerfectWeekStreak(history)).toBe(3)
    expect(localDateKey(startOfLocalWeek(day(2026, 1, 1)))).toBe('2025-12-29')
    const spring = [...perfect(day(2026, 3, 2)), ...perfect(day(2026, 3, 9))]
    expect(getBestPerfectWeekStreak(spring)).toBe(2)
  })

  it('handles empty history and one finished week', () => {
    expect(getCurrentPerfectWeekStreak([], day(2026, 9, 24))).toBe(0)
    expect(getBestPerfectWeekStreak(perfect(day(2026, 9, 21)))).toBe(1)
  })
})
