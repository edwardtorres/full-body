import { lazy, Suspense, useMemo, useState } from 'react'
import type { BodyView } from '../anatomy/CameraControls'
import { muscleInfo } from '../../data/muscles'
import { muscleGroups, type MuscleGroup, type WorkoutHistoryEntry } from '../../types/training'
import { exerciseTrendLabel, getMuscleAnalytics, type AnalyticsPeriod } from '../../lib/muscleAnalytics'
import type { VariantSelections } from '../../lib/variants'
import { BodyMapPlaceholder } from '../shared/BodyMapPlaceholder'
import { SecondaryPageHeader } from '../shared/SecondaryPageHeader'

const AnatomyScene = lazy(() => import('../anatomy/AnatomyScene').then((module) => ({ default: module.AnatomyScene })))
const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'None yet'
const targets = (values: number[] | null) => values?.join(' / ') ?? '—'
const emptyCompleted = new Set<MuscleGroup>()

interface Props {
  mode: 'strong' | 'weak'
  history: WorkoutHistoryEntry[]
  weight: number
  variantSelections: VariantSelections
  now: Date
  reducedMotion: boolean
  storageWarning: string | null
  onBack: () => void
}

export function InsightPage({ mode, history, weight, variantSelections, now, reducedMotion, storageWarning, onBack }: Props) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('recent')
  const [view, setView] = useState<BodyView>('front')
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null)
  const analytics = useMemo(() => getMuscleAnalytics(history, weight, period, now, variantSelections), [history, weight, period, now, variantSelections])
  const highlighted = useMemo(() => new Set(analytics.filter((item) => item.classification === mode).map((item) => item.muscle)), [analytics, mode])
  const selected = analytics.find((item) => item.muscle === selectedMuscle) ?? analytics.find((item) => item.classification === mode) ?? null
  const isStrong = mode === 'strong'
  const heading = isStrong ? 'Strong Points' : 'Weak Points'
  const selectMuscle = (muscle: MuscleGroup) => setSelectedMuscle(muscle)
  const sorted = analytics.filter((item) => item.completedPerformances > 0)
    .sort((a, b) => Number(b.classification === mode) - Number(a.classification === mode) || muscleGroups.indexOf(a.muscle) - muscleGroups.indexOf(b.muscle))

  return <div className={`insight-shell ${mode}`}>
    <SecondaryPageHeader title={heading} onBack={onBack} />
    <main className="insight-main">
      <div className="insight-intro"><div><span className="small-label">YOUR TRAINING PATTERN</span><h1>{heading}</h1><p>{isStrong ? 'Your fastest recent training progress.' : 'Where recent training progress has been slower.'}</p><small>Strong and weak points reflect your recent progress with the equipment and exercises you use.{!isStrong && ' A weak point means slower training progress, not necessarily a physically weak muscle.'}</small></div><div className="insight-period" role="group" aria-label="Analysis period"><button type="button" aria-pressed={period === 'recent'} onClick={() => { setPeriod('recent'); setSelectedMuscle(null) }}>LAST 6 WEEKS</button><button type="button" aria-pressed={period === 'all'} onClick={() => { setPeriod('all'); setSelectedMuscle(null) }}>ALL TIME</button></div></div>
      {storageWarning && <p className="storage-warning" role="status">{storageWarning}</p>}
      <div className="insight-layout">
        <section className="insight-body" aria-label={`${heading} body map`}>
          <div className="insight-body-top"><span className="small-label">BODY MAP · {weight} LB</span><span className="insight-legend"><i />{isStrong ? 'FASTER PROGRESS' : 'SLOWER PROGRESS'}</span></div>
          <div className="insight-anatomy"><Suspense fallback={<BodyMapPlaceholder />}><AnatomyScene view={view} selectedMuscle={selected?.muscle ?? null} completedMuscles={emptyCompleted} analytics={{ mode, highlighted }} onSelect={selectMuscle} onClear={() => setSelectedMuscle(null)} reducedMotion={reducedMotion} /></Suspense></div>
          <div className="view-buttons" aria-label="Anatomy views">{(['front', 'back'] as BodyView[]).map((option) => <button type="button" key={option} className={view === option ? 'view-button active' : 'view-button'} aria-pressed={view === option} onClick={() => setView(option)}>{option.toUpperCase()}</button>)}</div>
          <div className="insight-muscle-list" aria-label="Muscle analytics list">{sorted.map((item) => <button type="button" key={item.muscle} className={selected?.muscle === item.muscle ? 'selected' : ''} aria-pressed={selected?.muscle === item.muscle} onClick={() => selectMuscle(item.muscle)}><span>{muscleInfo[item.muscle].label}</span><small>{item.classification === mode ? isStrong ? 'STRONG POINT' : 'WEAK POINT' : item.confidence !== 'enough-data' ? 'BUILDING DATA' : 'NO POINT IDENTIFIED'}</small></button>)}</div>
        </section>
        <section className="insight-detail" aria-live="polite">
          {highlighted.size === 0 && <div className="insight-empty"><span className="small-label">{isStrong ? 'NO STRONG POINT IDENTIFIED YET' : 'NO WEAK POINT IDENTIFIED YET'}</span><h2>Building your training profile</h2><p>{isStrong ? 'Complete at least a few workouts and Full Body will identify where your performance is progressing fastest.' : 'Complete more sessions before slower trends are identified.'}</p></div>}
          {selected && <>
            <span className="small-label">{selected.classification === mode ? isStrong ? 'STRONG POINT' : 'WEAK POINT' : selected.confidence !== 'enough-data' ? 'BUILDING DATA' : 'TRAINING CONTEXT'}</span>
            <h2>{muscleInfo[selected.muscle].label}</h2>
            <p className="insight-detail-intro">{selected.classification === mode ? isStrong ? 'These exercises have advanced consistently relative to your other trained muscle groups.' : 'These exercises have advanced more slowly than your other trained muscle groups.' : selected.confidence !== 'enough-data' ? 'Complete more sessions to identify a trend.' : 'This muscle does not currently meet the evidence threshold for this point.'}</p>
            <div className="insight-facts"><div><span>PROGRESSION STEPS</span><strong>{selected.progressionSteps}</strong></div><div><span>DIFFICULTY ADVANCES</span><strong>{selected.difficultyAdvances}</strong></div><div><span>PROGRESSING EXERCISES</span><strong>{selected.progressingExercises} / {selected.eligibleExercises}</strong></div><div><span>STALLED EXERCISES</span><strong>{selected.stalledExercises}</strong></div><div><span>LATEST PROGRESS</span><strong>{formatDate(selected.lastProgressionAt)}</strong></div></div>
            <div className="insight-exercises"><h3>Primary exercises</h3>{selected.exercises.length === 0 ? <p>No rep-based primary exercises yet.</p> : selected.exercises.map((item) => <article key={item.exercise.id}><div><strong>{item.exercise.name}</strong><small>{exerciseTrendLabel[item.status]}</small></div><p>{item.completedPerformances} completed · {item.progressionSteps} steps · {item.consecutiveHolds} current holds</p><p>Next target {targets(item.currentTarget)} · {item.exercise.dumbbellCount === 2 ? `${weight} lb each` : `${weight} lb`}</p></article>)}<small>Only primary-muscle rep exercises at your current weight contribute to these points. Skips and timed work do not count as stalls.</small></div>
          </>}
        </section>
      </div>
    </main>
  </div>
}
