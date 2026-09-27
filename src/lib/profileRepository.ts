import { benchmarkExerciseIds } from '../data/benchmark'
import { type BenchmarkResult, type OnboardingStep, type PersistedProfile } from '../types/profile'
import { defaultProfileState, normalizeSchedule } from './profile'

export const PROFILE_STORAGE_KEY = 'full-body:profile:v1'
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
export type StorageIssue = 'unavailable' | 'corrupt' | 'unsupported-version' | 'write-failed' | null

const steps: OnboardingStep[] = ['goal', 'equipment', 'schedule', 'intro', 'benchmark', 'summary', 'complete']
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isWeight = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 300

function validResult(value: unknown): value is BenchmarkResult {
  if (!isRecord(value)) return false
  return benchmarkExerciseIds.includes(value.exerciseId as (typeof benchmarkExerciseIds)[number])
    && isWeight(value.weight)
    && Number.isInteger(value.reps) && Number(value.reps) >= 1 && Number(value.reps) <= 100
    && value.targetRir === 2
    && typeof value.completedAt === 'string' && Number.isFinite(Date.parse(value.completedAt))
}

function validState(value: unknown): value is PersistedProfile {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.profile) || !isRecord(value.onboarding) || !isRecord(value.benchmarks)) return false
  const profile = value.profile
  const equipment = profile.equipment
  const schedule = profile.schedule
  const onboarding = value.onboarding
  if (profile.goal !== 'build-muscle' || !isRecord(equipment) || !isWeight(equipment.dumbbellWeight)
    || equipment.unit !== 'lb' || equipment.floorSpace !== true || !isRecord(schedule)
    || !normalizeSchedule(schedule)) return false
  if (typeof onboarding.completed !== 'boolean' || !steps.includes(onboarding.step as OnboardingStep)
    || !Number.isInteger(onboarding.benchmarkIndex) || Number(onboarding.benchmarkIndex) < 0 || Number(onboarding.benchmarkIndex) > 5
    || !Array.isArray(onboarding.draftBenchmarks) || onboarding.draftBenchmarks.length > 5
    || !onboarding.draftBenchmarks.every(validResult)) return false
  if (onboarding.completed && onboarding.step !== 'complete') return false
  if (!onboarding.completed && onboarding.step === 'complete') return false
  if (onboarding.step === 'benchmark' && Number(onboarding.benchmarkIndex) >= 5) return false
  if (onboarding.step === 'summary' && onboarding.draftBenchmarks.length !== 5) return false
  if (new Set(onboarding.draftBenchmarks.map((result: BenchmarkResult) => result.exerciseId)).size !== onboarding.draftBenchmarks.length) return false
  return Object.entries(value.benchmarks).every(([id, history]) =>
    benchmarkExerciseIds.includes(id as (typeof benchmarkExerciseIds)[number])
    && Array.isArray(history) && history.length > 0 && history.every((entry) => validResult(entry) && entry.exerciseId === id))
}

export function createProfileRepository(storageFactory: () => StoragePort | null) {
  let readOnlyFutureVersion = false
  return {
    load(): { state: PersistedProfile; issue: StorageIssue } {
      try {
        const storage = storageFactory()
        if (!storage) return { state: defaultProfileState(), issue: 'unavailable' }
        const raw = storage.getItem(PROFILE_STORAGE_KEY)
        if (raw === null) return { state: defaultProfileState(), issue: null }
        let parsed: unknown
        try { parsed = JSON.parse(raw) } catch { return { state: defaultProfileState(), issue: 'corrupt' } }
        if (isRecord(parsed) && parsed.schemaVersion !== 1) {
          readOnlyFutureVersion = true
          return { state: defaultProfileState(), issue: 'unsupported-version' }
        }
        if (!validState(parsed)) return { state: defaultProfileState(), issue: 'corrupt' }
        return { state: { ...parsed, profile: { ...parsed.profile, schedule: normalizeSchedule(parsed.profile.schedule)! } }, issue: null }
      } catch {
        return { state: defaultProfileState(), issue: 'unavailable' }
      }
    },
    save(state: PersistedProfile): { ok: boolean; issue: StorageIssue } {
      if (readOnlyFutureVersion) return { ok: false, issue: 'unsupported-version' }
      try {
        const storage = storageFactory()
        if (!storage) return { ok: false, issue: 'unavailable' }
        storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state))
        return { ok: true, issue: null }
      } catch {
        return { ok: false, issue: 'write-failed' }
      }
    },
  }
}

export const browserProfileRepository = createProfileRepository(() => window.localStorage)
