import { getExerciseVariant } from '../data/exerciseVariants'
import type { VariantSelections } from './variants'

export const EXERCISE_VARIANTS_KEY = 'full-body:exercise-variants:v1'
export type VariantStorageIssue = 'unavailable' | 'corrupt' | 'unsupported-version' | 'write-failed' | null
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

export function createVariantRepository(storageFactory: () => StoragePort | null) {
  let futureVersion = false
  return {
    load(): { selections: VariantSelections; issue: VariantStorageIssue } {
      try {
        const raw = storageFactory()?.getItem(EXERCISE_VARIANTS_KEY)
        if (raw === null || raw === undefined) return { selections: {}, issue: raw === undefined ? 'unavailable' : null }
        let value: unknown
        try { value = JSON.parse(raw) } catch { return { selections: {}, issue: 'corrupt' } }
        if (!value || typeof value !== 'object' || Array.isArray(value)) return { selections: {}, issue: 'corrupt' }
        const data = value as Record<string, unknown>
        if (data.schemaVersion !== 1) { futureVersion = true; return { selections: {}, issue: 'unsupported-version' } }
        if (!data.selections || typeof data.selections !== 'object' || Array.isArray(data.selections)) return { selections: {}, issue: 'corrupt' }
        const values = Object.entries(data.selections)
        const selections = Object.fromEntries(values.filter(([id, variant]) => typeof variant === 'string' && getExerciseVariant(id, variant))) as VariantSelections
        return { selections, issue: values.length === Object.keys(selections).length ? null : 'corrupt' }
      } catch { return { selections: {}, issue: 'unavailable' } }
    },
    save(selections: VariantSelections): { ok: boolean; issue: VariantStorageIssue } {
      if (futureVersion) return { ok: false, issue: 'unsupported-version' }
      try {
        const storage = storageFactory()
        if (!storage) return { ok: false, issue: 'unavailable' }
        storage.setItem(EXERCISE_VARIANTS_KEY, JSON.stringify({ schemaVersion: 1, selections }))
        return { ok: true, issue: null }
      } catch { return { ok: false, issue: 'write-failed' } }
    },
  }
}

export const browserVariantRepository = createVariantRepository(() => window.localStorage)
