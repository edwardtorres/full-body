import { localDateKey } from './consistency'

export type EnergyLevel = 'low' | 'normal' | 'high'
export type SorenessLevel = 'none' | 'mild' | 'moderate' | 'high'
export type SleepQuality = 'poor' | 'okay' | 'good'

export interface RecoveryCheckIn {
  schemaVersion: 1
  date: string
  energy: EnergyLevel
  soreness: SorenessLevel
  sleep: SleepQuality
}

export const energyLevels: EnergyLevel[] = ['low', 'normal', 'high']
export const sorenessLevels: SorenessLevel[] = ['none', 'mild', 'moderate', 'high']
export const sleepQualities: SleepQuality[] = ['poor', 'okay', 'good']

export function recoveryDate(date: Date): string { return localDateKey(date) }

export function recoverySummary(checkIn: RecoveryCheckIn): { title: string; message: string } {
  if (checkIn.soreness === 'high') return {
    title: 'RECOVERY DAY MAY BE APPROPRIATE',
    message: 'High soreness can be a reason to reduce training stress. If discomfort is sharp, unusual, or worsening, stop and consider guidance from a qualified healthcare professional.',
  }
  if (checkIn.energy === 'low' || checkIn.soreness === 'moderate' || checkIn.sleep === 'poor') return {
    title: 'TAKE IT EASIER TODAY',
    message: 'Consider keeping your targets conservative and prioritizing controlled technique. You can choose to rest.',
  }
  return {
    title: 'TRAIN AS PLANNED',
    message: 'Your check-in does not suggest a change to your plan. Pay attention to how you feel as you train.',
  }
}

export function recoveryCheckInLabel(checkIn: RecoveryCheckIn): string {
  const label = (value: string) => value[0].toUpperCase() + value.slice(1)
  return `${label(checkIn.energy)} energy · ${label(checkIn.soreness)} soreness · ${label(checkIn.sleep)} sleep`
}
