import { Check, X } from 'lucide-react'
import { muscleInfo } from '../../data/muscles'
import type { BenchmarkResult } from '../../types/profile'
import type { Exercise, MuscleGroup } from '../../types/training'
import { ExerciseGuide } from '../exercises/ExerciseGuide'

interface Props {
  muscle: MuscleGroup | null
  exercise: Exercise | null
  regionalCompleted: boolean
  benchmark: BenchmarkResult | null
  benchmarkExerciseName: string | null
  onClear: () => void
}

export function MuscleInfoPanel({ muscle, exercise, regionalCompleted, benchmark, benchmarkExerciseName, onClear }: Props) {
  if (!muscle) return null
  return <section className="muscle-info" aria-label={`${muscleInfo[muscle].label} exercises`} aria-live="polite">
    <div className="info-header">
      <span className="small-label">QUICK WORKOUT</span>
      <button className="icon-button mini" type="button" onClick={onClear} aria-label="Clear muscle selection"><X size={16} /></button>
    </div>
    <h2>{muscleInfo[muscle].label}</h2>
    <div className="today-list">
      {exercise && <div className="muscle-exercise">
        <span>{exercise.name}</span>
        {regionalCompleted && <Check size={15} aria-label="Regional session complete" />}
      </div>}
    </div>
    {exercise && <ExerciseGuide exercise={exercise} compact />}
    <div className="muscle-benchmark"><span>BENCHMARK</span>{benchmark ? <strong>{benchmarkExerciseName}<small>{benchmark.weight} lb × {benchmark.reps}</small></strong> : <strong>Not established yet</strong>}</div>
  </section>
}
