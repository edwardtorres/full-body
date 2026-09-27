import { useEffect, useRef, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import type { Exercise, MuscleGroup, SessionKind } from '../../types/training'
import { muscleInfo } from '../../data/muscles'
import { initialTargetPerSet } from '../../lib/profile'
import type { BenchmarkHistory } from '../../types/profile'
import { ExerciseGuide } from '../exercises/ExerciseGuide'

export interface SessionPlan {
  kind: SessionKind
  muscle: MuscleGroup | null
  exercises: Exercise[]
  index: number
}

interface Props {
  session: SessionPlan
  onComplete: () => void
  onSkip: () => void
  onClose: () => void
  dumbbellWeight: number
  benchmarks: BenchmarkHistory
}

export function WorkoutSession({ session, onComplete, onSkip, onClose, dumbbellWeight, benchmarks }: Props) {
  const panelRef = useRef<HTMLElement>(null)
  const firstSetRef = useRef<HTMLInputElement>(null)
  const [checkedSets, setCheckedSets] = useState<Set<number>>(() => new Set())
  const current = session.exercises[session.index]
  const isLast = session.index === session.exercises.length - 1
  const candidate = benchmarks[current.id]?.at(-1)
  const result = (current.variantId ?? current.id) === current.id && candidate?.weight === dumbbellWeight ? candidate : undefined

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    firstSetRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input[type="checkbox"]:not(:disabled)') ?? [])
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('session-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('session-open')
      previous?.focus()
    }
  }, [onClose])

  useEffect(() => { setCheckedSets(new Set()); firstSetRef.current?.focus() }, [session.index, current.id])

  const toggleSet = (setNumber: number) => setCheckedSets((previous) => {
    const next = new Set(previous)
    if (next.has(setNumber)) next.delete(setNumber)
    else next.add(setNumber)
    return next
  })

  return <div className="session-layer">
    <div className="session-backdrop" onClick={onClose} aria-hidden="true" />
    <section className="session-panel" role="dialog" aria-modal="true" aria-labelledby="session-title" ref={panelRef}>
      <div className="session-header">
        <span className="small-label">{session.muscle ? muscleInfo[session.muscle].label.toUpperCase() : 'FULL BODY A'} · {session.index + 1} / {session.exercises.length}</span>
        <button className="icon-button" type="button" aria-label="Close workout" onClick={onClose}><X size={19} /></button>
      </div>
      <div className="session-progress" role="progressbar" aria-label="Workout sequence" aria-valuenow={session.index + 1} aria-valuemin={1} aria-valuemax={session.exercises.length}><span style={{ width: `${(session.index + 1) / session.exercises.length * 100}%` }} /></div>
      <div className="session-content">
        <h2 id="session-title">{current.name}</h2>
        <ExerciseGuide exercise={current} />
        <div className="session-prescription">
          <div><span>SETS</span><strong>{current.defaultSets}</strong></div>
          <div><span>{result ? 'TARGET / SET' : 'REPS'}</span><strong>{result ? initialTargetPerSet(result, current) : current.repRange}</strong></div>
          <div><span>LOAD</span><strong>{current.dumbbellCount === 1 ? `${dumbbellWeight} lb` : `2 × ${dumbbellWeight} lb`}</strong></div>
        </div>
        <div className="quick-set-checklist" role="group" aria-label="Completed sets">
          <div className="quick-set-heading"><span className="small-label">SETS COMPLETE</span><strong>{checkedSets.size} / {current.defaultSets}</strong></div>
          {Array.from({ length: current.defaultSets }, (_, index) => <label key={index} className={checkedSets.has(index + 1) ? 'checked' : ''}>
            <input ref={index === 0 ? firstSetRef : undefined} type="checkbox" checked={checkedSets.has(index + 1)} onChange={() => toggleSet(index + 1)} />
            <span>SET {index + 1}</span><small>{checkedSets.has(index + 1) ? 'DONE' : 'MARK COMPLETE'}</small>
          </label>)}
        </div>
      </div>
      <div className="session-actions">
        <button className="start-button" type="button" onClick={onComplete} disabled={checkedSets.size !== current.defaultSets}>FINISH QUICK WORKOUT <ArrowRight size={18} /></button>
        <button className="session-skip" type="button" onClick={onSkip}>{isLast ? 'END QUICK WORKOUT' : 'SKIP'}</button>
      </div>
    </section>
  </div>
}
