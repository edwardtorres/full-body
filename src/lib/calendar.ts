import { weekDays, type TrainingSchedule, type WeekDay } from '../types/profile'

const dayCode: Record<WeekDay, string> = { monday: 'MO', tuesday: 'TU', wednesday: 'WE', thursday: 'TH', friday: 'FR', saturday: 'SA', sunday: 'SU' }
const pad = (value: number) => String(value).padStart(2, '0')
const localStamp = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`
const utcStamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function nextScheduledDate(day: WeekDay, time: string, from: Date): Date {
  const [hour, minute] = time.split(':').map(Number)
  const weekday = (from.getDay() + 6) % 7
  const offset = (weekDays.indexOf(day) - weekday + 7) % 7
  const candidate = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset, hour, minute)
  if (candidate < from) candidate.setDate(candidate.getDate() + 7)
  return candidate
}

export function scheduleCalendarFile(schedule: TrainingSchedule, from: Date): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Full Body//Workout Schedule//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Full Body workouts']
  for (const [index, slot] of schedule.slots.entries()) {
    const start = nextScheduledDate(slot.day, slot.time, from)
    const title = `Full Body ${'ABC'[index]}`
    lines.push('BEGIN:VEVENT', `UID:${slot.workoutId}@fullbody.local`, `DTSTAMP:${utcStamp(from)}`, `DTSTART:${localStamp(start)}`, 'DURATION:PT60M', `RRULE:FREQ=WEEKLY;BYDAY=${dayCode[slot.day]}`, `SUMMARY:${title}`, 'DESCRIPTION:Your scheduled dumbbell workout.', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}
