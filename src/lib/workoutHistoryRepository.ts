import { workouts } from '../data/workouts'
import { weekDays } from '../types/profile'
import type { WorkoutHistoryEntry } from '../types/training'
import { sortHistory } from './workoutHistory'
import { getExerciseVariant } from '../data/exerciseVariants'
import { localDateKey } from './consistency'

export const WORKOUT_HISTORY_KEY = 'full-body:workout-history:v1'
export type HistoryIssue = 'unavailable' | 'corrupt' | 'unsupported-version' | 'write-failed' | null
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const isoDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value
const weight = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 300

export function validWorkoutHistoryEntry(value: unknown): value is WorkoutHistoryEntry {
  if (!record(value) || typeof value.id !== 'string' || !value.id || typeof value.workoutId !== 'string'
    || !weight(value.dumbbellWeight) || !weekDays.includes(value.scheduledDay as typeof weekDays[number])
    || !isoDate(value.startedAt) || !isoDate(value.completedAt) || Date.parse(value.completedAt) < Date.parse(value.startedAt)
    || !Number.isInteger(value.durationSeconds) || Number(value.durationSeconds) < 0
    || !Array.isArray(value.exercises)) return false
  const workout = workouts.find((item) => item.id === value.workoutId)
  if (!workout || value.exercises.length !== workout.exercises.length) return false
  return value.exercises.every((item, index) => {
    const prescription = workout.exercises[index]
    if (!record(item) || item.exerciseId !== prescription.id || item.dumbbellCount !== prescription.dumbbellCount
      || item.variantId !== undefined && (typeof item.variantId !== 'string' || !getExerciseVariant(prescription.id, item.variantId))
      || !['completed', 'skipped'].includes(String(item.status)) || !Array.isArray(item.sets)
      || item.sets.length > prescription.defaultSets || (item.status === 'completed' && item.sets.length !== prescription.defaultSets)
      || (item.status === 'skipped' && item.sets.length === prescription.defaultSets)) return false
    return item.sets.every((set, setIndex) => record(set) && set.setNumber === setIndex + 1
      && Number.isInteger(set.targetReps) && Number(set.targetReps) >= 1 && Number(set.targetReps) <= 999
      && (set.targetWasEdited === undefined || typeof set.targetWasEdited === 'boolean')
      && Number.isInteger(set.actualReps) && Number(set.actualReps) >= 0 && Number(set.actualReps) <= 999
      && Number.isInteger(set.rir) && Number(set.rir) >= 0 && Number(set.rir) <= 4 && isoDate(set.completedAt))
  })
}

export function createWorkoutHistoryRepository(storageFactory: () => StoragePort | null) {
  let futureVersion = false
  return {
    load(): { entries: WorkoutHistoryEntry[]; issue: HistoryIssue } {
      try {
        const storage = storageFactory()
        if (!storage) return { entries: [], issue: 'unavailable' }
        const raw = storage.getItem(WORKOUT_HISTORY_KEY)
        if (raw === null) return { entries: [], issue: null }
        let parsed: unknown
        try { parsed = JSON.parse(raw) } catch { return { entries: [], issue: 'corrupt' } }
        if (record(parsed) && parsed.schemaVersion !== 1) {
          futureVersion = true
          return { entries: [], issue: 'unsupported-version' }
        }
        if (!record(parsed) || !Array.isArray(parsed.entries)) return { entries: [], issue: 'corrupt' }
        const entries = parsed.entries.filter(validWorkoutHistoryEntry)
        const unique = entries.filter((entry, index) => entries.findIndex((candidate) => candidate.id === entry.id) === index)
        const issue = unique.length === parsed.entries.length ? null : 'corrupt'
        return { entries: sortHistory(unique.map((entry) => ({ ...entry, exercises: entry.exercises.map((item) => ({ ...item, variantId: item.variantId ?? item.exerciseId })) }))), issue }
      } catch { return { entries: [], issue: 'unavailable' } }
    },
    append(entry: WorkoutHistoryEntry): { entries: WorkoutHistoryEntry[]; saved: boolean; issue: HistoryIssue } {
      const current = this.load()
      if (futureVersion || current.issue === 'unsupported-version') return { ...current, saved: false, issue: 'unsupported-version' }
      if (current.issue === 'unavailable') return { ...current, saved: false }
      if (!validWorkoutHistoryEntry(entry)) return { ...current, saved: false, issue: 'corrupt' }
      if (current.entries.some((item) => item.id === entry.id)) return { ...current, saved: true }
      try {
        const storage = storageFactory()
        if (!storage) return { ...current, saved: false, issue: 'unavailable' }
        const entries = sortHistory([...current.entries, entry])
        storage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify({ schemaVersion: 1, entries }))
        return { entries, saved: true, issue: null }
      } catch { return { ...current, saved: false, issue: 'write-failed' } }
    },
    removeCompletedOnLocalDate(date: Date): { entries: WorkoutHistoryEntry[]; removed: number; saved: boolean; issue: HistoryIssue } {
      const current = this.load()
      if (futureVersion || current.issue === 'unsupported-version') return { ...current, removed: 0, saved: false, issue: 'unsupported-version' }
      if (current.issue === 'unavailable' || current.issue === 'corrupt') return { ...current, removed: 0, saved: false }
      const day = localDateKey(date)
      const entries = current.entries.filter((entry) => localDateKey(new Date(entry.completedAt)) !== day)
      const removed = current.entries.length - entries.length
      if (removed === 0) return { ...current, removed, saved: true }
      try {
        const storage = storageFactory()
        if (!storage) return { ...current, removed: 0, saved: false, issue: 'unavailable' }
        storage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify({ schemaVersion: 1, entries }))
        return { entries, removed, saved: true, issue: null }
      } catch { return { ...current, removed: 0, saved: false, issue: 'write-failed' } }
    },
  }
}

export const browserWorkoutHistoryRepository = createWorkoutHistoryRepository(() => window.localStorage)
