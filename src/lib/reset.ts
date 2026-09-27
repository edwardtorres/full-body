import { PROFILE_STORAGE_KEY } from './profileRepository'
import { ACTIVE_SESSION_KEY } from './activeWorkoutRepository'
import { WORKOUT_HISTORY_KEY } from './workoutHistoryRepository'
import { EXERCISE_VARIANTS_KEY } from './variantRepository'
import { RECOVERY_CHECKIN_KEY } from './recoveryRepository'

export const APP_STORAGE_KEYS = [PROFILE_STORAGE_KEY, ACTIVE_SESSION_KEY, WORKOUT_HISTORY_KEY, EXERCISE_VARIANTS_KEY, RECOVERY_CHECKIN_KEY] as const

export function resetAppData(storage: Pick<Storage, 'removeItem'>): boolean {
  try {
    APP_STORAGE_KEYS.forEach((key) => storage.removeItem(key))
    return true
  } catch {
    return false
  }
}
