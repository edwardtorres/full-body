import { getCurrentPerfectWeekStreak, getWeeklyCompletion, requiredWorkoutIds } from '../../lib/consistency'
import type { WorkoutHistoryEntry } from '../../types/training'

export function WeeklyStatus({ history, now }: { history: WorkoutHistoryEntry[]; now: Date }) {
  const week = getWeeklyCompletion(history, now)
  const streak = getCurrentPerfectWeekStreak(history, now)
  return <section className="weekly-status" aria-label="This week's scheduled workouts">
    <div className="weekly-status-top"><span className="small-label">THIS WEEK</span><strong>{week.completedCount} / 3</strong></div>
    <div className="weekly-status-days">{requiredWorkoutIds.map((id, index) => <span key={id} aria-label={`Full Body ${'ABC'[index]} ${week.completedWorkoutIds.includes(id) ? 'complete' : 'not yet complete'}`}><b>{'ABC'[index]}</b><small>{week.completedWorkoutIds.includes(id) ? '✓ Complete' : '○ Open'}</small></span>)}</div>
    <div className="weekly-status-foot"><span>{week.isPerfectWeek ? 'PERFECT WEEK' : `${week.completedCount} / 3 workouts complete`}</span><span>{streak} WEEK STREAK</span></div>
  </section>
}
