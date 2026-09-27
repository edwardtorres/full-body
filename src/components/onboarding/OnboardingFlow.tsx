import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { benchmarkExercises } from '../../data/benchmark'
import { replaceScheduleDay } from '../../lib/profile'
import { weekDays, type PersistedProfile, type WeekDay } from '../../types/profile'
import { BenchmarkEntry } from '../benchmark/BenchmarkEntry'

interface Props {
  state: PersistedProfile
  onChange: (next: PersistedProfile) => void
  storageWarning: string | null
}

const labels: Record<WeekDay, string> = {
  monday: 'MON', tuesday: 'TUE', wednesday: 'WED', thursday: 'THU',
  friday: 'FRI', saturday: 'SAT', sunday: 'SUN',
}

export function OnboardingFlow({ state, onChange, storageWarning }: Props) {
  const [weightInput, setWeightInput] = useState(String(state.profile.equipment.dumbbellWeight))
  const [weightError, setWeightError] = useState('')
  const [replacing, setReplacing] = useState<WeekDay | null>(null)
  const step = state.onboarding.step
  const previousStep = useRef(step)
  useEffect(() => {
    if (previousStep.current === step) return
    previousStep.current = step
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('.flow-card h1')
      if (heading) { heading.tabIndex = -1; heading.focus() }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [step])
  const updateStep = (nextStep: typeof step) => onChange({ ...state, onboarding: { ...state.onboarding, step: nextStep } })
  const finish = (skip: boolean) => onChange({
    ...state,
    onboarding: { completed: true, step: 'complete', benchmarkIndex: 0, draftBenchmarks: [] },
    benchmarks: skip ? state.benchmarks : Object.fromEntries(state.onboarding.draftBenchmarks.map((result) => [result.exerciseId, [result]])),
  })
  const saveWeight = () => {
    const weight = Number(weightInput)
    if (!weightInput.trim() || !Number.isFinite(weight) || weight < 1 || weight > 300) {
      setWeightError('Enter a weight from 1 to 300 lb.'); return
    }
    setWeightError('')
    onChange({ ...state, profile: { ...state.profile, equipment: { ...state.profile.equipment, dumbbellWeight: weight } }, onboarding: { ...state.onboarding, step: 'schedule' } })
  }
  const changeWeight = (raw: string) => {
    setWeightInput(raw)
    setWeightError('')
    const weight = Number(raw)
    if (raw.trim() && Number.isFinite(weight) && weight >= 1 && weight <= 300) {
      onChange({ ...state, profile: { ...state.profile, equipment: { ...state.profile.equipment, dumbbellWeight: weight } } })
    }
  }
  const chooseDay = (day: WeekDay) => {
    if (state.profile.schedule.slots.some((slot) => slot.day === day)) { setReplacing(replacing === day ? null : day); return }
    if (!replacing) return
    onChange({ ...state, profile: { ...state.profile, schedule: replaceScheduleDay(state.profile.schedule, replacing, day) } })
    setReplacing(null)
  }
  const saveBenchmark = (result: (typeof state.onboarding.draftBenchmarks)[number]) => {
    const drafts = [...state.onboarding.draftBenchmarks.filter((item) => item.exerciseId !== result.exerciseId), result]
    const nextIndex = state.onboarding.benchmarkIndex + 1
    onChange({ ...state, onboarding: { ...state.onboarding, draftBenchmarks: drafts, benchmarkIndex: nextIndex, step: nextIndex === 5 ? 'summary' : 'benchmark' } })
  }

  return <div className="onboarding-shell">
    <header className="flow-header"><div className="brand"><span className="brand-mark" aria-hidden="true"><span /></span><span>FULL<span className="brand-divider">/</span>BODY</span></div><span>SETUP</span></header>
    <main className="flow-stage">
      <div className="flow-orbit" aria-hidden="true" />
      <div className="flow-card">
        {step === 'goal' && <>
          <div className="flow-topline"><span>01 / 04</span><span>YOUR GOAL</span></div>
          <p className="flow-eyebrow">LET'S BEGIN</p>
          <h1>What are you training for?</h1>
          <div className="goal-option" role="group" aria-label="Training goal"><div><strong>BUILD MUSCLE</strong><small>Focused full-body training</small></div><Check size={20} aria-label="Selected" /></div>
          <p className="flow-muted">This is the supported goal for now.</p>
          <div className="flow-actions"><button className="flow-primary" type="button" onClick={() => updateStep('equipment')}>CONTINUE <ArrowRight size={18} /></button></div>
        </>}

        {step === 'equipment' && <>
          <div className="flow-topline"><span>02 / 04</span><span>EQUIPMENT</span></div>
          <p className="flow-eyebrow">YOUR SETUP</p>
          <h1>Your dumbbells</h1>
          <label className="weight-label" htmlFor="dumbbell-weight">AVAILABLE WEIGHT</label>
          <div className="weight-input"><input id="dumbbell-weight" type="number" inputMode="decimal" min="1" max="300" step="any" value={weightInput} onChange={(event) => changeWeight(event.target.value)} aria-invalid={Boolean(weightError)} aria-describedby={weightError ? 'weight-error' : undefined} /><span>lb</span></div>
          {weightError && <p id="weight-error" className="field-error" role="alert">{weightError}</p>}
          <div className="equipment-line"><span>Floor space</span><Check size={18} aria-label="Available" /></div>
          <div className="flow-actions"><button type="button" className="flow-text-button" onClick={() => updateStep('goal')}><ArrowLeft size={16} /> Back</button><button type="button" className="flow-primary" onClick={saveWeight}>CONTINUE <ArrowRight size={18} /></button></div>
        </>}

        {step === 'schedule' && <>
          <div className="flow-topline"><span>03 / 04</span><span>SCHEDULE</span></div>
          <p className="flow-eyebrow">THREE SESSIONS / WEEK</p>
          <h1>Training days</h1>
          <p className="flow-muted">Choose three days. To change one, select it, then select its replacement.</p>
          <div className="day-picker" role="group" aria-label="Training days">
            {weekDays.map((day) => <button key={day} type="button" className={`${state.profile.schedule.slots.some((slot) => slot.day === day) ? 'selected' : ''} ${replacing === day ? 'replacing' : ''}`} onClick={() => chooseDay(day)} aria-pressed={state.profile.schedule.slots.some((slot) => slot.day === day)} aria-label={`${day}, ${state.profile.schedule.slots.some((slot) => slot.day === day) ? 'selected' : 'not selected'}`}><span>{labels[day]}</span>{state.profile.schedule.slots.some((slot) => slot.day === day) && <Check size={15} />}</button>)}
          </div>
          <p className="schedule-hint" aria-live="polite">{replacing ? `Replace ${replacing} with another day` : '3 of 3 days selected'}</p>
          <div className="flow-actions"><button type="button" className="flow-text-button" onClick={() => updateStep('equipment')}><ArrowLeft size={16} /> Back</button><button type="button" className="flow-primary" onClick={() => updateStep('intro')}>CONTINUE <ArrowRight size={18} /></button></div>
        </>}

        {step === 'intro' && <>
          <div className="flow-topline"><span>04 / 04</span><span>BENCHMARK</span></div>
          <p className="flow-eyebrow">YOUR STARTING POINT</p>
          <h1>Five movements.<br />One starting point.</h1>
          <p className="flow-lead">We'll use five movements to establish your starting point.</p>
          <p className="flow-muted">Perform clean reps until you feel you have about 2 good reps left. This is not a one-rep-max test.</p>
          <div className="flow-actions stacked"><button type="button" className="flow-primary" onClick={() => updateStep('benchmark')}>START BENCHMARK <ArrowRight size={18} /></button><button type="button" className="flow-text-button" onClick={() => finish(true)}>SKIP FOR NOW</button></div>
        </>}

        {step === 'benchmark' && <BenchmarkEntry key={state.onboarding.benchmarkIndex} exercise={benchmarkExercises[state.onboarding.benchmarkIndex]} index={state.onboarding.benchmarkIndex} weight={state.profile.equipment.dumbbellWeight} onSave={saveBenchmark} onBack={() => state.onboarding.benchmarkIndex === 0 ? updateStep('intro') : onChange({ ...state, onboarding: { ...state.onboarding, benchmarkIndex: state.onboarding.benchmarkIndex - 1 } })} />}

        {step === 'summary' && <>
          <div className="flow-topline"><span>05 / 05 COMPLETE</span><span>BENCHMARK</span></div>
          <p className="flow-eyebrow">READY TO TRAIN</p>
          <h1>Your starting point</h1>
          <div className="benchmark-summary">{benchmarkExercises.map((exercise) => {
            const result = state.onboarding.draftBenchmarks.find((item) => item.exerciseId === exercise.id)
            return <div key={exercise.id}><span>{exercise.name}</span><strong>{result?.weight} lb × {result?.reps}</strong></div>
          })}</div>
          <p className="flow-muted">These results are for comparison with your own future performance.</p>
          <div className="flow-actions"><button className="flow-primary" type="button" onClick={() => finish(false)}>START MY PROGRAM <ArrowRight size={18} /></button></div>
        </>}
      </div>
      {storageWarning && <p className="storage-warning" role="status">{storageWarning}</p>}
    </main>
  </div>
}
