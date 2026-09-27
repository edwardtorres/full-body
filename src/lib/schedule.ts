import { weekDays, type TrainingSchedule, type WeekDay } from '../types/profile'
import type { Workout } from '../types/training'

export function localWeekDay(date: Date): WeekDay {
  return weekDays[(date.getDay() + 6) % 7]
}

export function workoutForDay(schedule: TrainingSchedule, workouts: Workout[], day: WeekDay): Workout | null {
  const slot = schedule.slots.find((item) => item.day === day)
  return workouts.find((workout) => workout.id === slot?.workoutId) ?? null
}

export function todaysWorkout(schedule: TrainingSchedule, workouts: Workout[], date: Date): Workout | null {
  return workoutForDay(schedule, workouts, localWeekDay(date))
}

export function nextWorkout(schedule: TrainingSchedule, workouts: Workout[], date: Date): { workout: Workout; date: Date } | null {
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
    const workout = todaysWorkout(schedule, workouts, candidate)
    if (workout) return { workout, date: candidate }
  }
  return null
}
