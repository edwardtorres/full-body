import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react'
import type { BodyView } from '../anatomy/CameraControls'
import { muscleInfo } from '../../data/muscles'
import { allExercisesResolved, completeSet, completedMusclesForSession, editLoggedSet, exerciseUnit, initialExerciseTarget, isUnilateral, jumpToExercise, remainingRestSeconds, sessionCounts, sessionSummary, skipExercise } from '../../lib/activeWorkout'
import { getNextExerciseTargets, targetReason } from '../../lib/progression'
import { historyEntrySummary } from '../../lib/workoutHistory'
import { getWorkoutCelebrations } from '../../lib/achievements'
import { getExerciseFamily, getNextVariant, resolveExercise } from '../../data/exerciseVariants'
import { getVariantInitialTargets, isVariationUpgradeReady } from '../../lib/variants'
import type { BenchmarkHistory } from '../../types/profile'
import type { ActiveWorkoutSession, Workout, WorkoutHistoryEntry } from '../../types/training'
import { ExerciseGuide } from '../exercises/ExerciseGuide'
import { BodyMapPlaceholder } from '../shared/BodyMapPlaceholder'

const AnatomyScene = lazy(() => import('../anatomy/AnatomyScene').then((module) => ({ default: module.AnatomyScene })))
const noop = () => {}
type ConfirmAction = 'skip' | 'end' | null

