import { useState } from 'react'
import { SecondaryPageHeader } from '../shared/SecondaryPageHeader'
import { workouts } from '../../data/workouts'
import { originalBenchmark } from '../../lib/profile'
import { exerciseUnit } from '../../lib/activeWorkout'
import { historyEntrySummary, sortHistory } from '../../lib/workoutHistory'
import { analyticsExercises, exerciseTrendLabel, getExerciseAnalytics, type AnalyticsPeriod } from '../../lib/muscleAnalytics'
import { getBestPerfectWeekStreak, getCurrentPerfectWeekStreak, getPerfectWeekCount, getRecentWeeks, requiredWorkoutIds } from '../../lib/consistency'
import { getAchievementStates, getEarnedProgressionCount } from '../../lib/achievements'
import { getCurrentVariant, getDifficultyAdvanceEvents, getVariantInitialTargets, groupExerciseHistoryByVariant, type VariantSelections } from '../../lib/variants'
import { getExerciseFamily, getExerciseVariant, resolveExercise } from '../../data/exerciseVariants'
import type { BenchmarkHistory } from '../../types/profile'
import type { WorkoutHistoryEntry } from '../../types/training'

interface Props {
  history: WorkoutHistoryEntry[]
  benchmarks: BenchmarkHistory
  currentWeight: number
  variantSelections: VariantSelections
  now: Date
  storageWarning: string | null
  onBack: () => void
}

const formatDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'None yet'
const series = (values: number[]) => values.join(' / ') || '—'
const rirSeries = (values: number[]) => values.map((value) => value === 4 ? '4+' : value).join(' / ') || '—'

