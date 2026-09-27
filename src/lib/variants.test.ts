import { describe, expect, it } from 'vitest'
import { workouts } from '../data/workouts'
import { exerciseFamilies, getExerciseVariant, getNextVariant, resolveExercise } from '../data/exerciseVariants'
import type { HistoricalExercise, WorkoutHistoryEntry } from '../types/training'
import { createWorkoutHistoryRepository, WORKOUT_HISTORY_KEY } from './workoutHistoryRepository'
import { completeSet, createActiveWorkout } from './activeWorkout'
import { createActiveWorkoutRepository, ACTIVE_SESSION_KEY } from './activeWorkoutRepository'
import { createVariantRepository, EXERCISE_VARIANTS_KEY } from './variantRepository'
import { APP_STORAGE_KEYS, resetAppData } from './reset'
import { getNextExerciseTargets } from './progression'
import { getExerciseAnalytics, getMuscleAnalytics } from './muscleAnalytics'
import { getEarnedProgressionCount, getWorkoutCelebrations } from './achievements'
import { canSelectVariant, getDifficultyAdvanceEvents, getUnlockedVariants, getVariantInitialTargets, groupExerciseHistoryByVariant, isVariationUpgradeReady } from './variants'

const workout = workouts[0]
const floorPress = workout.exercises.find((item) => item.id === 'floor-press')!
const overhead = workout.exercises.find((item) => item.id === 'overhead-press')!
const march = workout.exercises.find((item) => item.id === 'suitcase-march-a')!
const paused = getNextVariant(floorPress.id, floorPress.id)!
const eccentric = getNextVariant(floorPress.id, paused.id)!
const now = new Date('2026-09-25T12:00:00.000Z')
let serial = 0
type Result = { id?: string; variantId?: string; targets: number[]; actual?: number[]; rir?: number; count?: 1 | 2 }
function entry(date: string, results: Result[] = [], weight = 20, workoutId = workout.id): WorkoutHistoryEntry {
  const completedAt = `${date}T12:00:00.000Z`
  return { id: `variant-${++serial}`, workoutId, dumbbellWeight: weight, scheduledDay: 'monday', startedAt: completedAt, completedAt, durationSeconds: 1800,
    exercises: workout.exercises.map((exercise): HistoricalExercise => {
      const result = results.find((item) => item.id === exercise.id)
      return result ? { exerciseId: exercise.id, variantId: result.variantId ?? exercise.id, status: 'completed', dumbbellCount: result.count ?? exercise.dumbbellCount,
        sets: result.targets.map((targetReps, index) => ({ setNumber: index + 1, targetReps, actualReps: result.actual?.[index] ?? targetReps, rir: result.rir ?? 2, completedAt })) }
        : { exerciseId: exercise.id, variantId: exercise.id, status: 'skipped', dumbbellCount: exercise.dumbbellCount, sets: [] }
    }) }
}
const press = (targets: number[], variantId = floorPress.id, more: Partial<Result> = {}): Result => ({ id: floorPress.id, variantId, targets, ...more })
const ceilingHistory = () => [entry('2026-09-01', [press([15, 15, 14])]), entry('2026-09-08', [press([15, 15, 15])])]
const memory = () => { const values = new Map<string, string>(); return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } } }

describe('exercise variation ladders', () => {
  it('covers every rep-based scheduled slot and excludes timed marching', () => {
    const repExercises = workouts.flatMap((item) => item.exercises).filter((exercise) => !exercise.repRange.includes('sec'))
    expect(repExercises.every((exercise) => exerciseFamilies.find((family) => family.id === exercise.id)!.variantIds.length > 1)).toBe(true)
    expect(getNextVariant(march.id, march.id)).toBeNull()
    expect(getUnlockedVariants([], march).map((variant) => variant.id)).toEqual([march.id])
  })

  it('has deliberate variant ranges, stable family IDs, and no upgrade after the final level', () => {
    expect(paused).toMatchObject({ familyId: 'floor-press', level: 1, repRange: '8–12' })
    expect(resolveExercise(floorPress, paused.id)).toMatchObject({ id: 'floor-press', variantId: paused.id, name: paused.name, repRange: '8–12', dumbbellCount: 1 })
    const final = getExerciseVariant(floorPress.id, 'floor-press-level-3')!
    expect(getNextVariant(floorPress.id, final.id)).toBeNull()
  })
})

