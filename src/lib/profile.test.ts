import { describe, expect, it } from 'vitest'
import { benchmarkExercises } from '../data/benchmark'
import { workouts } from '../data/workouts'
import type { BenchmarkResult } from '../types/profile'
import { completedMusclesForWorkout, recordSessionCompletion } from './training'
import { defaultProfileState, initialTargetPerSet, latestBenchmark, originalBenchmark, replaceScheduleDay, validScheduleDays, validateBenchmarkReps } from './profile'
import { createProfileRepository, PROFILE_STORAGE_KEY } from './profileRepository'

const result = (exerciseId: string, reps: number, completedAt = '2026-09-24T12:00:00.000Z'): BenchmarkResult =>
  ({ exerciseId, reps, weight: 20, targetRir: 2, completedAt })

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

describe('onboarding profile', () => {
  it('starts with the supported goal, 20 lb, floor space, and three default days', () => {
    const state = defaultProfileState()
    expect(state.onboarding).toMatchObject({ completed: false, step: 'goal' })
    expect(state.profile).toEqual({
      goal: 'build-muscle',
      equipment: { dumbbellWeight: 20, unit: 'lb', floorSpace: true },
      schedule: { slots: [
        { workoutId: 'full-body-a', day: 'monday', time: '09:00' },
        { workoutId: 'full-body-b', day: 'wednesday', time: '09:00' },
        { workoutId: 'full-body-c', day: 'friday', time: '09:00' },
      ] },
    })
  })

  it('keeps exactly three unique selected days when swapping a day', () => {
    const schedule = defaultProfileState().profile.schedule
    expect(validScheduleDays(schedule.slots.map((slot) => slot.day))).toBe(true)
    expect(validScheduleDays(['monday', 'wednesday'])).toBe(false)
    expect(validScheduleDays(['monday', 'monday', 'friday'])).toBe(false)
    expect(replaceScheduleDay(schedule, 'wednesday', 'thursday').slots.map((slot) => slot.day)).toEqual(['monday', 'thursday', 'friday'])
    expect(replaceScheduleDay(schedule, 'wednesday', 'friday')).toBe(schedule)
  })
})

describe('benchmark rules', () => {
  it('accepts only whole repetitions from 1 to 100', () => {
    expect(validateBenchmarkReps('18')).toBe(18)
    for (const input of ['', '0', '-2', '2.5', 'NaN', '101', '1e2']) expect(validateBenchmarkReps(input)).toBeNull()
  })

  it('calculates an 80% starting target without exceeding the exercise rep ceiling', () => {
    const press = benchmarkExercises.find((exercise) => exercise.id === 'floor-press')!
    expect(initialTargetPerSet(result('floor-press', 15), press)).toBe(12)
    expect(initialTargetPerSet(result('floor-press', 100), press)).toBe(15)
    expect(initialTargetPerSet(result('floor-press', 2), press)).toBe(1)
  })

  it('stores and retrieves benchmark results with stable exercise ids', () => {
    const storage = memoryStorage()
    const repository = createProfileRepository(() => storage)
    const state = defaultProfileState()
    state.onboarding = { completed: true, step: 'complete', benchmarkIndex: 0, draftBenchmarks: [] }
    state.benchmarks['floor-press'] = [result('floor-press', 15)]
    expect(repository.save(state)).toEqual({ ok: true, issue: null })
    expect(repository.load()).toEqual({ state, issue: null })
  })

  it('keeps the original benchmark when a new result is appended', () => {
    const storage = memoryStorage()
    const repository = createProfileRepository(() => storage)
    const state = defaultProfileState()
    state.benchmarks['floor-press'] = [result('floor-press', 13)]
    repository.save(state)
    const loaded = repository.load().state
    loaded.benchmarks['floor-press'].push(result('floor-press', 16, '2026-10-24T12:00:00.000Z'))
    repository.save(loaded)
    const history = createProfileRepository(() => storage).load().state.benchmarks['floor-press']
    expect(originalBenchmark(history)?.reps).toBe(13)
    expect(latestBenchmark(history)?.reps).toBe(16)
  })

  it('recovers from corrupt JSON and refuses to overwrite an unsupported version', () => {
    const storage = memoryStorage()
    storage.values.set(PROFILE_STORAGE_KEY, '{broken')
    expect(createProfileRepository(() => storage).load()).toMatchObject({ issue: 'corrupt', state: defaultProfileState() })
    storage.values.set(PROFILE_STORAGE_KEY, JSON.stringify({ schemaVersion: 2 }))
    const repository = createProfileRepository(() => storage)
    expect(repository.load().issue).toBe('unsupported-version')
    expect(repository.save(defaultProfileState()).ok).toBe(false)
    expect(JSON.parse(storage.values.get(PROFILE_STORAGE_KEY)!).schemaVersion).toBe(2)
  })

  it('remains usable when storage throws', () => {
    const repository = createProfileRepository(() => { throw new Error('blocked') })
    expect(repository.load().state).toEqual(defaultProfileState())
    expect(repository.save(defaultProfileState())).toEqual({ ok: false, issue: 'write-failed' })
  })
})

describe('session completion separation', () => {
  it('does not mark the scheduled workout complete after a regional session', () => {
    const state = recordSessionCompletion({ scheduledExerciseIds: new Set(), regionalMuscles: new Set() }, 'regional', 'floor-press', 'chest')
    expect(state.regionalMuscles.has('chest')).toBe(true)
    expect(state.scheduledExerciseIds.size).toBe(0)
    expect(completedMusclesForWorkout(workouts[0], state.scheduledExerciseIds).has('chest')).toBe(false)
    const scheduled = recordSessionCompletion(state, 'scheduled', 'floor-press', null)
    expect(completedMusclesForWorkout(workouts[0], scheduled.scheduledExerciseIds).has('chest')).toBe(true)
  })
})
