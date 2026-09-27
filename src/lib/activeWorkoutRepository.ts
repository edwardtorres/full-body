import { workouts } from '../data/workouts'
import type { ActiveWorkoutSession } from '../types/training'
import { weekDays } from '../types/profile'
import { getExerciseVariant } from '../data/exerciseVariants'

export const ACTIVE_SESSION_KEY = 'full-body:active-session:v1'
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const validDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))

export function validActiveSession(value: unknown): value is ActiveWorkoutSession {
  if (!record(value) || typeof value.id !== 'string' || !value.id || typeof value.workoutId !== 'string'
    || !validDate(value.startedAt) || typeof value.scheduledDay !== 'string' || !weekDays.includes(value.scheduledDay as typeof weekDays[number]) || value.status !== 'active'
    || typeof value.dumbbellWeight !== 'number' || !Number.isFinite(value.dumbbellWeight) || value.dumbbellWeight <= 0 || value.dumbbellWeight > 300
    || !Number.isInteger(value.currentExerciseIndex) || !Array.isArray(value.exercises)
    || !(value.restEndsAt === null || validDate(value.restEndsAt))) return false
  const workout = workouts.find((item) => item.id === value.workoutId)
  if (!workout || value.exercises.length !== workout.exercises.length || Number(value.currentExerciseIndex) < 0
    || Number(value.currentExerciseIndex) >= workout.exercises.length) return false
  if (!value.exercises.every((entry, index) => {
    if (!record(entry) || entry.exerciseId !== workout.exercises[index].id
      || entry.variantId !== undefined && (typeof entry.variantId !== 'string' || !getExerciseVariant(workout.exercises[index].id, entry.variantId))
      || !['pending', 'active', 'completed', 'skipped'].includes(String(entry.status)) || !Array.isArray(entry.sets)
      || entry.sets.length > workout.exercises[index].defaultSets) return false
    if (entry.status === 'completed' && entry.sets.length !== workout.exercises[index].defaultSets) return false
    if (entry.status !== 'completed' && entry.sets.length === workout.exercises[index].defaultSets) return false
    return entry.sets.every((set, setIndex) => record(set) && set.setNumber === setIndex + 1
      && Number.isInteger(set.targetReps) && Number(set.targetReps) >= 1 && Number(set.targetReps) <= 999
      && (set.targetWasEdited === undefined || typeof set.targetWasEdited === 'boolean')
      && Number.isInteger(set.actualReps) && Number(set.actualReps) >= 0 && Number(set.actualReps) <= 999
      && Number.isInteger(set.rir) && Number(set.rir) >= 0 && Number(set.rir) <= 4 && validDate(set.completedAt))
  })) return false
  const active = value.exercises.filter((entry) => entry.status === 'active')
  const allResolved = value.exercises.every((entry) => entry.status === 'completed' || entry.status === 'skipped')
  return allResolved ? active.length === 0 : active.length === 1 && value.exercises[Number(value.currentExerciseIndex)].status === 'active'
}

export function createActiveWorkoutRepository(storageFactory: () => StoragePort | null) {
  return {
    load(legacyWeight?: number): ActiveWorkoutSession | null {
      try {
        const storage = storageFactory()
        const raw = storage?.getItem(ACTIVE_SESSION_KEY)
        if (!raw) return null
        const parsed: unknown = JSON.parse(raw)
        const normalized = record(parsed) && parsed.dumbbellWeight === undefined && legacyWeight !== undefined
          ? { ...parsed, dumbbellWeight: legacyWeight } : parsed
        if (validActiveSession(normalized)) return { ...normalized, exercises: normalized.exercises.map((entry) => ({ ...entry, variantId: entry.variantId ?? entry.exerciseId })) }
        storage?.removeItem(ACTIVE_SESSION_KEY)
      } catch { /* unavailable or corrupt storage: continue without the session */ }
      return null
    },
    save(session: ActiveWorkoutSession): boolean {
      try {
        if (!validActiveSession(session)) return false
        const storage = storageFactory()
        if (!storage) return false
        storage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session))
        return true
      } catch { return false }
    },
    clear(): boolean {
      try {
        const storage = storageFactory()
        if (!storage) return false
        storage.removeItem(ACTIVE_SESSION_KEY)
        return true
      } catch { return false }
    },
  }
}

export const browserActiveWorkoutRepository = createActiveWorkoutRepository(() => window.localStorage)
