import { useState } from 'react'
import { ArrowDownToLine, ChevronLeft, ChevronRight } from 'lucide-react'
import { assignWorkoutDay, setWorkoutTime } from '../../lib/profile'
import { scheduleCalendarFile } from '../../lib/calendar'
import { localWeekDay } from '../../lib/schedule'
import { completedWorkoutIdsOnLocalDate } from '../../lib/consistency'
import type { TrainingSchedule } from '../../types/profile'
import type { WorkoutHistoryEntry } from '../../types/training'

interface Props { schedule: TrainingSchedule; today: Date; history: WorkoutHistoryEntry[]; onChange: (schedule: TrainingSchedule) => void }
const titles = ['Full Body A', 'Full Body B', 'Full Body C'] as const
const shortDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const displayTime = (time: string) => new Date(2026, 0, 1, ...time.split(':').map(Number)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

export function TrainingCalendar({ schedule, today, history, onChange }: Props) {
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<0 | 1 | 2>(0)
  const [notice, setNotice] = useState('')
  const firstWeekday = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => index - firstWeekday + 1)
  const moveMonth = (offset: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1))
  const chooseDate = (date: Date) => {
    const target = schedule.slots[selected]
    const next = assignWorkoutDay(schedule, target.workoutId, localWeekDay(date))
    if (next !== schedule) onChange(next)
    setNotice(`${titles[selected]} is now every ${localWeekDay(date)} at ${displayTime(target.time)}.`)
  }
  const changeTime = (index: 0 | 1 | 2, time: string) => {
    const next = setWorkoutTime(schedule, schedule.slots[index].workoutId, time)
    if (next !== schedule) { onChange(next); setNotice(`${titles[index]} time saved: ${displayTime(time)}.`) }
  }
  const exportCalendar = () => {
    const file = new Blob([scheduleCalendarFile(schedule, new Date())], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'full-body-workouts.ics'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    setNotice('Calendar file downloaded. Import it into your calendar app.')
  }

  return <section className="training-calendar" aria-labelledby="calendar-title">
    <div className="calendar-intro"><div><span className="small-label">YOUR WEEK, AT A GLANCE</span><h2 id="calendar-title">Training calendar</h2><p>Pick a workout, then choose a date to set its weekly day. Tap an occupied day to swap workouts.</p></div><button type="button" className="calendar-export" onClick={exportCalendar}><ArrowDownToLine size={16} /> EXPORT CALENDAR</button></div>
    <div className="calendar-layout">
      <div className="calendar-board">
        <div className="calendar-toolbar"><strong>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><div><button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button></div></div>
        <table><thead><tr>{shortDays.map((day) => <th key={day} scope="col">{day}</th>)}</tr></thead><tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((day, index) => {
          if (day < 1 || day > daysInMonth) return <td key={index} className="calendar-empty" />
          const date = new Date(month.getFullYear(), month.getMonth(), day)
          const slotIndex = schedule.slots.findIndex((slot) => slot.day === localWeekDay(date))
          const slot = slotIndex >= 0 ? schedule.slots[slotIndex] : null
          const completed = completedWorkoutIdsOnLocalDate(history, date)
          const isToday = date.toDateString() === today.toDateString()
          return <td key={index}><button type="button" className={`calendar-date ${slot ? 'has-workout' : ''} ${completed.length ? 'has-completion' : ''} ${slotIndex === selected ? 'selected-workout' : ''} ${isToday ? 'is-today' : ''}`} onClick={() => chooseDate(date)} aria-label={`${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${slot ? `, planned ${titles[slotIndex]} at ${displayTime(slot.time)}` : ', no workout planned'}${completed.length ? `, completed ${completed.map((id) => `Full Body ${id.at(-1)?.toUpperCase()}`).join(' and ')}` : ''}. Set ${titles[selected]} to this weekday.`}><span className="calendar-day-number">{day}</span>{slot && <span className="calendar-event" aria-label={`Planned ${titles[slotIndex]}`}><strong>{'ABC'[slotIndex]}</strong><small>{displayTime(slot.time)}</small></span>}{completed.length > 0 && <span className="calendar-completed" aria-label={`Completed ${completed.map((id) => `Full Body ${id.at(-1)?.toUpperCase()}`).join(' and ')}`}>✓ {completed.map((id) => id.at(-1)?.toUpperCase()).join(' · ')}</span>}</button></td>
        })}</tr>)}</tbody></table>
      </div>
      <div className="calendar-plans"><span className="small-label">WEEKLY PLAN</span>{schedule.slots.map((slot, index) => <div className={`calendar-plan ${selected === index ? 'active' : ''}`} key={slot.workoutId}><button type="button" className="calendar-plan-pick" onClick={() => setSelected(index as 0 | 1 | 2)} aria-pressed={selected === index}><b>{'ABC'[index]}</b><span><strong>{titles[index]}</strong><small>{slot.day}</small></span></button><label>TIME <input type="time" value={slot.time} onChange={(event) => changeTime(index as 0 | 1 | 2, event.target.value)} aria-label={`${titles[index]} start time`} /></label></div>)}<p className="calendar-export-note">Export creates three weekly recurring, 60-minute events in your local calendar time. Re-export after changing your plan.</p>{notice && <p className="calendar-notice" role="status">{notice}</p>}</div>
    </div>
  </section>
}
