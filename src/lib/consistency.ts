import type { WorkoutHistoryEntry } from '../types/training'

export const requiredWorkoutIds = ['full-body-a', 'full-body-b', 'full-body-c'] as const
export type RequiredWorkoutId = typeof requiredWorkoutIds[number]

const validWorkoutId = (id: string): id is RequiredWorkoutId => requiredWorkoutIds.some((required) => required === id)
const validCompletion = (entry: WorkoutHistoryEntry) => validWorkoutId(entry.workoutId) && Number.isFinite(Date.parse(entry.completedAt))

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function startOfLocalWeek(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7)
}

export function endOfLocalWeek(date: Date): Date {
  const start = startOfLocalWeek(date)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)
}

export function getWeekHistory(history: readonly WorkoutHistoryEntry[], date: Date): WorkoutHistoryEntry[] {
  const key = localDateKey(startOfLocalWeek(date))
  return history.filter((entry) => validCompletion(entry) && localDateKey(startOfLocalWeek(new Date(entry.completedAt))) === key)
}

export interface WeeklyCompletion {
  weekStart: Date
  weekEnd: Date
  completedWorkoutIds: RequiredWorkoutId[]
  completedCount: number
  requiredCount: 3
  isPerfectWeek: boolean
  perfectAt: string | null
}

export function getWeeklyCompletion(history: readonly WorkoutHistoryEntry[], date: Date): WeeklyCompletion {
  const weekStart = startOfLocalWeek(date)
  const entries = getWeekHistory(history, date).sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt))
  const seen = new Set<RequiredWorkoutId>()
  let perfectAt: string | null = null
  for (const entry of entries) {
    seen.add(entry.workoutId as RequiredWorkoutId)
    if (seen.size === 3 && perfectAt === null) perfectAt = entry.completedAt
  }
  return {
    weekStart, weekEnd: endOfLocalWeek(date),
    completedWorkoutIds: requiredWorkoutIds.filter((id) => seen.has(id)),
    completedCount: seen.size, requiredCount: 3,
    isPerfectWeek: seen.size === 3, perfectAt,
  }
}

export function completedWorkoutIdsOnLocalDate(history: readonly WorkoutHistoryEntry[], date: Date): RequiredWorkoutId[] {
  const key = localDateKey(date)
  const found = new Set(history.filter((entry) => validCompletion(entry) && localDateKey(new Date(entry.completedAt)) === key).map((entry) => entry.workoutId))
  return requiredWorkoutIds.filter((id) => found.has(id))
}

function shiftedWeek(date: Date, weeks: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7)
}

export function getRecentWeeks(history: readonly WorkoutHistoryEntry[], now: Date, count = 6): WeeklyCompletion[] {
  const start = startOfLocalWeek(now)
  return Array.from({ length: count }, (_, index) => getWeeklyCompletion(history, shiftedWeek(start, -index)))
}

export function getPerfectWeeks(history: readonly WorkoutHistoryEntry[]): WeeklyCompletion[] {
  const keys = new Map<string, Date>()
  for (const entry of history) {
    if (!validCompletion(entry)) continue
    const week = startOfLocalWeek(new Date(entry.completedAt))
    keys.set(localDateKey(week), week)
  }
  return [...keys.values()].map((week) => getWeeklyCompletion(history, week))
    .filter((week) => week.isPerfectWeek)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
}

export function getPerfectWeekCount(history: readonly WorkoutHistoryEntry[]): number {
  return getPerfectWeeks(history).length
}

export function getCurrentPerfectWeekStreak(history: readonly WorkoutHistoryEntry[], now: Date): number {
  let week = startOfLocalWeek(now)
  if (!getWeeklyCompletion(history, week).isPerfectWeek) week = shiftedWeek(week, -1)
  let count = 0
  while (getWeeklyCompletion(history, week).isPerfectWeek) {
    count++
    week = shiftedWeek(week, -1)
  }
  return count
}

export function getBestPerfectWeekStreak(history: readonly WorkoutHistoryEntry[]): number {
  const weeks = getPerfectWeeks(history)
  let best = 0
  let run = 0
  for (let index = 0; index < weeks.length; index++) {
    run = index > 0 && localDateKey(shiftedWeek(weeks[index - 1].weekStart, 1)) === localDateKey(weeks[index].weekStart) ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}
