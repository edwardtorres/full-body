import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { benchmarkExercises } from '../../data/benchmark'
import { latestBenchmark, originalBenchmark } from '../../lib/profile'
import { compareBenchmark } from '../../lib/achievements'
import type { BenchmarkResult, PersistedProfile } from '../../types/profile'
import { BenchmarkEntry } from './BenchmarkEntry'
import { SecondaryPageHeader } from '../shared/SecondaryPageHeader'

interface Props {
  state: PersistedProfile
  onSave: (next: PersistedProfile) => void
  onBack: () => void
  storageWarning: string | null
}

const dateLabel = (date: string) => new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

export function BenchmarkPage({ state, onSave, onBack, storageWarning }: Props) {
  const [mode, setMode] = useState<'overview' | 'entry' | 'review' | 'saved'>('overview')
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<BenchmarkResult[]>([])
  const [savedResults, setSavedResults] = useState<{ result: BenchmarkResult; original: BenchmarkResult | null }[]>([])
  const [savedWasRetest, setSavedWasRetest] = useState(false)
  const hasOriginal = benchmarkExercises.some((exercise) => originalBenchmark(state.benchmarks[exercise.id]))
  const begin = () => { setDraft([]); setIndex(0); setMode('entry') }
  const saveEntry = (result: BenchmarkResult) => {
    setDraft((current) => [...current.filter((item) => item.exerciseId !== result.exerciseId), result])
    if (index === 4) setMode('review')
    else setIndex(index + 1)
  }
  const commit = () => {
    const histories = { ...state.benchmarks }
    setSavedWasRetest(hasOriginal)
    setSavedResults(draft.map((result) => ({ result, original: originalBenchmark(state.benchmarks[result.exerciseId]) })))
    for (const result of draft) histories[result.exerciseId] = [...(histories[result.exerciseId] ?? []), result]
    onSave({ ...state, benchmarks: histories })
    setMode('saved')
    setDraft([])
  }

  return <div className="benchmark-page">
    <SecondaryPageHeader title="Benchmark" onBack={onBack} />
    <main className="benchmark-main">
      {mode === 'overview' && <>
        <p className="flow-eyebrow">YOUR STARTING POINT</p><h1>Benchmark</h1>
        <p className="benchmark-page-intro">Compare your rep capacity at the same load over time.</p>
        {!hasOriginal && <p className="benchmark-empty">No benchmark saved yet. Complete the five short movements to establish a starting point, or return to your workout.</p>}
        <div className="benchmark-history-list">{benchmarkExercises.map((exercise) => {
          const original = originalBenchmark(state.benchmarks[exercise.id])
          const latest = latestBenchmark(state.benchmarks[exercise.id])
          return <section key={exercise.id} className="benchmark-history-row"><h2>{exercise.name}</h2><div><span>ORIGINAL</span><strong>{original ? `${original.weight} lb × ${original.reps}` : 'Not established'}</strong>{original && <small>{dateLabel(original.completedAt)}</small>}</div><div><span>LATEST</span><strong>{latest ? `${latest.weight} lb × ${latest.reps}` : 'Not established'}</strong>{latest && <small>{dateLabel(latest.completedAt)}</small>}</div></section>
        })}</div>
        <button className="flow-primary benchmark-page-action" type="button" onClick={begin}>{hasOriginal ? 'RETEST BENCHMARK' : 'START BENCHMARK'} <ArrowRight size={18} /></button>
      </>}

      {mode === 'entry' && <div className="flow-card benchmark-flow-card"><BenchmarkEntry key={index} exercise={benchmarkExercises[index]} index={index} weight={state.profile.equipment.dumbbellWeight} initialReps={draft.find((item) => item.exerciseId === benchmarkExercises[index].id)?.reps} onSave={saveEntry} onBack={() => index === 0 ? setMode('overview') : setIndex(index - 1)} /></div>}

      {mode === 'review' && <div className="flow-card benchmark-flow-card">
        <div className="flow-topline"><span>REVIEW</span><span>5 / 5</span></div>
        <p className="flow-eyebrow">BEFORE YOU SAVE</p><h1>{hasOriginal ? 'Compare your results' : 'Your starting point'}</h1>
        <div className="retest-list">{benchmarkExercises.map((exercise) => {
          const previous = originalBenchmark(state.benchmarks[exercise.id])
          const next = draft.find((result) => result.exerciseId === exercise.id)
          const comparable = previous && next && previous.weight === next.weight
          const delta = comparable ? next.reps - previous.reps : null
          return <div key={exercise.id} className="retest-row"><h2>{exercise.name}</h2><div><span>ORIGINAL</span><strong>{previous ? `${previous.weight} lb × ${previous.reps}` : '—'}</strong></div><div><span>NEW</span><strong>{next?.weight} lb × {next?.reps}</strong></div>{delta !== null && <small className={delta > 0 ? 'positive' : ''}>{delta > 0 ? `+${delta} ${delta === 1 ? 'rep' : 'reps'}` : delta === 0 ? 'Matched' : 'Current result'}</small>}{previous && !comparable && <small>Different load</small>}</div>
        })}</div>
        <div className="flow-actions"><button className="flow-text-button" type="button" onClick={() => { setIndex(4); setMode('entry') }}><ArrowLeft size={16} /> Back</button><button className="flow-primary" type="button" onClick={commit}>SAVE NEW BENCHMARK <ArrowRight size={18} /></button></div>
      </div>}
      {mode === 'saved' && <div className="flow-card benchmark-flow-card benchmark-saved" role="status"><p className="flow-eyebrow">BENCHMARK SAVED</p><h1>{savedWasRetest ? 'Retest complete' : 'Starting point saved'}</h1><div className="benchmark-saved-list">{savedResults.map(({ result, original }) => {
        const exercise = benchmarkExercises.find((item) => item.id === result.exerciseId)!
        const comparison = compareBenchmark(original, result)
        return <div key={result.exerciseId}><span>{comparison.status === 'improved' ? 'BENCHMARK IMPROVED' : comparison.status === 'matched' ? 'BENCHMARK MATCHED' : 'CURRENT BENCHMARK SAVED'}</span><strong>{exercise.name}</strong><small>{comparison.original ? `Original ${comparison.original.weight} lb × ${comparison.original.reps} · ` : ''}Current {result.weight} lb × {result.reps}{comparison.status === 'improved' ? ` · +${comparison.delta} ${comparison.delta === 1 ? 'rep' : 'reps'}` : ''}</small></div>
      })}</div><button className="flow-primary benchmark-page-action" type="button" onClick={() => { setSavedResults([]); setMode('overview') }}>VIEW BENCHMARKS <ArrowRight size={18} /></button></div>}
      {storageWarning && <p className="storage-warning" role="status">{storageWarning}</p>}
    </main>
  </div>
}