interface Props {
  session: ActiveWorkoutSession
  workout: Workout
  benchmarks: BenchmarkHistory
  history: WorkoutHistoryEntry[]
  weight: number
  storageWarning: string | null
  reducedMotion: boolean
  onChange: (session: ActiveWorkoutSession) => void
  onLeave: () => void
  onAbandon: () => void
  onFinish: (session: ActiveWorkoutSession) => void
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function ActiveWorkoutPage({ session, workout, benchmarks, history, weight, storageWarning, reducedMotion, onChange, onLeave, onAbandon, onFinish }: Props) {
  const [now, setNow] = useState(Date.now())
  const [confirm, setConfirm] = useState<ConfirmAction>(null)
  const [view, setView] = useState<BodyView>('front')
  const [target, setTarget] = useState(8)
  const [targetWasEdited, setTargetWasEdited] = useState(false)
  const [actual, setActual] = useState(8)
  const [rir, setRir] = useState(2)
  const [editing, setEditing] = useState<number | null>(null)
  const [editActual, setEditActual] = useState(0)
  const [editRir, setEditRir] = useState(2)
  const restButtonRef = useRef<HTMLButtonElement>(null)
  const targetInputRef = useRef<HTMLInputElement>(null)
  const previousResting = useRef(Boolean(session.restEndsAt))
  const confirmDialogRef = useRef<HTMLDivElement>(null)
  const endButtonRef = useRef<HTMLButtonElement>(null)
  const skipButtonRef = useRef<HTMLButtonElement>(null)
  const counts = sessionCounts(session)
  const resolved = allExercisesResolved(session)
  const currentLog = session.exercises[session.currentExerciseIndex]
  const current = useMemo(() => resolveExercise(workout.exercises[session.currentExerciseIndex], currentLog.variantId), [workout, session.currentExerciseIndex, currentLog.variantId])
  const setNumber = currentLog.sets.length + 1
  const plan = useMemo(() => getNextExerciseTargets(current, history, benchmarks, weight), [current, history, benchmarks, weight])
  const completedMuscles = useMemo(() => completedMusclesForSession(workout, session), [workout, session])
  const activeMuscles = useMemo(() => new Set(resolved ? [] : current.primaryMuscles), [resolved, current])
  const secondsLeft = remainingRestSeconds(session.restEndsAt, now)
  const resting = Boolean(session.restEndsAt)
  const unit = exerciseUnit(current)
  const matchingBenchmark = current.variantId === current.id ? [...(benchmarks[current.id] ?? [])].reverse().find((item) => item.weight === weight) : null

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (resting && !previousResting.current) restButtonRef.current?.focus()
    if (!resting && previousResting.current) targetInputRef.current?.focus()
    previousResting.current = resting
  }, [resting])

  useEffect(() => {
    if (!confirm) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setConfirm(null); return }
      if (event.key !== 'Tab') return
      const buttons = Array.from(confirmDialogRef.current?.querySelectorAll('button') ?? [])
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); (confirm === 'end' ? endButtonRef : skipButtonRef).current?.focus() }
  }, [confirm])

  useEffect(() => {
    const nextTarget = plan.targets[currentLog.sets.length] ?? initialExerciseTarget(current, benchmarks, weight)
    setTarget(nextTarget)
    setTargetWasEdited(false)
    setActual(nextTarget)
    setRir(2)
    setEditing(null)
  }, [current.id, currentLog.sets.length, plan, benchmarks, weight])

  const updateNumber = (value: string, setter: (value: number) => void, minimum: number) => {
    const number = Number(value)
    if (value === '') { setter(minimum); return }
    if (Number.isInteger(number)) setter(Math.max(minimum, Math.min(999, number)))
  }
  const adjustRest = (seconds: number) => {
    if (!session.restEndsAt) return
    const end = Math.max(Date.now(), Date.parse(session.restEndsAt) + seconds * 1000)
    onChange({ ...session, restEndsAt: new Date(end).toISOString() })
    setNow(Date.now())
  }
  const startEditing = (index: number) => {
    const logged = currentLog.sets[index]
    setEditing(index)
    setEditActual(logged.actualReps)
    setEditRir(logged.rir)
  }
  const finish = () => {
    onFinish({ ...session, status: 'completed', restEndsAt: null })
  }
  const logCurrentSet = () => {
    const time = new Date()
    onChange(completeSet(session, workout, target, actual, rir, time, targetWasEdited))
    setNow(time.getTime())
  }

  return <div className="active-workout-shell">
    <header className="active-workout-header">
      <button type="button" className="workout-text-button" onClick={onLeave}><ArrowLeft size={18} /> LEAVE WORKOUT</button>
      <strong>FULL<span>/</span>BODY</strong>
      <button ref={endButtonRef} type="button" className="workout-text-button" onClick={() => setConfirm('end')}>END WORKOUT</button>
    </header>
    {confirm && <div ref={confirmDialogRef} className="workout-confirm" role="alertdialog" aria-modal="true" aria-label={confirm === 'end' ? 'End workout?' : 'Skip exercise?'}>
      <p>{confirm === 'end' ? 'End this workout? Your unfinished sets will be discarded.' : 'Skip this exercise? Logged sets stay visible, but it will not count as complete.'}</p>
      <div><button type="button" autoFocus onClick={() => setConfirm(null)}>KEEP TRAINING</button><button type="button" onClick={() => { if (confirm === 'end') onAbandon(); else onChange(skipExercise(session)); setConfirm(null) }}>{confirm === 'end' ? 'DISCARD WORKOUT' : 'SKIP EXERCISE'}</button></div>
    </div>}
    <main className="active-workout-main">
      <div className="active-workout-title">
        <span className="small-label">ACTIVE WORKOUT</span>
        <h1>{workout.name}</h1>
        <div className="active-counts"><strong>{counts.completed} / {session.exercises.length} completed</strong><span>{counts.skipped > 0 ? `${counts.skipped} skipped · ` : ''}{counts.remaining} exercises remaining</span></div>
        {storageWarning && <p className="storage-warning" role="alert">{storageWarning}</p>}
        <div className="progress-track" role="progressbar" aria-label="Exercises completed" aria-valuenow={counts.completed} aria-valuemin={0} aria-valuemax={session.exercises.length}><span style={{ width: `${counts.completed / session.exercises.length * 100}%` }} /></div>
      </div>
      <div className="active-workout-grid">
        <section className="workout-body" aria-label="Workout muscle map">
          <span className="small-label">MUSCLE MAP</span>
          <div className="workout-anatomy"><Suspense fallback={<BodyMapPlaceholder />}><AnatomyScene view={view} selectedMuscle={null} activeMuscles={activeMuscles} completedMuscles={completedMuscles} onSelect={noop} onClear={noop} reducedMotion={reducedMotion} /></Suspense></div>
          <div className="view-buttons" aria-label="Anatomy views">{(['front', 'back'] as BodyView[]).map((option) => <button type="button" key={option} className={view === option ? 'view-button active' : 'view-button'} aria-pressed={view === option} onClick={() => setView(option)}>{option.toUpperCase()}</button>)}</div>
          <div className="workout-legend"><span><i className="legend-active" /> ACTIVE</span><span><i className="legend-complete" /> COMPLETED</span></div>
        </section>
        <section className="workout-exercise" aria-labelledby="active-exercise-heading">
          {resolved ? <>
            <span className="small-label">ALL EXERCISES RESOLVED</span>
            <h2 id="active-exercise-heading">Ready to finish</h2>
            <p>{counts.completed} completed · {counts.skipped} skipped</p>
            <button className="start-button" type="button" onClick={finish}>FINISH WORKOUT <ArrowRight size={18} /></button>
          </> : <>
            <div className="exercise-topline"><span className="small-label">EXERCISE {session.currentExerciseIndex + 1} OF {workout.exercises.length}</span><span className="small-label">{current.dumbbellCount === 1 ? `${weight} lb` : `${weight} lb each`}</span></div>
            <h2 id="active-exercise-heading">{current.name}</h2>
            {current.variantId !== current.id && <p className="active-variant-detail">{workout.exercises[session.currentExerciseIndex].name} family · Difficulty {(getExerciseFamily(current.id)?.variantIds.indexOf(current.variantId!) ?? 0) + 1} / {getExerciseFamily(current.id)?.variantIds.length} · {current.repRange} reps</p>}
            <p className="exercise-muscles">{[...current.primaryMuscles, ...current.secondaryMuscles].map((muscle) => muscleInfo[muscle].label).join(' · ')}</p>
            <div className="active-exercise-guide"><span className="small-label">HOW TO DO IT</span><ExerciseGuide exercise={current} compact /></div>
            {isUnilateral(current) && <p className="exercise-side-note">REPS PER SIDE · Use the lower side if reps differ.</p>}
            <div className="target-context"><div><span className="small-label">{targetReason[plan.status].label}</span><strong>{plan.targets.join(' / ')} {unit}{isUnilateral(current) ? ' / side' : ''}</strong></div><p>{targetReason[plan.status].description}</p></div>
            {plan.previous && <details className="previous-performance"><summary>LAST SESSION · {new Date(plan.previous.workout.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</summary><div><span>Target <strong>{plan.previous.exercise.sets.map((set) => set.targetReps).join(' / ')}</strong></span><span>Actual <strong>{plan.previous.exercise.sets.map((set) => set.actualReps).join(' / ')}</strong></span><span>RIR <strong>{plan.previous.exercise.sets.map((set) => set.rir === 4 ? '4+' : set.rir).join(' / ')}</strong></span></div></details>}
            {currentLog.sets.length > 0 && <div className="logged-sets" aria-label="Completed sets">{currentLog.sets.map((set, index) => <div key={set.setNumber} className="logged-set">
              {editing === index ? <><label>SET {set.setNumber} ACTUAL <input type="number" min="0" max="999" value={editActual} onChange={(event) => updateNumber(event.target.value, setEditActual, 0)} /></label><label>RIR <select value={editRir} onChange={(event) => setEditRir(Number(event.target.value))}>{[0, 1, 2, 3, 4].map((option) => <option value={option} key={option}>{option === 4 ? '4+' : option}</option>)}</select></label><button type="button" onClick={() => { onChange(editLoggedSet(session, session.currentExerciseIndex, index, editActual, editRir)); setEditing(null) }}>SAVE</button><button type="button" onClick={() => setEditing(null)}>CANCEL</button></>
                : <><label className="logged-set-complete"><input type="checkbox" checked disabled aria-label={`Set ${set.setNumber} completed`} /><span>SET {set.setNumber}</span></label><strong>{set.actualReps} {unit}{isUnilateral(current) ? ' / side' : ''} · {set.rir === 4 ? '4+' : set.rir} RIR</strong><button type="button" onClick={() => startEditing(index)} aria-label={`Edit set ${set.setNumber}`}>EDIT</button></>}
            </div>)}</div>}
            {resting ? <div className="rest-state" role="group" aria-label="Rest timer">
              <span className="small-label">{secondsLeft > 0 ? 'REST' : 'READY'}</span>
              <strong className="rest-clock" aria-label={`${secondsLeft} seconds remaining`}>{secondsLeft > 0 ? formatTime(secondsLeft) : `SET ${setNumber}`}</strong>
              <p className="rest-next"><span>NEXT</span>Set {setNumber} · {current.name}</p>
              <div className="rest-actions"><button ref={restButtonRef} type="button" onClick={() => onChange({ ...session, restEndsAt: null })}>{secondsLeft > 0 ? 'SKIP REST' : 'CONTINUE'}</button>{secondsLeft > 0 && <button type="button" onClick={() => adjustRest(30)}>+30 SEC</button>}</div>
            </div> : <>
              <div className="set-heading"><span className="small-label">SET {setNumber} OF {current.defaultSets}</span>{matchingBenchmark && <span className="benchmark-context">Benchmark {matchingBenchmark.reps} {unit}</span>}</div>
              <div className="reps-fields"><label>Target <span>{unit}{isUnilateral(current) ? ' / side' : ''}</span><input ref={targetInputRef} type="number" min="1" max="999" inputMode="numeric" value={target} onChange={(event) => { setTargetWasEdited(true); updateNumber(event.target.value, setTarget, 1) }} /></label>
                <div className="actual-field"><label htmlFor="actual-reps">Actual {unit}{isUnilateral(current) ? ' / side' : ''}</label><div className="reps-stepper"><button type="button" aria-label="Decrease actual reps" onClick={() => setActual(Math.max(0, actual - 1))}><Minus size={18} /></button><input id="actual-reps" type="number" min="0" max="999" inputMode="numeric" value={actual} onChange={(event) => updateNumber(event.target.value, setActual, 0)} /><button type="button" aria-label="Increase actual reps" onClick={() => setActual(Math.min(999, actual + 1))}><Plus size={18} /></button></div></div></div>
              <fieldset className="rir-options"><legend>REPS IN RESERVE <span title="RIR means how many clean reps you think you could still perform.">ⓘ</span></legend><p>How many clean reps could you still do?</p><div>{[0, 1, 2, 3, 4].map((option) => <label key={option}><input type="radio" name="rir" value={option} checked={rir === option} onChange={() => setRir(option)} /><span>{option === 4 ? '4+' : option}</span></label>)}</div></fieldset>
              <label className="complete-set-control"><input type="checkbox" checked={false} onChange={logCurrentSet} aria-label={`Mark set ${setNumber} complete`} /><span>MARK SET {setNumber} COMPLETE</span><ArrowRight size={18} aria-hidden="true" /></label>
              <button ref={skipButtonRef} className="workout-text-button skip-exercise-button" type="button" onClick={() => setConfirm('skip')}>SKIP EXERCISE</button>
            </>}
          </>}
          <details className="exercise-list"><summary>EXERCISE LIST</summary><ol>{session.exercises.map((entry, index) => <li key={entry.exerciseId}><span aria-hidden="true">{entry.status === 'completed' ? '✓' : entry.status === 'active' ? '●' : entry.status === 'skipped' ? '—' : '○'}</span>{entry.status === 'pending' ? <button type="button" onClick={() => onChange(jumpToExercise(session, index))}>{resolveExercise(workout.exercises[index], entry.variantId).name}</button> : <span>{resolveExercise(workout.exercises[index], entry.variantId).name}</span>}<small>{entry.status}</small></li>)}</ol></details>
        </section>
      </div>
    </main>
  </div>
}

interface SummaryProps { session: ActiveWorkoutSession; workout: Workout; history: WorkoutHistoryEntry[]; onReturn: () => void; reducedMotion: boolean; variantWarning: string | null; onSelectVariant: (exerciseId: string, variantId: string) => boolean }
export function WorkoutSummary({ session, workout, history, onReturn, reducedMotion, variantWarning, onSelectVariant }: SummaryProps) {
  const [handledUpgrades, setHandledUpgrades] = useState<Set<string>>(() => new Set())
  const [chosenUpgrades, setChosenUpgrades] = useState<Record<string, string>>({})
  const [upgradeNotice, setUpgradeNotice] = useState('')
  const saved = history.find((entry) => entry.id === session.id)
  const summary = saved ? historyEntrySummary(saved) : sessionSummary(session, workout, new Date())
  const completed = completedMusclesForSession(workout, session)
  const celebrations = saved ? getWorkoutCelebrations(saved, history.filter((entry) => entry.id !== saved.id)) : null
  const progressionOnly = celebrations?.progressions.filter((event) => !event.reachedCeiling) ?? []
  const upgrades = saved ? saved.exercises.flatMap((entry, index) => {
    const base = workout.exercises[index]
    const variantId = entry.variantId ?? base.id
    const next = getNextVariant(base.id, variantId)
    return entry.status === 'completed' && next && isVariationUpgradeReady(history, base, variantId, saved.dumbbellWeight) ? [{ base, variantId, next, targets: entry.sets.map((set) => set.targetReps) }] : []
  }) : []
  return <div className="active-workout-shell"><header className="active-workout-header"><strong>FULL<span>/</span>BODY</strong></header><main className="workout-summary">
    <span className="small-label">WORKOUT COMPLETE</span><h1>{workout.name} complete</h1>
    {celebrations && (progressionOnly.length > 0 || celebrations.ceilings.length > 0 || celebrations.advances.length > 0 || celebrations.perfectWeek) && <section className="summary-celebrations" aria-label="Earned milestones" role="status">
      {progressionOnly.map((event) => <div key={event.exercise.id}><span>PROGRESSION EARNED</span><strong>{event.exercise.name} · +1 rep</strong><small>Current target {event.targets.join(' / ')}</small></div>)}
      {celebrations.ceilings.map((event) => <div key={event.exercise.id}><span>REP RANGE COMPLETE</span><strong>{event.exercise.name}</strong><small>{event.targets.join(' / ')} · {event.weight} lb</small></div>)}
      {celebrations.advances.map((event) => <div key={event.exerciseId}><span>DIFFICULTY ADVANCED</span><strong>{resolveExercise(workout.exercises.find((item) => item.id === event.exerciseId)!, event.toVariantId).name}</strong><small>From {resolveExercise(workout.exercises.find((item) => item.id === event.exerciseId)!, event.fromVariantId).name}</small></div>)}
      {celebrations.perfectWeek && <div><span>PERFECT WEEK</span><strong>3 / 3 workouts complete</strong><small>{celebrations.weekStreak} week streak</small></div>}
    </section>}
    {upgrades.length > 0 && <section className="summary-upgrades" aria-label="Harder variations ready">{upgrades.filter((item) => !handledUpgrades.has(item.base.id)).map(({ base, variantId, next, targets }) => <div key={base.id}><span className="small-label">REP RANGE COMPLETE · {targets.join(' / ')}</span><strong>HARDER VARIATION READY</strong><h2>{next.name}</h2><p>{next.modifierCue}</p><p>Starting target {getVariantInitialTargets(base, next.id).join(' / ')} · {next.repRange} reps</p><div><button type="button" onClick={() => { if (onSelectVariant(base.id, next.id)) { setHandledUpgrades((previous) => new Set([...previous, base.id])); setChosenUpgrades((previous) => ({ ...previous, [base.id]: next.id })); setUpgradeNotice(`${next.name} selected for future workouts.`) } }}>USE HARDER VARIATION</button><button type="button" onClick={() => { if (onSelectVariant(base.id, variantId)) { setHandledUpgrades((previous) => new Set([...previous, base.id])); setUpgradeNotice(`${resolveExercise(base, variantId).name} kept. The harder variation remains available in Settings.`) } }}>KEEP CURRENT VARIATION</button></div></div>)}{upgradeNotice && <p role="status">{upgradeNotice}</p>}</section>}
    {variantWarning && <p className="storage-warning" role="alert">{variantWarning}</p>}
    <div className="summary-stats"><div><strong>{summary.completed} / {session.exercises.length}</strong><span>EXERCISES</span></div><div><strong>{summary.skipped}</strong><span>SKIPPED</span></div><div><strong>{summary.sets}</strong><span>SETS</span></div><div><strong>{summary.reps}</strong><span>TOTAL REPS</span></div><div><strong>{summary.minutes} min</strong><span>DURATION</span></div></div>
    <div className="summary-body"><Suspense fallback={<BodyMapPlaceholder />}><AnatomyScene view="front" selectedMuscle={null} completedMuscles={completed} onSelect={noop} onClear={noop} reducedMotion={reducedMotion} /></Suspense></div>
    <details className="exercise-list summary-results"><summary>SET RESULTS & NEXT TARGETS</summary><ol>{session.exercises.map((entry, index) => {
      const exercise = resolveExercise(workout.exercises[index], entry.variantId)
      const plan = entry.status === 'completed' ? getNextExerciseTargets(exercise, history, {}, session.dumbbellWeight) : null
      return <li key={entry.exerciseId}><span>{entry.status === 'completed' ? '✓' : '—'}</span><div><strong>{exercise.name}</strong>{entry.status === 'skipped' ? <small>Skipped · no target change</small> : <><small>Target {entry.sets.map((set) => set.targetReps).join(' / ')} · Actual {entry.sets.map((set) => set.actualReps).join(' / ')} · RIR {entry.sets.map((set) => set.rir === 4 ? '4+' : set.rir).join(' / ')}</small>{chosenUpgrades[exercise.id] ? <small className="summary-next">NEXT TIME {getVariantInitialTargets(workout.exercises[index], chosenUpgrades[exercise.id]).join(' / ')} · NEW VARIATION</small> : plan && <small className="summary-next">NEXT TIME {plan.targets.join(' / ')} · {targetReason[plan.status].label}</small>}</>}</div></li>
    })}</ol></details>
    <button className="start-button" type="button" onClick={onReturn}>RETURN TO DASHBOARD <ArrowRight size={18} /></button>
  </main></div>
}
