import { useEffect, useState } from 'react'
import { SecondaryPageHeader } from '../shared/SecondaryPageHeader'
import { energyLevels, recoveryCheckInLabel, recoveryDate, recoverySummary, sleepQualities, sorenessLevels, type EnergyLevel, type RecoveryCheckIn, type SleepQuality, type SorenessLevel } from '../../lib/recovery'

interface Props {
  today: Date
  checkIn: RecoveryCheckIn | null
  warning: string | null
  onSave: (checkIn: RecoveryCheckIn) => boolean
  onBack: () => void
}

function titleCase(value: string) { return value[0].toUpperCase() + value.slice(1) }

function ChoiceGroup<T extends string>({ title, choices, value, onChange }: { title: string; choices: T[]; value: T | null; onChange: (next: T) => void }) {
  return <fieldset className="recovery-choice-group"><legend>{title}</legend><div>{choices.map((choice) => <label key={choice} className={value === choice ? 'selected' : ''}><input type="radio" name={title} value={choice} checked={value === choice} onChange={() => onChange(choice)} /><span>{titleCase(choice)}</span></label>)}</div></fieldset>
}

export function RecoveryPage({ today, checkIn, warning, onSave, onBack }: Props) {
  const [energy, setEnergy] = useState<EnergyLevel | null>(checkIn?.energy ?? null)
  const [soreness, setSoreness] = useState<SorenessLevel | null>(checkIn?.soreness ?? null)
  const [sleep, setSleep] = useState<SleepQuality | null>(checkIn?.sleep ?? null)
  const [saved, setSaved] = useState(false)
  const day = recoveryDate(today)
  useEffect(() => {
    setEnergy(checkIn?.energy ?? null)
    setSoreness(checkIn?.soreness ?? null)
    setSleep(checkIn?.sleep ?? null)
    setSaved(false)
  }, [day])
  const active = checkIn?.date === day ? checkIn : null
  const summary = active ? recoverySummary(active) : null
  const save = () => {
    if (!energy || !soreness || !sleep) return
    setSaved(onSave({ schemaVersion: 1, date: day, energy, soreness, sleep }))
  }

  return <div className="recovery-shell">
    <SecondaryPageHeader title="Health & Recovery" onBack={onBack} />
    <main className="recovery-main" id="secondary-page-main" tabIndex={-1}>
      <div className="recovery-intro"><span className="small-label">TRAINING SUPPORT</span><h1>Health & Recovery</h1><p>Simple ways to prepare, reflect, and make room for rest. Your workout plan stays in your hands.</p></div>

      <section className="recovery-today" aria-labelledby="recovery-today-heading"><div className="recovery-section-title"><span className="small-label">TODAY · {today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</span><h2 id="recovery-today-heading">A quick check-in</h2></div>
        <p>Optional and private to this browser. Choose how you feel before training, or skip it.</p>
        <div className="recovery-choices">
          <ChoiceGroup title="ENERGY" choices={energyLevels} value={energy} onChange={(value) => { setEnergy(value); setSaved(false) }} />
          <ChoiceGroup title="MUSCLE SORENESS" choices={sorenessLevels} value={soreness} onChange={(value) => { setSoreness(value); setSaved(false) }} />
          <ChoiceGroup title="SLEEP" choices={sleepQualities} value={sleep} onChange={(value) => { setSleep(value); setSaved(false) }} />
        </div>
        <div className="recovery-save-row"><button type="button" className="recovery-save" disabled={!energy || !soreness || !sleep} onClick={save}>{active ? 'UPDATE CHECK-IN' : 'SAVE CHECK-IN'}</button><small>No score. No automatic workout changes.</small></div>
        {saved && <p role="status" className="recovery-saved">Check-in saved for today.</p>}
        {warning && <p role="alert" className="storage-warning">{warning}</p>}
        {active && summary && <div className="recovery-reflection" role="status"><span className="small-label">YOUR REFLECTION</span><p>{recoveryCheckInLabel(active)}</p><h3>{summary.title}</h3><p>{summary.message}</p></div>}
      </section>

      <section className="recovery-section" aria-labelledby="recovery-warmup-heading"><div className="recovery-section-title"><span className="small-label">WARM-UP · ABOUT 5–8 MINUTES</span><h2 id="recovery-warmup-heading">Ease into your first set</h2></div>
        <ol className="recovery-steps"><li><strong>Light movement <small>2–3 MIN</small></strong><p>March in place or move easily without weights.</p></li><li><strong>Dynamic movement <small>2–3 MIN</small></strong><p>Try arm circles, controlled hip hinges, bodyweight squats, or gentle lunges.</p></li><li><strong>Practice the movement</strong><p>Before a difficult working set, take a few controlled practice repetitions.</p></li></ol>
      </section>

      <section className="recovery-section" aria-labelledby="recovery-between-heading"><div className="recovery-section-title"><span className="small-label">BETWEEN WORKOUTS</span><h2 id="recovery-between-heading">Keep recovery ordinary</h2></div>
        <div className="recovery-facts"><article><h3>SLEEP</h3><p>A consistent sleep schedule can help you feel prepared.</p></article><article><h3>HYDRATION</h3><p>Drink normally throughout the day and around training.</p></article><article><h3>FOOD</h3><p>Regular meals with adequate protein and overall nutrition support training.</p></article><article><h3>REST DAYS</h3><p>Rest days are part of the program. Light everyday movement can be useful when comfortable.</p></article></div>
      </section>

      <section className="recovery-section" aria-labelledby="recovery-soreness-heading"><div className="recovery-section-title"><span className="small-label">SORENESS</span><h2 id="recovery-soreness-heading">Adjust to how you feel</h2></div>
        <div className="recovery-soreness-list"><article><h3>MILD MUSCLE SORENESS</h3><p>Often compatible with normal activity when movement feels comfortable.</p></article><article><h3>MODERATE SORENESS</h3><p>Consider reducing effort, keeping targets conservative, or training another day.</p></article><article><h3>HIGH OR UNUSUAL PAIN</h3><p>Do not push through sharp, sudden, severe, or worsening pain.</p></article></div>
      </section>

      <section className="recovery-section recovery-stop" aria-labelledby="recovery-stop-heading"><div className="recovery-section-title"><span className="small-label">WHEN TO STOP</span><h2 id="recovery-stop-heading">Pause the set if needed</h2></div><ul><li>Technique breaks down significantly.</li><li>You feel sharp or unusual pain.</li><li>You feel dizzy or unwell.</li><li>You cannot control the dumbbells safely.</li></ul><p>Persistent or concerning pain may warrant evaluation by a qualified healthcare professional. This page offers general training guidance, not a diagnosis.</p></section>
      <details className="recovery-sources"><summary>Guidance sources</summary><p><a href="https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/warm-up-cool-down" target="_blank" rel="noreferrer">American Heart Association · Warm Up, Cool Down</a> · <a href="https://www.cdc.gov/sleep/about/" target="_blank" rel="noreferrer">CDC · About Sleep</a> · <a href="https://www.newcastle-hospitals.nhs.uk/services/cancer-services-and-support/prehabilitation-helping-you-get-ready-for-your-treatment/exercise-and-moving-your-body/" target="_blank" rel="noreferrer">Newcastle Hospitals NHS · Exercise and moving your body</a></p></details>
    </main>
  </div>
}
