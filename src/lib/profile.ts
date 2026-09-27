import { weekDays, type BenchmarkResult, type PersistedProfile, type TrainingSchedule, type WeekDay } from '../types/profile'
import type { Exercise } from '../types/training'

export function defaultProfileState(): PersistedProfile {
  return {
    schemaVersion: 1,
    profile: {
      goal: 'build-muscle',
      equipment: { dumbbellWeight: 20, unit: 'lb', floorSpace: true },
      schedule: { slots: [
        { workoutId: 'full-body-a', day: 'monday', time: '09:00' },
        { workoutId: 'full-body-b', day: 'wednesday', time: '09:00' },
        { workoutId: 'full-body-c', day: 'friday', time: '09:00' },
      ] },
    },
    onboarding: { completed: false, step: 'goal', benchmarkIndex: 0, draftBenchmarks: [] },
    benchmarks: {},
  }
}

export function validScheduleDays(days: readonly string[]): days is [WeekDay, WeekDay, WeekDay] {
  return days.length === 3 && new Set(days).size === 3 && days.every((day) => weekDays.includes(day as WeekDay))
}

export function replaceScheduleDay(schedule: TrainingSchedule, oldDay: WeekDay, newDay: WeekDay): TrainingSchedule {
  const days = schedule.slots.map((slot) => slot.day)
  if (!days.includes(oldDay) || days.includes(newDay)) return schedule
  return { slots: schedule.slots.map((slot) => slot.day === oldDay ? { ...slot, day: newDay } : slot) as TrainingSchedule['slots'] }
}

export function validScheduleTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function assignWorkoutDay(schedule: TrainingSchedule, workoutId: TrainingSchedule['slots'][number]['workoutId'], day: WeekDay): TrainingSchedule {
  const current = schedule.slots.find((slot) => slot.workoutId === workoutId)
  if (!current || current.day === day) return schedule
  return { slots: schedule.slots.map((slot) => {
    if (slot.workoutId === workoutId) return { ...slot, day }
    if (slot.day === day) return { ...slot, day: current.day }
    return slot
  }) as TrainingSchedule['slots'] }
}

export function setWorkoutTime(schedule: TrainingSchedule, workoutId: TrainingSchedule['slots'][number]['workoutId'], time: string): TrainingSchedule {
  if (!validScheduleTime(time)) return schedule
  return { slots: schedule.slots.map((slot) => slot.workoutId === workoutId ? { ...slot, time } : slot) as TrainingSchedule['slots'] }
}

export function normalizeSchedule(value: unknown): TrainingSchedule | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  if (Array.isArray(input.slots)) {
    const slots = input.slots
    if (slots.length !== 3 || !slots.every((slot, index) => slot && typeof slot === 'object'
      && (slot as Record<string, unknown>).workoutId === `full-body-${'abc'[index]}`
      && typeof (slot as Record<string, unknown>).day === 'string')) return null
    const days = slots.map((slot) => (slot as { day: string }).day)
    return validScheduleDays(days) ? { slots: slots.map((slot) => {
      const entry = slot as Record<string, unknown>
      return { workoutId: entry.workoutId, day: entry.day, time: validScheduleTime(entry.time) ? entry.time : '09:00' }
    }) as TrainingSchedule['slots'] } : null
  }
  if (Array.isArray(input.days) && validScheduleDays(input.days)) {
    return { slots: input.days.map((day, index) => ({ workoutId: `full-body-${'abc'[index]}`, day, time: '09:00' })) as TrainingSchedule['slots'] }
  }
  return null
}

export function validateBenchmarkReps(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null
  const reps = Number(input.trim())
  return Number.isInteger(reps) && reps >= 1 && reps <= 100 ? reps : null
}

export function initialTargetPerSet(result: BenchmarkResult, exercise: Exercise): number {
  const upper = Number(exercise.repRange.match(/\d+\s*[–-]\s*(\d+)/)?.[1] ?? 100)
  return Math.max(1, Math.min(upper, Math.floor(result.reps * 0.8)))
}

export function originalBenchmark(history: BenchmarkResult[] | undefined): BenchmarkResult | null {
  return history?.[0] ?? null
}

export function latestBenchmark(history: BenchmarkResult[] | undefined): BenchmarkResult | null {
  return history?.at(-1) ?? null
}
