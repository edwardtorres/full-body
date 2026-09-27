import { muscleGroups, type Exercise, type MuscleGroup, type MuscleStatus, type SessionKind, type Workout } from '../types/training'

export interface SessionCompletion {
  scheduledExerciseIds: ReadonlySet<string>
  regionalMuscles: ReadonlySet<MuscleGroup>
}

export function recordSessionCompletion(state: SessionCompletion, kind: SessionKind, exerciseId: string, muscle: MuscleGroup | null): SessionCompletion {
  if (kind === 'regional') return { scheduledExerciseIds: new Set(state.scheduledExerciseIds), regionalMuscles: new Set(muscle ? [...state.regionalMuscles, muscle] : state.regionalMuscles) }
  return { scheduledExerciseIds: new Set([...state.scheduledExerciseIds, exerciseId]), regionalMuscles: new Set(state.regionalMuscles) }
}

export function exercisesForMuscle(workout: Workout, muscle: MuscleGroup): Exercise[] {
  return workout.exercises.filter((item) => item.primaryMuscles.includes(muscle) || item.secondaryMuscles.includes(muscle))
}

const quickExerciseIds: Record<MuscleGroup, string> = {
  chest: 'floor-press',
  shoulders: 'overhead-press',
  biceps: 'hammer-curl',
  triceps: 'overhead-extension',
  abs: 'suitcase-march-a',
  quadriceps: 'goblet-squat',
  hamstrings: 'romanian-deadlift',
  glutes: 'romanian-deadlift',
  calves: 'calf-raise-a',
  upperBack: 'one-arm-row',
  lats: 'one-arm-row',
}

export function quickExerciseForMuscle(workouts: Workout[], muscle: MuscleGroup): Exercise {
  const exercise = workouts.flatMap((workout) => workout.exercises).find((item) => item.id === quickExerciseIds[muscle])
  if (!exercise) throw new Error(`No quick exercise for ${muscle}`)
  return exercise
}

export function exercisesRemaining(workout: Workout, completedExerciseIds: ReadonlySet<string>): number {
  return workout.exercises.filter((item) => !completedExerciseIds.has(item.id)).length
}

export function completedMusclesForWorkout(workout: Workout, completedExerciseIds: ReadonlySet<string>): Set<MuscleGroup> {
  return new Set(muscleGroups.filter((muscle) => {
    const related = workout.exercises.filter((exercise) => exercise.primaryMuscles.includes(muscle))
    return related.length > 0 && related.every((exercise) => completedExerciseIds.has(exercise.id))
  }))
}

export function muscleStatus(muscle: MuscleGroup, selectedMuscle: MuscleGroup | null, completedMuscles: ReadonlySet<MuscleGroup>): MuscleStatus {
  const selected = muscle === selectedMuscle
  const completed = completedMuscles.has(muscle)
  if (selected && completed) return 'selected-completed'
  if (selected) return 'selected'
  if (completed) return 'completed'
  return 'idle'
}
