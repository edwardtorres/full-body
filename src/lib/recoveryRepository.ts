import { energyLevels, sorenessLevels, sleepQualities, recoveryDate, type RecoveryCheckIn } from './recovery'

export const RECOVERY_CHECKIN_KEY = 'full-body:recovery-checkin:v1'
export type RecoveryIssue = 'unavailable' | 'corrupt' | 'unsupported-version' | 'write-failed' | null
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

function validCheckIn(value: unknown): value is RecoveryCheckIn {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  const [year, month, day] = typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date.split('-').map(Number) : []
  return item.schemaVersion === 1 && typeof item.date === 'string' && year >= 100 && recoveryDate(new Date(year, month - 1, day)) === item.date
    && energyLevels.includes(item.energy as RecoveryCheckIn['energy'])
    && sorenessLevels.includes(item.soreness as RecoveryCheckIn['soreness'])
    && sleepQualities.includes(item.sleep as RecoveryCheckIn['sleep'])
}

export function createRecoveryRepository(storageFactory: () => StoragePort | null) {
  let futureVersion = false
  return {
    load(date: Date): { checkIn: RecoveryCheckIn | null; issue: RecoveryIssue } {
      try {
        const storage = storageFactory()
        if (!storage) return { checkIn: null, issue: 'unavailable' }
        const raw = storage.getItem(RECOVERY_CHECKIN_KEY)
        if (raw === null) return { checkIn: null, issue: null }
        let parsed: unknown
        try { parsed = JSON.parse(raw) } catch { return { checkIn: null, issue: 'corrupt' } }
        if (parsed && typeof parsed === 'object' && 'schemaVersion' in parsed && parsed.schemaVersion !== 1) {
          futureVersion = true
          return { checkIn: null, issue: 'unsupported-version' }
        }
        if (!validCheckIn(parsed)) return { checkIn: null, issue: 'corrupt' }
        return { checkIn: parsed.date === recoveryDate(date) ? parsed : null, issue: null }
      } catch { return { checkIn: null, issue: 'unavailable' } }
    },
    save(checkIn: RecoveryCheckIn): { ok: boolean; issue: RecoveryIssue } {
      if (futureVersion) return { ok: false, issue: 'unsupported-version' }
      if (!validCheckIn(checkIn)) return { ok: false, issue: 'corrupt' }
      try {
        const storage = storageFactory()
        if (!storage) return { ok: false, issue: 'unavailable' }
        storage.setItem(RECOVERY_CHECKIN_KEY, JSON.stringify(checkIn))
        return { ok: true, issue: null }
      } catch { return { ok: false, issue: 'write-failed' } }
    },
  }
}

export const browserRecoveryRepository = createRecoveryRepository(() => window.localStorage)
