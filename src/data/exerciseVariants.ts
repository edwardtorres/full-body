import { workouts } from './workouts'
import type { Exercise } from '../types/training'

export type ModifierType = 'base' | 'pause' | 'eccentric' | 'one-and-half' | 'single-leg' | 'squeeze'
export interface ExerciseVariant {
  id: string
  familyId: string
  name: string
  level: number
  repRange: string
  modifier: ModifierType
  modifierCue: string
  unilateral: boolean
}
export interface ExerciseFamily { id: string; baseExerciseId: string; variantIds: string[] }
type Step = [name: string, modifier: ModifierType, cue: string, repRange?: string]

const pause = 'Hold the bottom position for 2 seconds before lifting.'
const eccentric = 'Lower for a controlled 3 seconds before lifting.'
const half = 'Perform one full rep, then a half rep before counting one rep.'
const squeeze = 'Squeeze the working muscles for 2 seconds at the top.'
const ladders: Record<string, Step[]> = {
  'goblet-squat': [['2-Second Paused Goblet Squat', 'pause', pause], ['3-Second Eccentric Goblet Squat', 'eccentric', eccentric], ['1.5-Rep Goblet Squat', 'one-and-half', half]],
  'floor-press': [['2-Second Paused Dumbbell Floor Press', 'pause', 'Pause for 2 seconds with upper arms resting lightly on the floor.'], ['3-Second Eccentric Dumbbell Floor Press', 'eccentric', eccentric], ['1.5-Rep Dumbbell Floor Press', 'one-and-half', half]],
  'one-arm-row': [['2-Second Squeeze Dumbbell Row', 'squeeze', squeeze], ['3-Second Eccentric Dumbbell Row', 'eccentric', eccentric], ['1.5-Rep Dumbbell Row', 'one-and-half', half]],
  'romanian-deadlift': [['3-Second Eccentric Romanian Deadlift', 'eccentric', eccentric], ['Paused-Stretch Romanian Deadlift', 'pause', 'Pause for 2 seconds near the bottom while keeping your back neutral.'], ['1.5-Rep Romanian Deadlift', 'one-and-half', half]],
  'overhead-press': [['3-Second Eccentric Overhead Press', 'eccentric', eccentric], ['1.5-Rep Overhead Press', 'one-and-half', half]],
  'calf-raise-a': [['Paused Dumbbell Calf Raise', 'pause', 'Pause for 2 seconds at the top of each raise.', '12–20'], ['Single-Leg Dumbbell Calf Raise', 'single-leg', 'Balance on one leg and complete the same reps on each side.', '10–15'], ['Paused Single-Leg Dumbbell Calf Raise', 'pause', 'On one leg, pause for 2 seconds at the top of each raise.', '10–15']],
  'reverse-lunge': [['Paused Reverse Lunge', 'pause', pause], ['3-Second Eccentric Reverse Lunge', 'eccentric', eccentric], ['1.5-Rep Reverse Lunge', 'one-and-half', half]],
  'squeeze-press': [['Paused Squeeze Floor Press', 'pause', pause], ['3-Second Eccentric Squeeze Floor Press', 'eccentric', eccentric]],
  'bent-over-row': [['2-Second Squeeze Bent-Over Row', 'squeeze', squeeze], ['3-Second Eccentric Bent-Over Row', 'eccentric', eccentric], ['1.5-Rep Bent-Over Row', 'one-and-half', half]],
  'single-leg-rdl': [['3-Second Eccentric Single-Leg RDL', 'eccentric', eccentric], ['Paused Single-Leg RDL', 'pause', 'Pause for 2 seconds near the bottom while balancing on one leg.'], ['1.5-Rep Single-Leg RDL', 'one-and-half', half]],
  'lateral-raise': [['3-Second Eccentric Lateral Raise', 'eccentric', eccentric, '10–15'], ['1.5-Rep Lateral Raise', 'one-and-half', half, '10–15']],
  'hammer-curl': [['3-Second Eccentric Hammer Curl', 'eccentric', eccentric], ['1.5-Rep Hammer Curl', 'one-and-half', half]],
  'overhead-extension': [['3-Second Eccentric Triceps Extension', 'eccentric', eccentric], ['1.5-Rep Triceps Extension', 'one-and-half', half]],
  'dead-bug': [['2-Second Extended-Pause Dumbbell Dead Bug', 'pause', 'Hold the extended position for 2 seconds, keeping your lower back gently against the floor.']],
  'front-squat': [['2-Second Paused Front Squat', 'pause', pause], ['3-Second Eccentric Front Squat', 'eccentric', eccentric], ['1.5-Rep Front Squat', 'one-and-half', half]],
  'neutral-floor-press': [['Paused Neutral-Grip Floor Press', 'pause', pause], ['3-Second Eccentric Neutral-Grip Floor Press', 'eccentric', eccentric]],
  'pullover': [['3-Second Eccentric Dumbbell Pullover', 'eccentric', eccentric], ['Paused-Stretch Dumbbell Pullover', 'pause', 'Pause for 2 seconds in the stretched position without forcing your shoulder.']],
  'sumo-deadlift': [['3-Second Eccentric Sumo Deadlift', 'eccentric', eccentric], ['Paused Sumo Deadlift', 'pause', 'Pause for 2 seconds near the floor while keeping your back neutral.'], ['1.5-Rep Sumo Deadlift', 'one-and-half', half]],
  'reverse-fly': [['2-Second Squeeze Reverse Fly', 'squeeze', squeeze, '10–15'], ['3-Second Eccentric Reverse Fly', 'eccentric', eccentric, '10–15']],
  'alternating-curl': [['3-Second Eccentric Alternating Curl', 'eccentric', eccentric], ['1.5-Rep Alternating Curl', 'one-and-half', half]],
  'skull-crusher': [['3-Second Eccentric Skull Crusher', 'eccentric', eccentric], ['Paused Dumbbell Skull Crusher', 'pause', 'Pause for 2 seconds in the lowered position before extending.']],
  'calf-raise-c': [['Paused Dumbbell Calf Raise', 'pause', 'Pause for 2 seconds at the top of each raise.', '12–20'], ['Single-Leg Dumbbell Calf Raise', 'single-leg', 'Balance on one leg and complete the same reps on each side.', '10–15'], ['Paused Single-Leg Dumbbell Calf Raise', 'pause', 'On one leg, pause for 2 seconds at the top of each raise.', '10–15']],
}

