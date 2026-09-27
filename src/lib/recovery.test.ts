import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { workouts } from '../data/workouts'
import { MenuDrawer } from '../components/navigation/MenuDrawer'
import { getNextExerciseTargets } from './progression'
import { getCurrentPerfectWeekStreak } from './consistency'
import { getAchievementStates } from './achievements'
import { RECOVERY_CHECKIN_KEY, createRecoveryRepository } from './recoveryRepository'
import { recoveryCheckInLabel, recoverySummary, type RecoveryCheckIn } from './recovery'
import { APP_STORAGE_KEYS, resetAppData } from './reset'

const today = new Date(2026, 8, 25, 12)
const checkIn: RecoveryCheckIn = { schemaVersion: 1, date: '2026-09-25', energy: 'normal', soreness: 'mild', sleep: 'good' }
const memory = () => {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}

describe('optional recovery check-in', () => {
  it('starts empty and saves one valid check-in for the local date', () => {
    const storage = memory()
    const repository = createRecoveryRepository(() => storage)
    expect(repository.load(today)).toEqual({ checkIn: null, issue: null })
    expect(repository.save(checkIn)).toEqual({ ok: true, issue: null })
    expect(createRecoveryRepository(() => storage).load(today).checkIn).toEqual(checkIn)
    expect(recoveryCheckInLabel(checkIn)).toBe('Normal energy · Mild soreness · Good sleep')
  })

  it('recovers safely from corrupt and unsupported saved values', () => {
    const storage = memory()
    storage.values.set(RECOVERY_CHECKIN_KEY, '{broken')
    expect(createRecoveryRepository(() => storage).load(today)).toEqual({ checkIn: null, issue: 'corrupt' })
    storage.values.set(RECOVERY_CHECKIN_KEY, JSON.stringify({ ...checkIn, date: '2026-13-99' }))
    expect(createRecoveryRepository(() => storage).load(today).issue).toBe('corrupt')
    storage.values.set(RECOVERY_CHECKIN_KEY, JSON.stringify({ ...checkIn, schemaVersion: 2 }))
    const repository = createRecoveryRepository(() => storage)
    expect(repository.load(today).issue).toBe('unsupported-version')
    expect(repository.save(checkIn).ok).toBe(false)
  })

  it('replaces yesterday rather than retaining a health history', () => {
    const storage = memory()
    const repository = createRecoveryRepository(() => storage)
    repository.save({ ...checkIn, date: '2026-09-24' })
    expect(repository.load(today).checkIn).toBeNull()
    expect(repository.save(checkIn).ok).toBe(true)
    expect(JSON.parse(storage.values.get(RECOVERY_CHECKIN_KEY)!).date).toBe('2026-09-25')
    expect(storage.values.size).toBe(1)
  })

  it('reports local save failures without claiming the check-in was saved', () => {
    expect(createRecoveryRepository(() => null).save(checkIn)).toEqual({ ok: false, issue: 'unavailable' })
    const blocked = createRecoveryRepository(() => ({ getItem: () => null, setItem: () => { throw new Error('blocked') } }))
    expect(blocked.save(checkIn)).toEqual({ ok: false, issue: 'write-failed' })
  })

  it('returns cautious text without any numeric recovery score', () => {
    expect(recoverySummary(checkIn).title).toBe('TRAIN AS PLANNED')
    expect(recoverySummary({ ...checkIn, energy: 'low', soreness: 'moderate', sleep: 'poor' }).title).toBe('TAKE IT EASIER TODAY')
    expect(recoverySummary({ ...checkIn, soreness: 'high' }).title).toBe('RECOVERY DAY MAY BE APPROPRIATE')
    expect(JSON.stringify(recoverySummary(checkIn))).not.toMatch(/score|percentage|%/i)
  })

  it('does not affect targets, progression, weekly streaks, or achievements', () => {
    const exercise = workouts[0].exercises[0]
    const before = { target: getNextExerciseTargets(exercise, [], {}, 20), streak: getCurrentPerfectWeekStreak([], today), achievements: getAchievementStates([], {}) }
    const storage = memory()
    createRecoveryRepository(() => storage).save({ ...checkIn, soreness: 'high' })
    const after = { target: getNextExerciseTargets(exercise, [], {}, 20), streak: getCurrentPerfectWeekStreak([], today), achievements: getAchievementStates([], {}) }
    expect(after).toEqual(before)
  })

  it('is included in Reset All Data', () => {
    const storage = memory()
    APP_STORAGE_KEYS.forEach((key) => storage.values.set(key, 'saved'))
    expect(resetAppData(storage)).toBe(true)
    expect(storage.values.has(RECOVERY_CHECKIN_KEY)).toBe(false)
  })

  it('makes Health & Recovery an active menu destination', () => {
    const html = renderToStaticMarkup(createElement(MenuDrawer, { open: true, onClose: () => {}, onNavigate: () => {}, onReset: () => true, currentPage: 'dashboard' }))
    expect(html).toContain('Health &amp; Recovery')
    expect(html).not.toContain('UPCOMING')
  })
})
