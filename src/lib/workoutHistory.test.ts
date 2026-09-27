import { describe, expect, it } from 'vitest'
import { workouts } from '../data/workouts'
import { createActiveWorkout } from './activeWorkout'
import { createActiveWorkoutRepository, ACTIVE_SESSION_KEY } from './activeWorkoutRepository'
import { historyEntryFromSession, historyEntrySummary, sortHistory } from './workoutHistory'
import { createWorkoutHistoryRepository, validWorkoutHistoryEntry, WORKOUT_HISTORY_KEY } from './workoutHistoryRepository'
import type { ActiveWorkoutSession } from '../types/training'

const workout = workouts[0]
const started = new Date('2026-09-21T12:00:00.000Z')
const finished = new Date('2026-09-21T12:40:00.000Z')
const storage = () => {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
function finishedSession(id = 'session-1', weight = 20): ActiveWorkoutSession {
  const session = createActiveWorkout(workout, 'monday', started, id, weight)
  return { ...session, status: 'completed', exercises: workout.exercises.map((exercise, index) => index === 1
    ? { exerciseId: exercise.id, status: 'completed' as const, sets: [12, 12, 11].map((actualReps, setIndex) => ({ setNumber: setIndex + 1, targetReps: 12, actualReps, rir: 2, completedAt: started.toISOString() })) }
    : { exerciseId: exercise.id, status: 'skipped' as const, sets: [] }) }
}

describe('completed workout history', () => {
  it('captures stable IDs, weight, dumbbell count, timestamps, and set values', () => {
    const entry = historyEntryFromSession(finishedSession('s1', 25), workout, finished)!
    expect(entry).toMatchObject({ id: 's1', workoutId: 'full-body-a', dumbbellWeight: 25, durationSeconds: 2400 })
    expect(entry.exercises[1]).toMatchObject({ exerciseId: 'floor-press', status: 'completed', dumbbellCount: 1 })
    expect(entry.exercises[1].sets.map((set) => set.actualReps)).toEqual([12, 12, 11])
    expect(historyEntrySummary(entry)).toEqual({ completed: 1, skipped: 6, sets: 3, reps: 35, minutes: 40 })
    expect(validWorkoutHistoryEntry(entry)).toBe(true)
    expect(historyEntryFromSession(createActiveWorkout(workout, 'monday', started, 'unfinished'), workout, finished)).toBeNull()
    expect(historyEntryFromSession({ ...finishedSession('resolved-but-active'), status: 'active' }, workout, finished)).toBeNull()
  })

  it('saves and loads completed history after active session is cleared', () => {
    const memory = storage()
    const active = createActiveWorkoutRepository(() => memory)
    const history = createWorkoutHistoryRepository(() => memory)
    const session = createActiveWorkout(workout, 'monday', started, 's1', 25)
    expect(active.save(session)).toBe(true)
    const entry = historyEntryFromSession(finishedSession('s1', 25), workout, finished)!
    expect(history.append(entry)).toMatchObject({ saved: true, issue: null })
    active.clear()
    expect(memory.values.has(ACTIVE_SESSION_KEY)).toBe(false)
    expect(createWorkoutHistoryRepository(() => memory).load().entries).toEqual([entry])
    expect(memory.values.has(WORKOUT_HISTORY_KEY)).toBe(true)
  })

  it('does not save abandoned sessions and prevents duplicate finish saves', () => {
    const memory = storage()
    const history = createWorkoutHistoryRepository(() => memory)
    const abandoned = createActiveWorkout(workout, 'monday', started, 'abandoned')
    expect(historyEntryFromSession(abandoned, workout, finished)).toBeNull()
    expect(history.load().entries).toEqual([])
    const entry = historyEntryFromSession(finishedSession(), workout, finished)!
    expect(history.append(entry).saved).toBe(true)
    expect(history.append(entry).saved).toBe(true)
    expect(history.load().entries).toHaveLength(1)
  })

  it('sorts by completion timestamp, not lexical date labels or insertion order', () => {
    const first = historyEntryFromSession(finishedSession('first'), workout, new Date('2026-09-03T12:00:00.000Z'))!
    const later = historyEntryFromSession(finishedSession('later'), workout, new Date('2026-10-01T12:00:00.000Z'))!
    expect(sortHistory([first, later]).map((entry) => entry.id)).toEqual(['later', 'first'])
  })

  it('recovers valid entries from malformed history and refuses future versions', () => {
    const memory = storage()
    const entry = historyEntryFromSession(finishedSession(), workout, finished)!
    memory.values.set(WORKOUT_HISTORY_KEY, '{broken')
    expect(createWorkoutHistoryRepository(() => memory).load()).toEqual({ entries: [], issue: 'corrupt' })
    memory.values.set(WORKOUT_HISTORY_KEY, JSON.stringify({ schemaVersion: 1, entries: [{ bad: true }, entry] }))
    expect(createWorkoutHistoryRepository(() => memory).load()).toEqual({ entries: [entry], issue: 'corrupt' })
    memory.values.set(WORKOUT_HISTORY_KEY, JSON.stringify({ schemaVersion: 2, entries: [entry] }))
    const repository = createWorkoutHistoryRepository(() => memory)
    expect(repository.load().issue).toBe('unsupported-version')
    expect(repository.append(entry).saved).toBe(false)
    expect(JSON.parse(memory.values.get(WORKOUT_HISTORY_KEY)!).schemaVersion).toBe(2)
  })

  it('handles unavailable storage and write failure', () => {
    const entry = historyEntryFromSession(finishedSession(), workout, finished)!
    expect(createWorkoutHistoryRepository(() => null).append(entry)).toMatchObject({ saved: false, issue: 'unavailable' })
    const broken = createWorkoutHistoryRepository(() => ({ getItem: () => null, setItem: () => { throw new Error('blocked') } }))
    expect(broken.append(entry)).toMatchObject({ saved: false, issue: 'write-failed' })
  })

  it('resets only workouts completed on the chosen local day', () => {
    const memory = storage()
    const repository = createWorkoutHistoryRepository(() => memory)
    const original = historyEntryFromSession(finishedSession(), workout, finished)!
    const today = new Date(2026, 8, 21, 12)
    const yesterday = new Date(2026, 8, 20, 12)
    const entryAt = (id: string, time: Date) => ({ ...original, id, startedAt: new Date(time.getTime() - 40 * 60_000).toISOString(), completedAt: time.toISOString() })
    const older = entryAt('older', yesterday)
    const first = entryAt('today-a', today)
    const second = entryAt('today-b', new Date(today.getTime() + 60_000))
    memory.values.set(WORKOUT_HISTORY_KEY, JSON.stringify({ schemaVersion: 1, entries: [older, first, second] }))
    expect(repository.removeCompletedOnLocalDate(today)).toMatchObject({ removed: 2, saved: true, issue: null })
    expect(repository.load().entries.map((entry) => entry.id)).toEqual(['older'])
    expect(repository.removeCompletedOnLocalDate(today)).toMatchObject({ removed: 0, saved: true })
  })

  it('does not replace workout history when day reset cannot be saved', () => {
    const memory = storage()
    const entry = historyEntryFromSession(finishedSession(), workout, finished)!
    const raw = JSON.stringify({ schemaVersion: 1, entries: [entry] })
    memory.values.set(WORKOUT_HISTORY_KEY, raw)
    const blocked = createWorkoutHistoryRepository(() => ({ getItem: memory.getItem, setItem: () => { throw new Error('blocked') } }))
    expect(blocked.removeCompletedOnLocalDate(new Date(entry.completedAt))).toMatchObject({ saved: false, issue: 'write-failed', removed: 0 })
    expect(memory.values.get(WORKOUT_HISTORY_KEY)).toBe(raw)
  })

  it('migrates a valid Phase 3 active session using the current profile weight', () => {
    const memory = storage()
    const previous = createActiveWorkout(workout, 'monday', started, 'old', 20) as unknown as Record<string, unknown>
    delete previous.dumbbellWeight
    memory.values.set(ACTIVE_SESSION_KEY, JSON.stringify(previous))
    const loaded = createActiveWorkoutRepository(() => memory).load(25)
    expect(loaded?.dumbbellWeight).toBe(25)
    expect(loaded?.id).toBe('old')
  })
})
