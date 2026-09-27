import { describe, expect, it } from 'vitest'
import { workouts } from '../data/workouts'
import { exerciseGuides } from '../data/exerciseGuides'
import { defaultProfileState } from './profile'
import { nextScheduledDate, scheduleCalendarFile } from './calendar'
import { APP_STORAGE_KEYS, resetAppData } from './reset'

describe('workout calendar export', () => {
  it('keeps weekly local times and exports three recurring events', () => {
    const schedule = defaultProfileState().profile.schedule
    schedule.slots[0].time = '09:30'
    const file = scheduleCalendarFile(schedule, new Date(2026, 8, 24, 8, 0))
    expect(file.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0')).toBe(true)
    expect(file.match(/BEGIN:VEVENT/g)).toHaveLength(3)
    expect(file).toContain('DTSTART:20260928T093000')
    expect(file).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO')
    expect(file).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE')
    expect(file).toContain('RRULE:FREQ=WEEKLY;BYDAY=FR')
    expect(file).toContain('DURATION:PT60M')
    expect(file.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('uses next week if today’s scheduled time has already passed', () => {
    expect(nextScheduledDate('monday', '09:00', new Date(2026, 8, 21, 10)).getDate()).toBe(28)
    expect(nextScheduledDate('monday', '09:00', new Date(2026, 8, 21, 8)).getDate()).toBe(21)
  })

  it('exports all three named weekly events with their configured floating local times', () => {
    const schedule = defaultProfileState().profile.schedule
    schedule.slots[0].day = 'monday'
    schedule.slots[0].time = '09:00'
    schedule.slots[1].day = 'wednesday'
    schedule.slots[1].time = '17:45'
    schedule.slots[2].day = 'friday'
    schedule.slots[2].time = '06:15'
    const file = scheduleCalendarFile(schedule, new Date(2026, 8, 24, 8, 0))
    const events = file.split('BEGIN:VEVENT\r\n').slice(1).map((part) => part.split('END:VEVENT\r\n')[0])
    expect(events).toHaveLength(3)
    expect(file).not.toMatch(/(?<!\r)\n/)
    for (const [index, title, day, time] of [[0, 'Full Body A', 'MO', '20260928T090000'], [1, 'Full Body B', 'WE', '20260930T174500'], [2, 'Full Body C', 'FR', '20260925T061500']] as const) {
      expect(events[index]).toContain(`SUMMARY:${title}\r\n`)
      expect(events[index]).toContain(`RRULE:FREQ=WEEKLY;BYDAY=${day}\r\n`)
      expect(events[index]).toContain(`DTSTART:${time}\r\n`)
      expect(events[index]).toContain('DURATION:PT60M\r\n')
      expect(events[index]).toMatch(/UID:[^\r\n]+@fullbody\.local\r\n/)
      expect(events[index]).toMatch(/DTSTAMP:\d{8}T\d{6}Z\r\n/)
    }
    expect(new Set(events.map((event) => event.match(/UID:([^\r\n]+)/)?.[1])).size).toBe(3)
  })
})

describe('exercise guides and global reset', () => {
  it('has distinct guidance for every scheduled exercise', () => {
    const ids = new Set(workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.id)))
    expect([...ids].filter((id) => !exerciseGuides[id])).toEqual([])
    expect([...ids].every((id) => Boolean(exerciseGuides[id].setup && exerciseGuides[id].movement))).toBe(true)
  })

  it('removes the Full Body storage keys', () => {
    const values = new Map<string, string>(APP_STORAGE_KEYS.map((key) => [key, 'saved']))
    values.set('other-app', 'keep')
    expect(resetAppData({ removeItem: (key) => { values.delete(key) } })).toBe(true)
    expect([...values.keys()]).toEqual(['other-app'])
  })
})