describe('unlock and selection rules', () => {
  it('unlocks level 1 after an earned successful ceiling, without needing a second ceiling session', () => {
    const history = ceilingHistory()
    expect(getUnlockedVariants(history, floorPress).map((item) => item.id)).toEqual([floorPress.id, paused.id])
    expect(isVariationUpgradeReady(history, floorPress, floorPress.id, 20)).toBe(true)
  })

  it('rejects RIR 1, missed target, skip, and a manual jump to the ceiling', () => {
    const base = entry('2026-09-01', [press([15, 15, 14])])
    const lowRir = entry('2026-09-08', [press([15, 15, 15], floorPress.id, { rir: 1 })])
    const missed = entry('2026-09-08', [press([15, 15, 15], floorPress.id, { actual: [15, 14, 15] })])
    const skipped = entry('2026-09-08')
    const jumped = entry('2026-09-08', [press([15, 15, 15])])
    const seed = entry('2026-09-01', [press([8, 8, 8])])
    for (const candidate of [lowRir, missed, skipped]) expect(getUnlockedVariants([base, candidate], floorPress)).toHaveLength(1)
    expect(getUnlockedVariants([seed, jumped], floorPress)).toHaveLength(1)
  })

  it('does not unlock from an edited target even when the numbers match an automatic +1', () => {
    const [previous, current] = ceilingHistory()
    current.exercises[1].sets[2].targetWasEdited = true
    expect(getUnlockedVariants([previous, current], floorPress)).toHaveLength(1)
    expect(getEarnedProgressionCount([previous, current])).toBe(0)
    delete current.exercises[1].sets[2].targetWasEdited
    previous.exercises[1].sets[0].targetWasEdited = true
    expect(getUnlockedVariants([previous, current], floorPress)).toHaveLength(1)
  })

  it('excludes fabricated quick sessions from unlocks and advances', () => {
    const quick = ceilingHistory().map((item) => ({ ...item, workoutId: 'quick-chest' }))
    expect(getUnlockedVariants(quick, floorPress)).toHaveLength(1)
    expect(getDifficultyAdvanceEvents([...quick, entry('2026-09-15', [press([8, 8, 8], paused.id)], 20, 'quick-chest')])).toEqual([])
  })

  it('cannot skip locked level 2, and can keep or return to unlocked variants', () => {
    const history = ceilingHistory()
    expect(canSelectVariant(history, floorPress, eccentric.id)).toBe(false)
    expect(canSelectVariant(history, floorPress, floorPress.id)).toBe(true)
    expect(canSelectVariant(history, floorPress, paused.id)).toBe(true)
    const later = [...history, entry('2026-09-15', [press([8, 8, 8], paused.id, { rir: 1 })])]
    expect(canSelectVariant(later, floorPress, paused.id)).toBe(true)
    expect(isVariationUpgradeReady(later, floorPress, paused.id, 20)).toBe(false)
  })

  it('persists explicit acceptance or keeping current, and allows an unlocked step back', () => {
    const storage = memory()
    const repo = createVariantRepository(() => storage)
    expect(repo.save({ 'floor-press': paused.id }).ok).toBe(true)
    expect(createVariantRepository(() => storage).load().selections['floor-press']).toBe(paused.id)
    expect(repo.save({ 'floor-press': floorPress.id }).ok).toBe(true)
    expect(createVariantRepository(() => storage).load().selections['floor-press']).toBe(floorPress.id)
    expect(storage.values.has(EXERCISE_VARIANTS_KEY)).toBe(true)
  })

  it('keeps a selection at a new weight, but never uses 20-lb ceiling evidence as 25-lb readiness', () => {
    const history = ceilingHistory()
    expect(isVariationUpgradeReady(history, floorPress, floorPress.id, 25)).toBe(false)
    expect(isVariationUpgradeReady([...history, entry('2026-09-15', [press([15, 15, 15])], 25)], floorPress, floorPress.id, 25)).toBe(false)
    const session = createActiveWorkout(workout, 'monday', now, 'weight-change', 25, { 'floor-press': paused.id })
    expect(session.exercises[1].variantId).toBe(paused.id)
    expect(getNextExerciseTargets(resolveExercise(floorPress, paused.id), history, {}, 25).targets).toEqual([8, 8, 8])
  })

  it('preserves one-vs-two dumbbell requirements', () => {
    const history = [entry('2026-09-01', [press([15, 15, 14])]), entry('2026-09-08', [press([15, 15, 15], floorPress.id, { count: 2 })])]
    expect(getUnlockedVariants(history, floorPress)).toHaveLength(1)
  })
})