export function ProgressPage({ history, benchmarks, currentWeight, variantSelections, now, storageWarning, onBack }: Props) {
  const ordered = sortHistory(history)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(ordered[0]?.id ?? null)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(ordered[0]?.exercises.find((item) => item.status === 'completed')?.exerciseId ?? 'floor-press')
  const [period, setPeriod] = useState<AnalyticsPeriod>('recent')
  const selectedWorkout = ordered.find((entry) => entry.id === selectedWorkoutId) ?? null
  const selectedExercise = analyticsExercises.find((exercise) => exercise.id === selectedExerciseId) ?? analyticsExercises[0]
  const currentVariant = getCurrentVariant(selectedExercise, variantSelections)
  const trend = getExerciseAnalytics(selectedExercise, history, currentWeight, period, now, currentVariant.id)
  const groupedPerformances = groupExerciseHistoryByVariant(history, selectedExercise)
  const advanceEvents = getDifficultyAdvanceEvents(history)
  const previousVariant = currentVariant.level > 0 ? getExerciseVariant(selectedExercise.id, currentVariant.level === 1 ? selectedExercise.id : `${selectedExercise.id}-level-${currentVariant.level - 1}`) : null
  const benchmark = originalBenchmark(benchmarks[selectedExercise.id])
  const achievements = getAchievementStates(history, benchmarks)
  const recentWeeks = getRecentWeeks(history, now, 4)

  return <div className="progress-shell">
    <SecondaryPageHeader title="Progress" onBack={onBack} />
    <main className="progress-main">
      <span className="small-label">YOUR TRAINING</span><h1>Progress</h1>
      {history.length === 0 && <p className="progress-empty-intro"><strong>NO WORKOUT HISTORY YET</strong><span>Complete your first scheduled workout to see progress, weekly consistency, and earned milestones here.</span></p>}
      {storageWarning && <p className="storage-warning" role="status">{storageWarning}</p>}
      <section className="consistency-section" aria-labelledby="consistency-heading"><div className="progress-section-heading"><span className="small-label">CONSISTENCY</span><h2 id="consistency-heading">Your training rhythm</h2></div>
        <div className="consistency-facts"><div><strong>{getCurrentPerfectWeekStreak(history, now)}</strong><span>CURRENT WEEK STREAK</span></div><div><strong>{getBestPerfectWeekStreak(history)}</strong><span>BEST WEEK STREAK</span></div><div><strong>{getPerfectWeekCount(history)}</strong><span>PERFECT WEEKS</span></div><div><strong>{history.length}</strong><span>SCHEDULED WORKOUTS</span></div><div><strong>{getEarnedProgressionCount(history)}</strong><span>PROGRESSION STEPS</span></div></div>
        <div className="recent-weeks" aria-label="Recent training weeks">{recentWeeks.map((week) => <div key={week.weekStart.toISOString()}><time>{week.weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}–{week.weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time><span>{requiredWorkoutIds.map((id, index) => `${'ABC'[index]} ${week.completedWorkoutIds.includes(id) ? 'complete' : 'open'}`).join(' · ')}</span><strong>{week.isPerfectWeek ? 'PERFECT WEEK' : `${week.completedCount} / 3`}</strong></div>)}</div>
      </section>
      <section className="milestones-section" aria-labelledby="milestones-heading"><div className="progress-section-heading"><span className="small-label">MILESTONES</span><h2 id="milestones-heading">Earned along the way</h2></div><div className="milestone-list">{achievements.map((item) => <div key={item.id} className={item.unlocked ? 'unlocked' : ''}><span aria-hidden="true">{item.unlocked ? '✓' : '○'}</span><div><strong>{item.title}</strong><small>{item.description}</small></div><span>{item.unlockedAt ? new Date(item.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : item.progress ?? 'IN PROGRESS'}</span></div>)}</div></section>
      <div className="progress-sections">
        <section aria-labelledby="history-heading"><div className="progress-section-heading"><span className="small-label">01 / TRAINING HISTORY</span><h2 id="history-heading">Completed workouts</h2></div>
          {ordered.length === 0 ? <p className="progress-empty">Complete a scheduled workout to create your first history entry.</p> : <div className="history-list">{ordered.map((entry) => {
            const summary = historyEntrySummary(entry)
            const workout = workouts.find((item) => item.id === entry.workoutId)
            return <button type="button" key={entry.id} className={`history-card ${selectedWorkoutId === entry.id ? 'selected' : ''}`} aria-pressed={selectedWorkoutId === entry.id} onClick={() => setSelectedWorkoutId(selectedWorkoutId === entry.id ? null : entry.id)}>
              <span>{formatDateTime(entry.completedAt)}</span><strong>{workout?.name ?? entry.workoutId}</strong>
              <small>{summary.completed} / {entry.exercises.length} exercises · {summary.skipped} skipped</small>
              <small>{summary.sets} sets · {summary.reps} reps · {summary.minutes} min</small>
            </button>
          })}</div>}
          {selectedWorkout && <div className="history-detail"><div className="history-detail-heading"><span className="small-label">WORKOUT DETAIL</span><strong>{workouts.find((item) => item.id === selectedWorkout.workoutId)?.name}</strong><small>{formatDateTime(selectedWorkout.completedAt)} · {selectedWorkout.dumbbellWeight} lb dumbbells</small></div>
            <ol>{selectedWorkout.exercises.map((item, index) => {
              const exercise = resolveExercise(workouts.find((workout) => workout.id === selectedWorkout.workoutId)!.exercises[index], item.variantId)
              const unit = exerciseUnit(exercise)
              return <li key={item.exerciseId}><div><strong>{exercise.name}</strong><small>{item.status === 'skipped' ? 'SKIPPED' : `${selectedWorkout.dumbbellWeight} lb · ${item.dumbbellCount} dumbbell${item.dumbbellCount === 2 ? 's' : ''}`}</small></div>
                {item.sets.length > 0 && <div className="history-set-values"><span>Target <b>{series(item.sets.map((set) => set.targetReps))} {unit}</b></span><span>Actual <b>{series(item.sets.map((set) => set.actualReps))} {unit}</b></span><span>RIR <b>{rirSeries(item.sets.map((set) => set.rir))}</b></span></div>}
              </li>
            })}</ol>
          </div>}
        </section>
        <section aria-labelledby="exercise-progress-heading"><div className="progress-section-heading"><span className="small-label">02 / EXERCISE PROGRESS</span><h2 id="exercise-progress-heading">Exercise history</h2></div>
          <label className="progress-exercise-label" htmlFor="progress-exercise">EXERCISE</label><select id="progress-exercise" value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)}>{analyticsExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select>
          <div className="exercise-variant-current"><span className="small-label">CURRENT VARIATION</span><strong>{currentVariant.name}</strong><small>Difficulty {currentVariant.level + 1} / {getExerciseFamily(selectedExercise.id)?.variantIds.length} · {currentVariant.repRange} reps</small>{previousVariant && <small>Previous: {previousVariant.name} · REP RANGE COMPLETE</small>}</div>
          <div className="exercise-trend"><div className="exercise-trend-top"><div><span className="small-label">CURRENT STATUS · {currentWeight} LB</span><strong>{exerciseTrendLabel[trend.status]}</strong></div><div className="insight-period" role="group" aria-label="Exercise analysis period"><button type="button" aria-pressed={period === 'recent'} onClick={() => setPeriod('recent')}>LAST 6 WEEKS</button><button type="button" aria-pressed={period === 'all'} onClick={() => setPeriod('all')}>ALL TIME</button></div></div><div className="exercise-trend-facts"><span>Next target <b>{series(trend.currentTarget ?? (currentVariant.level > 0 ? getVariantInitialTargets(selectedExercise, currentVariant.id) : []))}</b></span><span>Started <b>{series(trend.firstTarget ?? [])}</b></span><span>Progression steps <b>{trend.progressionSteps}</b></span><span>Difficulty advances <b>{trend.difficultyAdvances}</b></span><span>Completed sessions <b>{trend.completedPerformances}</b></span><span>Last progression <b>{formatDate(trend.lastProgressionAt)}</b></span><span>Current holds <b>{trend.consecutiveHolds}</b></span></div><small>Current variation at this weight. Rep steps are counted within one variation; difficulty advances are separate.</small></div>
          {benchmark && <div className="progress-benchmark"><span className="small-label">ORIGINAL BENCHMARK</span><strong>{benchmark.weight} lb × {benchmark.reps} reps</strong><small>Single benchmark set · separate from working sets</small></div>}
          <div className="exercise-performance-list">{groupedPerformances.length === 0 ? <p className="progress-empty">Complete this exercise in a scheduled workout to see its set history.</p> : groupedPerformances.map((group) => {
            const variant = getExerciseVariant(selectedExercise.id, group.variantId)!
            return <section key={group.variantId} className="variant-history-group" aria-label={`${variant.name} history`}><h3>{variant.name} <small>DIFFICULTY {variant.level + 1} / {getExerciseFamily(selectedExercise.id)?.variantIds.length}</small></h3>{group.performances.map(({ workout: entry, exercise: item }) => <article key={entry.id} className="performance-row"><time dateTime={entry.completedAt}>{formatDateTime(entry.completedAt)}</time><strong>{entry.dumbbellWeight} lb · {item.dumbbellCount} dumbbell{item.dumbbellCount === 2 ? 's' : ''}</strong><span>Target {series(item.sets.map((set) => set.targetReps))}</span><span>Actual {series(item.sets.map((set) => set.actualReps))}</span><span>RIR {rirSeries(item.sets.map((set) => set.rir))}</span>{advanceEvents.some((event) => event.workoutId === entry.id && event.exerciseId === selectedExercise.id) && <span className="variant-advance-tag">DIFFICULTY ADVANCED</span>}</article>)}</section>
          })}</div>
          {groupedPerformances.length > 0 && <p className="progress-footnote">Current dumbbells: {currentWeight} lb. Targets use completed history for this variation and weight.</p>}
        </section>
      </div>
    </main>
  </div>
}
