import { describe, expect, it } from 'vitest'
import { workouts } from '../data/workouts'
import { ACTIVE_SESSION_KEY, createActiveWorkoutRepository } from './activeWorkoutRepository'
import { allExercisesResolved, completeSet, completedMusclesForSession, createActiveWorkout, editLoggedSet, initialExerciseTarget, isUnilateral, jumpToExercise, remainingRestSeconds, restSeconds, sessionCounts, sessionSummary, skipExercise } from './activeWorkout'
import { quickExerciseForMuscle } from './training'

const workout = workouts[0]
const start = new Date('2026-09-21T12:00:00.000Z')
const fresh = () => createActiveWorkout(workout, 'monday', start, 'session-1')

describe('active workout state', () => {
  it('uses benchmarks or the lower rep-range bound', () => {
    expect(initialExerciseTarget(workout.exercises[1], { 'floor-press': [{ exerciseId: 'floor-press', weight: 20, reps: 15, targetRir: 2, completedAt: start.toISOString() }] }, 20)).toBe(12)
    expect(initialExerciseTarget(workout.exercises[0], {}, 20)).toBe(8)
    expect(initialExerciseTarget(workouts[1].exercises[4], {}, 20)).toBe(10)
    expect(initialExerciseTarget(workout.exercises[6], {}, 20)).toBe(30)
    expect(isUnilateral(workout.exercises[2])).toBe(true)
  })

  it('records actual reps/RIR and completes only after every set', () => {
    let session = fresh()
    session = completeSet(session, workout, 8, 7, 2, start)
    expect(session.exercises[0].status).toBe('active')
    expect(session.exercises[0].sets[0]).toMatchObject({ setNumber: 1, targetReps: 8, actualReps: 7, rir: 2 })
    expect(sessionCounts(session)).toEqual({ completed: 0, skipped: 0, remaining: 7 })
    session = completeSet({ ...session, restEndsAt: null }, workout, 8, 8, 1, start)
    session = completeSet({ ...session, restEndsAt: null }, workout, 8, 6, 0, start)
    expect(session.exercises[0].status).toBe('completed')
    expect(session.currentExerciseIndex).toBe(1)
    expect(sessionCounts(session)).toEqual({ completed: 1, skipped: 0, remaining: 6 })
    expect(sessionSummary(session, workout, new Date('2026-09-21T12:10:00.000Z'))).toMatchObject({ sets: 3, reps: 21, minutes: 10 })
    const edited = editLoggedSet(session, 0, 0, 9, 3)
    expect(edited.exercises[0].sets[0]).toMatchObject({ actualReps: 9, rir: 3 })
    expect(session.exercises[0].sets[0].actualReps).toBe(7)
  })

  it('keeps skipped exercise distinct and permits finishing with skips', () => {
    let session = fresh()
    session = skipExercise(session)
    expect(session.exercises[0].status).toBe('skipped')
    expect(session.currentExerciseIndex).toBe(1)
    expect(sessionCounts(session)).toEqual({ completed: 0, skipped: 1, remaining: 6 })
    expect(completedMusclesForSession(workout, session).size).toBe(0)
    for (let index = 1; index < workout.exercises.length; index++) session = skipExercise(session)
    expect(allExercisesResolved(session)).toBe(true)
    expect(sessionCounts(session)).toEqual({ completed: 0, skipped: 7, remaining: 0 })
  })

  it('uses only primary exercises for muscle completion', () => {
    let session = fresh()
    session = jumpToExercise(session, 1)
    for (let index = 0; index < 3; index++) session = completeSet({ ...session, restEndsAt: null }, workout, 12, 12, 2, start)
    expect(completedMusclesForSession(workout, session).has('chest')).toBe(true)
    expect(completedMusclesForSession(workout, session).has('triceps')).toBe(false)
    expect(completedMusclesForSession(workout, session).has('biceps')).toBe(false)
  })

  it('restores rest from an end timestamp rather than elapsed ticks', () => {
    expect(restSeconds(workout.exercises[0])).toBe(120)
    expect(restSeconds(workout.exercises[5])).toBe(75)
    const session = completeSet(fresh(), workout, 8, 8, 2, start)
    expect(session.restEndsAt).toBe('2026-09-21T12:02:00.000Z')
    expect(remainingRestSeconds(session.restEndsAt, start.getTime() + 18_000)).toBe(102)
    expect(remainingRestSeconds(session.restEndsAt, start.getTime() + 200_000)).toBe(0)
  })

  it('does not count timed carry seconds as repetitions', () => {
    const carry = jumpToExercise(fresh(), 6)
    const logged = completeSet(carry, workout, 30, 35, 2, start)
    expect(sessionSummary(logged, workout, start)).toMatchObject({ sets: 1, reps: 0 })
  })

  it('persists active state and clears corrupt data', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
    const repository = createActiveWorkoutRepository(() => storage)
    const session = completeSet(fresh(), workout, 8, 8, 2, start)
    expect(repository.save(session)).toBe(true)
    expect(repository.load()).toEqual(session)
    values.set(ACTIVE_SESSION_KEY, '{bad')
    expect(repository.load()).toBeNull()
    values.set(ACTIVE_SESSION_KEY, JSON.stringify({ ...session, workoutId: 'missing' }))
    expect(repository.load()).toBeNull()
    expect(values.has(ACTIVE_SESSION_KEY)).toBe(false)
  })

  it('keeps regional quick exercise separate from scheduled state', () => {
    const session = fresh()
    expect(quickExerciseForMuscle(workouts, 'chest').id).toBe('floor-press')
    expect(sessionCounts(session).completed).toBe(0)
    expect(completedMusclesForSession(workout, session).has('chest')).toBe(false)
  })
})