const bases = workouts.flatMap((workout) => workout.exercises).filter((exercise, index, all) => all.findIndex((item) => item.id === exercise.id) === index)
export const exerciseFamilies: ExerciseFamily[] = bases.map((exercise) => ({ id: exercise.id, baseExerciseId: exercise.id,
  variantIds: [exercise.id, ...(ladders[exercise.id] ?? []).map((_, index) => `${exercise.id}-level-${index + 1}`)] }))
export const exerciseVariants: ExerciseVariant[] = bases.flatMap((exercise) => [
  { id: exercise.id, familyId: exercise.id, name: exercise.name, level: 0, repRange: exercise.repRange, modifier: 'base' as const, modifierCue: 'Use the standard movement and a controlled tempo.', unilateral: ['one-arm-row', 'reverse-lunge', 'single-leg-rdl', 'alternating-curl', 'dead-bug'].includes(exercise.id) },
  ...(ladders[exercise.id] ?? []).map(([name, modifier, modifierCue, repRange], index): ExerciseVariant => ({ id: `${exercise.id}-level-${index + 1}`, familyId: exercise.id, name, level: index + 1,
    repRange: repRange ?? (['calf-raise-a', 'calf-raise-c'].includes(exercise.id) ? '12–20' : ['lateral-raise', 'reverse-fly'].includes(exercise.id) ? '10–15' : '8–12'),
    modifier, modifierCue, unilateral: modifier === 'single-leg' || ['one-arm-row', 'reverse-lunge', 'single-leg-rdl', 'alternating-curl', 'dead-bug'].includes(exercise.id) })),
])

export function getExerciseFamily(exerciseId: string): ExerciseFamily | null { return exerciseFamilies.find((family) => family.id === exerciseId) ?? null }
export function getExerciseVariant(exerciseId: string, variantId = exerciseId): ExerciseVariant | null {
  return exerciseVariants.find((variant) => variant.familyId === exerciseId && variant.id === variantId) ?? null
}
export function getNextVariant(exerciseId: string, variantId: string): ExerciseVariant | null {
  const current = getExerciseVariant(exerciseId, variantId)
  return current ? getExerciseVariant(exerciseId, `${exerciseId}-level-${current.level + 1}`) : null
}
export function resolveExercise(base: Exercise, variantId = base.id): Exercise {
  const variant = getExerciseVariant(base.id, variantId) ?? getExerciseVariant(base.id)!
  return { ...base, variantId: variant.id, name: variant.name, repRange: variant.repRange }
}
export const historicalVariantId = (exercise: { exerciseId: string; variantId?: string }) => exercise.variantId ?? exercise.exerciseId
