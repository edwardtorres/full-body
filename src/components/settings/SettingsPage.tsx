import { useState } from 'react'
import { SecondaryPageHeader } from '../shared/SecondaryPageHeader'
import type { PersistedProfile } from '../../types/profile'
import { workouts } from '../../data/workouts'
import { exerciseFamilies, getExerciseVariant } from '../../data/exerciseVariants'
import { getCurrentVariant, getUnlockedVariants, type VariantSelections } from '../../lib/variants'
import type { WorkoutHistoryEntry } from '../../types/training'

interface Props {
  state: PersistedProfile
  onSave: (state: PersistedProfile) => void
  onBack: () => void
  storageWarning: string | null
  variantWarning: string | null
  history: WorkoutHistoryEntry[]
  selections: VariantSelections
  onSelectVariant: (exerciseId: string, variantId: string) => boolean
}

export function SettingsPage({ state, onSave, onBack, storageWarning, variantWarning, history, selections, onSelectVariant }: Props) {
  const [weightInput, setWeightInput] = useState(String(state.profile.equipment.dumbbellWeight))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [variantNotice, setVariantNotice] = useState('')
  const save = () => {
    const weight = Number(weightInput)
    if (!weightInput.trim() || !Number.isFinite(weight) || weight < 1 || weight > 300) {
      setError('Enter a weight from 1 to 300 lb.')
      setSaved(false)
      return
    }
    setError('')
    onSave({ ...state, profile: { ...state.profile, equipment: { ...state.profile.equipment, dumbbellWeight: weight } } })
    setSaved(true)
  }
  return <div className="settings-shell"><SecondaryPageHeader title="Settings" onBack={onBack} />
    <main className="settings-main"><span className="small-label">EQUIPMENT</span><h1>Settings</h1><section aria-labelledby="settings-weight-heading"><h2 id="settings-weight-heading">Your dumbbells</h2><label htmlFor="settings-weight">WEIGHT PER DUMBBELL</label><div className="settings-weight-row"><input id="settings-weight" type="number" inputMode="decimal" min="1" max="300" step="any" value={weightInput} onChange={(event) => { setWeightInput(event.target.value); setError(''); setSaved(false) }} aria-invalid={Boolean(error)} aria-describedby={error ? 'settings-error' : undefined} /><span>lb</span></div>
      {error && <p id="settings-error" className="field-error" role="alert">{error}</p>}
      <p>New workout targets use completed sessions at this weight. Earlier workouts keep their recorded weight.</p>
      <button type="button" className="start-button" onClick={save}>SAVE WEIGHT</button>
      {saved && !storageWarning && <p role="status" className="settings-saved">Weight saved.</p>}
      {storageWarning && <p role="status" className="storage-warning">{storageWarning}</p>}
    </section>
    <section className="difficulty-settings" aria-labelledby="difficulty-settings-heading"><span className="small-label">EXERCISE DIFFICULTY</span><h2 id="difficulty-settings-heading">Your variations</h2><p>Choose an unlocked movement for future workouts. A workout already in progress keeps its starting variations.</p>
      <div className="difficulty-families">{exerciseFamilies.filter((family) => family.variantIds.length > 1).map((family) => {
        const base = workouts.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === family.baseExerciseId)!
        const current = getCurrentVariant(base, selections)
        const unlocked = new Set(getUnlockedVariants(history, base).map((variant) => variant.id))
        const slotLabel = base.id.startsWith('calf-raise-') ? ` · ${workouts.find((item) => item.exercises.some((exercise) => exercise.id === base.id))?.name}` : ''
        return <details key={family.id}><summary><span>{base.name}{slotLabel}</span><small>{current.name} · DIFFICULTY {current.level + 1} / {family.variantIds.length}</small></summary><div>{family.variantIds.map((id) => {
          const variant = getExerciseVariant(base.id, id)!
          const available = unlocked.has(id)
          const selected = current.id === id
          return <button key={id} type="button" disabled={!available} aria-pressed={selected} onClick={() => { if (onSelectVariant(base.id, id)) setVariantNotice(`${variant.name} selected for future workouts.`) }}><span>{variant.name}</span><small>{selected ? 'CURRENT' : available ? 'UNLOCKED' : 'LOCKED'} · {variant.repRange} reps</small></button>
        })}</div></details>
      })}</div>{variantNotice && <p role="status" className="settings-saved">{variantNotice}</p>}{variantWarning && <p role="status" className="storage-warning">{variantWarning}</p>}
    </section></main></div>
}
