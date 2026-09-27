import { describe, expect, it } from 'vitest'
import { workouts } from '../data/workouts'
import { muscleGroups } from '../types/training'
import { completedMusclesForWorkout, exercisesForMuscle, exercisesRemaining, muscleStatus, quickExerciseForMuscle } from './training'

describe('workout seed data', () => {
  it('contains the intended days, exercise counts, and unique exercise ids', () => {
    expect(workouts.map((workout) => workout.day)).toEqual(['monday', 'wednesday', 'friday'])
    expect(workouts.map((workout) => workout.exercises.length)).toEqual([7, 8, 9])
    const exercises = workouts.flatMap((workout) => workout.exercises)
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(exercises.length)
    for (const exercise of exercises) {
      expect(exercise.name).toBeTruthy()
      expect(exercise.defaultSets).toBeGreaterThan(0)
      expect(exercise.repRange).toBeTruthy()
      expect([1, 2]).toContain(exercise.dumbbellCount)
      expect(exercise.primaryMuscles.length).toBeGreaterThan(0)
      for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) expect(muscleGroups).toContain(muscle)
    }
    expect(workouts[2].exercises[0].dumbbellCount).toBe(2)
  })

  it('covers every selectable muscle across the program', () => {
    const covered = new Set(workouts.flatMap((workout) => workout.exercises.flatMap((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles])))
    for (const muscle of muscleGroups) expect(covered.has(muscle)).toBe(true)
  })
})

describe('training helpers', () => {
  const monday = workouts[0]

  it('finds exercises where a muscle is primary or secondary', () => {
    expect(exercisesForMuscle(monday, 'chest').map((exercise) => exercise.id)).toEqual(['floor-press'])
    expect(exercisesForMuscle(monday, 'biceps').map((exercise) => exercise.id)).toEqual(['one-arm-row'])
  })

  it('starts each muscle with a primary exercise', () => {
    for (const muscle of muscleGroups) {
      const exercise = quickExerciseForMuscle(workouts, muscle)
      expect(exercise.primaryMuscles).toContain(muscle)
    }
    expect(quickExerciseForMuscle(workouts, 'biceps').name).toBe('Hammer Curl')
  })

  it('calculates remaining exercises from ids', () => {
    expect(exercisesRemaining(monday, new Set())).toBe(7)
    expect(exercisesRemaining(monday, new Set(['floor-press', 'goblet-squat']))).toBe(5)
    expect(exercisesRemaining(monday, new Set(['not-in-this-workout']))).toBe(7)
  })

  it('keeps completed and selected statuses independent', () => {
    const completed = new Set(['chest'] as const)
    expect(muscleStatus('chest', null, completed)).toBe('completed')
    expect(muscleStatus('chest', 'chest', completed)).toBe('selected-completed')
    expect(muscleStatus('abs', 'abs', completed)).toBe('selected')
    expect(muscleStatus('abs', null, completed)).toBe('idle')
  })

  it('marks a muscle complete only after all of its scheduled exercises are done', () => {
    expect(completedMusclesForWorkout(monday, new Set(['floor-press'])).has('chest')).toBe(true)
    expect(completedMusclesForWorkout(monday, new Set(['one-arm-row'])).has('biceps')).toBe(false)
    expect(completedMusclesForWorkout(monday, new Set(['floor-press'])).has('triceps')).toBe(false)
    expect(completedMusclesForWorkout(monday, new Set(['floor-press', 'overhead-press'])).has('triceps')).toBe(true)
  })
})