describe('session and history compatibility', () => {
  it('normalizes old scheduled history and active sessions without variant IDs to base in memory', () => {
    const storage = memory()
    const old = entry('2026-09-01', [press([12, 12, 12])])
    old.exercises.forEach((item) => { delete item.variantId })
    storage.values.set(WORKOUT_HISTORY_KEY, JSON.stringify({ schemaVersion: 1, entries: [old] }))
    const loaded = createWorkoutHistoryRepository(() => storage).load().entries[0]
    expect(loaded.exercises.every((item) => item.variantId === item.exerciseId)).toBe(true)
    const active = createActiveWorkout(workout, 'monday', now, 'old-active')
    active.exercises.forEach((item) => { delete item.variantId })
    storage.values.set(ACTIVE_SESSION_KEY, JSON.stringify(active))
    expect(createActiveWorkoutRepository(() => storage).load()?.exercises.every((item) => item.variantId === item.exerciseId)).toBe(true)
  })

  it('snapshots the variation at workout start and resets the harder target to its lower bound', () => {
    const history = ceilingHistory()
    const session = createActiveWorkout(workout, 'monday', now, 'paused-session', 20, { 'floor-press': paused.id })
    expect(session.exercises[1].variantId).toBe(paused.id)
    expect(getVariantInitialTargets(floorPress, paused.id)).toEqual([8, 8, 8])
    expect(getNextExerciseTargets(resolveExercise(floorPress, paused.id), history, {}, 20).targets).toEqual([8, 8, 8])
    expect(getNextExerciseTargets(resolveExercise(floorPress, paused.id), history, {}, 20).targets).not.toEqual([15, 15, 15])
    expect(getNextExerciseTargets(floorPress, history, {}, 20).targets).toEqual([15, 15, 15])
  })

  it('records whether a set target was manually edited', () => {
    const session = createActiveWorkout(workout, 'monday', now, 'edited-target')
    const logged = completeSet(session, workout, 9, 9, 2, now, true)
    expect(logged.exercises[0].sets[0].targetWasEdited).toBe(true)
    expect(createActiveWorkoutRepository(() => memory()).save(logged)).toBe(true)
  })

  it('resets the separate variant preference along with the existing data', () => {
    const storage = memory()
    APP_STORAGE_KEYS.forEach((key) => storage.values.set(key, 'saved'))
    storage.values.set('other-app', 'keep')
    expect(resetAppData(storage)).toBe(true)
    expect([...storage.values.keys()]).toEqual(['other-app'])
  })
})

describe('variant-aware progression and analytics', () => {
  it('uses the selected variation ceiling and never compares rep targets across variants', () => {
    const history = [...ceilingHistory(), entry('2026-09-15', [press([8, 8, 8], paused.id)]), entry('2026-09-22', [press([9, 8, 8], paused.id)])]
    expect(getEarnedProgressionCount(history)).toBe(2)
    expect(getExerciseAnalytics(floorPress, history, 20, 'all', now, paused.id).progressionSteps).toBe(1)
    const nearPausedCeiling = entry('2026-09-23', [press([12, 12, 11], paused.id)])
    const pausedCeiling = entry('2026-09-24', [press([12, 12, 12], paused.id)])
    expect(getNextExerciseTargets(resolveExercise(floorPress, paused.id), [nearPausedCeiling, pausedCeiling], {}, 20).status).toBe('ceiling')
    expect(getUnlockedVariants([...ceilingHistory(), nearPausedCeiling, pausedCeiling], floorPress).some((item) => item.id === eccentric.id)).toBe(true)
  })

  it('groups base and harder history, and detects advance only after the harder session completes', () => {
    const history = ceilingHistory()
    expect(getDifficultyAdvanceEvents(history)).toEqual([])
    const harder = entry('2026-09-15', [press([8, 8, 8], paused.id)])
    const advanced = [...history, harder]
    expect(groupExerciseHistoryByVariant(advanced, floorPress).map((group) => [group.variantId, group.performances.length])).toEqual([[floorPress.id, 2], [paused.id, 1]])
    expect(getDifficultyAdvanceEvents(advanced)).toMatchObject([{ exerciseId: floorPress.id, fromVariantId: floorPress.id, toVariantId: paused.id, workoutId: harder.id }])
    expect(getEarnedProgressionCount(advanced)).toBe(1)
    expect(getWorkoutCelebrations(harder, history)).toMatchObject({ advances: [{ exerciseId: floorPress.id }], progressions: [] })
  })

  it('treats a new advanced variant as positive evidence without calling it stalled or weak', () => {
    const history = [
      entry('2026-09-01', [press([15, 15, 13]), { id: overhead.id, targets: [10, 10, 10], rir: 1 }]),
      entry('2026-09-08', [press([15, 15, 14]), { id: overhead.id, targets: [10, 10, 10], rir: 1 }]),
      entry('2026-09-15', [press([15, 15, 15]), { id: overhead.id, targets: [10, 10, 10], rir: 1 }]),
      entry('2026-09-22', [press([8, 8, 8], paused.id), { id: overhead.id, targets: [10, 10, 10], rir: 1 }]),
    ]
    const selections = { 'floor-press': paused.id }
    expect(getExerciseAnalytics(floorPress, history, 20, 'all', now, paused.id)).toMatchObject({ status: 'advanced-variation', difficultyAdvances: 1, progressionSteps: 0 })
    const chest = getMuscleAnalytics(history, 20, 'all', now, selections).find((item) => item.muscle === 'chest')!
    expect(chest.difficultyAdvances).toBe(1)
    expect(chest.classification).not.toBe('weak')
    expect(chest.progressingExercises).toBeGreaterThan(0)
  })
})
