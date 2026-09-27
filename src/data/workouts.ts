import type { Exercise, Workout } from '../types/training'

const exercise = (
  id: string,
  name: string,
  primaryMuscles: Exercise['primaryMuscles'],
  secondaryMuscles: Exercise['secondaryMuscles'],
  movementPattern: Exercise['movementPattern'],
  repRange = '8–12',
  dumbbellCount: Exercise['dumbbellCount'] = 1,
): Exercise => ({ id, name, primaryMuscles, secondaryMuscles, movementPattern, defaultSets: 3, repRange, dumbbellCount })

export const workouts: Workout[] = [
  {
    id: 'full-body-a', day: 'monday', name: 'Full Body A', exercises: [
      exercise('goblet-squat', 'Goblet Squat', ['quadriceps', 'glutes'], ['abs', 'hamstrings'], 'squat'),
      exercise('floor-press', 'Dumbbell Floor Press', ['chest', 'triceps'], ['shoulders'], 'push', '8–15'),
      exercise('one-arm-row', 'One-Arm Dumbbell Row', ['lats', 'upperBack'], ['biceps'], 'pull'),
      exercise('romanian-deadlift', 'Dumbbell Romanian Deadlift', ['hamstrings', 'glutes'], ['upperBack', 'abs'], 'hinge'),
      exercise('overhead-press', 'Standing Dumbbell Overhead Press', ['shoulders', 'triceps'], ['abs'], 'push'),
      exercise('calf-raise-a', 'Dumbbell Calf Raise', ['calves'], [], 'isolation', '12–20'),
      exercise('suitcase-march-a', 'Suitcase March', ['abs'], ['shoulders', 'upperBack'], 'carry', '30–45 sec'),
    ],
  },
  {
    id: 'full-body-b', day: 'wednesday', name: 'Full Body B', exercises: [
      exercise('reverse-lunge', 'Dumbbell Reverse Lunge', ['quadriceps', 'glutes'], ['hamstrings', 'abs'], 'lunge'),
      exercise('squeeze-press', 'Dumbbell Squeeze Floor Press', ['chest', 'triceps'], ['shoulders'], 'push'),
      exercise('bent-over-row', 'Bent-Over Dumbbell Row', ['upperBack', 'lats'], ['biceps', 'hamstrings'], 'pull'),
      exercise('single-leg-rdl', 'Single-Leg Dumbbell Romanian Deadlift', ['hamstrings', 'glutes'], ['abs'], 'hinge'),
      exercise('lateral-raise', 'Dumbbell Lateral Raise', ['shoulders'], [], 'isolation', '10–15'),
      exercise('hammer-curl', 'Hammer Curl', ['biceps'], [], 'isolation'),
      exercise('overhead-extension', 'Overhead Dumbbell Triceps Extension', ['triceps'], ['shoulders'], 'isolation'),
      exercise('dead-bug', 'Dumbbell Dead Bug', ['abs'], [], 'core', '8–12 / side'),
    ],
  },
  {
    id: 'full-body-c', day: 'friday', name: 'Full Body C', exercises: [
      exercise('front-squat', 'Double-Dumbbell Front Squat', ['quadriceps', 'glutes'], ['abs'], 'squat', '8–12', 2),
      exercise('neutral-floor-press', 'Neutral-Grip Dumbbell Floor Press', ['chest', 'triceps'], ['shoulders'], 'push'),
      exercise('pullover', 'Dumbbell Pullover', ['lats', 'chest'], ['triceps'], 'pull'),
      exercise('sumo-deadlift', 'Dumbbell Sumo Deadlift', ['glutes', 'hamstrings'], ['quadriceps', 'upperBack'], 'hinge'),
      exercise('reverse-fly', 'Bent-Over Reverse Fly', ['upperBack', 'shoulders'], [], 'isolation', '10–15'),
      exercise('alternating-curl', 'Alternating Dumbbell Curl', ['biceps'], [], 'isolation'),
      exercise('skull-crusher', 'Dumbbell Skull Crusher', ['triceps'], [], 'isolation'),
      exercise('calf-raise-c', 'Dumbbell Calf Raise', ['calves'], [], 'isolation', '12–20'),
      exercise('suitcase-march-c', 'Suitcase March', ['abs'], ['shoulders', 'upperBack'], 'carry', '30–45 sec'),
    ],
  },
]
