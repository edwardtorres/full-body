import { describe, expect, it } from 'vitest'
import { workouts } from '../data/workouts'
import { assignWorkoutDay, defaultProfileState, normalizeSchedule, replaceScheduleDay, setWorkoutTime } from './profile'
import { localWeekDay, nextWorkout, todaysWorkout, workoutForDay } from './schedule'
import { createProfileRepository, PROFILE_STORAGE_KEY } from './profileRepository'

const schedule = defaultProfileState().profile.schedule

describe('stable workout schedule', () => {
  it('assigns A/B/C to Monday/Wednesday/Friday', () => {
    expect(['monday', 'wednesday', 'friday'].map((day) => workoutForDay(schedule, workouts, day as typeof schedule.slots[0]['day'])?.id)).toEqual(['full-body-a', 'full-body-b', 'full-body-c'])
  })

  it('preserves workout order when scheduled days change', () => {
    const changed = replaceScheduleDay(replaceScheduleDay(replaceScheduleDay(schedule, 'monday', 'tuesday'), 'wednesday', 'thursday'), 'friday', 'saturday')
    expect(changed.slots.map((slot) => [slot.workoutId, slot.day])).toEqual([
      ['full-body-a', 'tuesday'], ['full-body-b', 'thursday'], ['full-body-c', 'saturday'],
    ])
  })

  it('moves a workout to a free weekday and swaps with an occupied weekday', () => {
    const timed = setWorkoutTime(setWorkoutTime(schedule, 'full-body-a', '09:30'), 'full-body-b', '18:15')
    const moved = assignWorkoutDay(timed, 'full-body-a', 'tuesday')
    expect(moved.slots.map((slot) => slot.day)).toEqual(['tuesday', 'wednesday', 'friday'])
    const swapped = assignWorkoutDay(moved, 'full-body-a', 'wednesday')
    expect(swapped.slots.map((slot) => slot.day)).toEqual(['wednesday', 'tuesday', 'friday'])
    expect(swapped.slots.map((slot) => slot.workoutId)).toEqual(schedule.slots.map((slot) => slot.workoutId))
    expect(swapped.slots.map((slot) => slot.time)).toEqual(['09:30', '18:15', '09:00'])
  })

  it('saves a valid start time and rejects invalid times', () => {
    const changed = setWorkoutTime(schedule, 'full-body-a', '09:30')
    expect(changed.slots[0].time).toBe('09:30')
    expect(setWorkoutTime(changed, 'full-body-a', '25:90')).toBe(changed)
  })

  it('finds today and the next session using local calendar dates', () => {
    expect(todaysWorkout(schedule, workouts, new Date(2026, 8, 21))?.id).toBe('full-body-a')
    expect(todaysWorkout(schedule, workouts, new Date(2026, 8, 23))?.id).toBe('full-body-b')
    expect(todaysWorkout(schedule, workouts, new Date(2026, 8, 25))?.id).toBe('full-body-c')
    expect(todaysWorkout(schedule, workouts, new Date(2026, 8, 22))).toBeNull()
    expect(nextWorkout(schedule, workouts, new Date(2026, 8, 22))?.workout.id).toBe('full-body-b')
    expect(nextWorkout(schedule, workouts, new Date(2026, 8, 26))?.workout.id).toBe('full-body-a')
    expect(localWeekDay(new Date(2026, 8, 21))).toBe('monday')
  })

  it('migrates valid Phase 2 profiles without losing benchmarks', () => {
    const old = defaultProfileState() as unknown as Record<string, unknown>
    const profile = old.profile as Record<string, unknown>
    profile.schedule = { days: ['tuesday', 'thursday', 'saturday'] }
    old.benchmarks = { 'floor-press': [{ exerciseId: 'floor-press', weight: 20, reps: 15, targetRir: 2, completedAt: '2026-09-21T12:00:00.000Z' }] }
    const values = new Map([[PROFILE_STORAGE_KEY, JSON.stringify(old)]])
    const repository = createProfileRepository(() => ({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } }))
    const loaded = repository.load()
    expect(loaded.issue).toBeNull()
    expect(loaded.state.profile.schedule.slots.map((slot) => slot.day)).toEqual(['tuesday', 'thursday', 'saturday'])
    expect(loaded.state.profile.schedule.slots.map((slot) => slot.time)).toEqual(['09:00', '09:00', '09:00'])
    expect(loaded.state.benchmarks['floor-press'][0].reps).toBe(15)
    expect(repository.save(loaded.state).ok).toBe(true)
    expect(JSON.parse(values.get(PROFILE_STORAGE_KEY)!).profile.schedule.slots).toHaveLength(3)
    expect(normalizeSchedule({ days: ['monday', 'monday', 'friday'] })).toBeNull()
  })

  it('adds default times to saved Phase 3 schedule slots', () => {
    const old = defaultProfileState()
    const raw = JSON.parse(JSON.stringify(old))
    raw.profile.schedule.slots.forEach((slot: Record<string, unknown>) => { delete slot.time })
    const repository = createProfileRepository(() => ({ getItem: () => JSON.stringify(raw), setItem: () => {} }))
    expect(repository.load().state.profile.schedule.slots.map((slot) => slot.time)).toEqual(['09:00', '09:00', '09:00'])
  })
})
