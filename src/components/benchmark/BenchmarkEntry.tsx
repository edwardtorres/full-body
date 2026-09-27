import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react'
import { benchmarkCues } from '../../data/benchmark'
import { validateBenchmarkReps } from '../../lib/profile'
import type { BenchmarkResult } from '../../types/profile'
import type { Exercise } from '../../types/training'

interface Props {
  exercise: Exercise
  index: number
  weight: number
  initialReps?: number
  onSave: (result: BenchmarkResult) => void
  onBack?: () => void
}

export function BenchmarkEntry({ exercise, index, weight, initialReps, onSave, onBack }: Props) {
  const [input, setInput] = useState(initialReps?.toString() ?? '')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  const change = (value: string) => { setInput(value); if (error) setError('') }
  const adjust = (amount: number) => change(String(Math.max(1, Math.min(100, (validateBenchmarkReps(input) ?? (amount > 0 ? 0 : 2)) + amount))))
  const save = (event: React.FormEvent) => {
    event.preventDefault()
    const reps = validateBenchmarkReps(input)
    if (reps === null) { setError('Enter a whole number from 1 to 100 reps.'); inputRef.current?.focus(); return }
    onSave({ exerciseId: exercise.id, weight, reps, targetRir: 2, completedAt: new Date().toISOString() })
  }
  const cues = benchmarkCues[exercise.id as keyof typeof benchmarkCues]
  return <form className="benchmark-entry" onSubmit={save} noValidate>
    <div className="flow-topline"><span>BENCHMARK · {index + 1} / 5</span><span>{Math.round((index + 1) / 5 * 100)}%</span></div>
    <div className="flow-progress"><span style={{ width: `${(index + 1) / 5 * 100}%` }} /></div>
    <p className="flow-eyebrow">MOVE {String(index + 1).padStart(2, '0')}</p>
    <h1>{exercise.name}</h1>
    <p className="benchmark-muscles">{exercise.primaryMuscles.join(' · ')} <span>{weight} lb</span></p>
    <div className="benchmark-guidance"><strong>Target effort</strong><p>Stop with about 2 good reps remaining.</p><strong>Form</strong><ul>{cues?.map((cue) => <li key={cue}>{cue}</li>)}</ul></div>
    <label className="reps-label" htmlFor="benchmark-reps">REPS COMPLETED</label>
    <div className="reps-control">
      <button type="button" aria-label="Decrease repetitions" onClick={() => adjust(-1)}><Minus size={20} /></button>
      <input ref={inputRef} id="benchmark-reps" type="number" inputMode="numeric" min="1" max="100" step="1" value={input} onChange={(event) => change(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'reps-error' : undefined} />
      <button type="button" aria-label="Increase repetitions" onClick={() => adjust(1)}><Plus size={20} /></button>
    </div>
    {exercise.id === 'one-arm-row' && <p className="benchmark-note">Use your weaker side as the benchmark.</p>}
    {error && <p className="field-error" id="reps-error" role="alert">{error}</p>}
    <div className="flow-actions">
      {onBack && <button type="button" className="flow-text-button" onClick={onBack}><ArrowLeft size={16} /> Back</button>}
      <button type="submit" className="flow-primary">SAVE & CONTINUE <ArrowRight size={18} /></button>
    </div>
  </form>
}
