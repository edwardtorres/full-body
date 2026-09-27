import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Menu, RotateCcw } from 'lucide-react'
import { MuscleInfoPanel } from './components/anatomy/MuscleInfoPanel'
import type { BodyView } from './components/anatomy/CameraControls'
import { WorkoutSession, type SessionPlan } from './components/dashboard/WorkoutSession'
import { ActiveWorkoutPage, WorkoutSummary } from './components/dashboard/ActiveWorkoutPage'
import { ProgressPage } from './components/progress/ProgressPage'
import { InsightPage } from './components/analytics/InsightPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { TrainingCalendar } from './components/dashboard/TrainingCalendar'
import { WeeklyStatus } from './components/dashboard/WeeklyStatus'
import { OnboardingFlow } from './components/onboarding/OnboardingFlow'
import { BenchmarkPage } from './components/benchmark/BenchmarkPage'
import { MenuDrawer } from './components/navigation/MenuDrawer'
import { RecoveryPage } from './components/recovery/RecoveryPage'
import { BodyMapPlaceholder } from './components/shared/BodyMapPlaceholder'
import { workouts } from './data/workouts'
import { muscleInfo } from './data/muscles'
import { benchmarkExercises, muscleBenchmarkExercise } from './data/benchmark'
import { quickExerciseForMuscle } from './lib/training'
import { completedMusclesForSession, createActiveWorkout } from './lib/activeWorkout'
import { browserActiveWorkoutRepository } from './lib/activeWorkoutRepository'
import { browserWorkoutHistoryRepository, type HistoryIssue } from './lib/workoutHistoryRepository'
import { historyEntryFromSession, historyEntrySummary } from './lib/workoutHistory'
import { localDateKey } from './lib/consistency'
import { nextWorkout, todaysWorkout } from './lib/schedule'
import { latestBenchmark } from './lib/profile'
import { browserProfileRepository, type StorageIssue } from './lib/profileRepository'
import { resetAppData } from './lib/reset'
import { browserVariantRepository, type VariantStorageIssue } from './lib/variantRepository'
import { canSelectVariant, type VariantSelections } from './lib/variants'
import { resolveExercise } from './data/exerciseVariants'
import { browserRecoveryRepository, type RecoveryIssue } from './lib/recoveryRepository'
import { recoveryCheckInLabel, recoveryDate, type RecoveryCheckIn } from './lib/recovery'
import { muscleGroups, type ActiveWorkoutSession, type MuscleGroup, type Workout } from './types/training'
import type { PersistedProfile } from './types/profile'

const views: BodyView[] = ['front', 'back']
const AnatomyScene = lazy(() => import('./components/anatomy/AnatomyScene').then((module) => ({ default: module.AnatomyScene })))
const posteriorMuscles = new Set<MuscleGroup>(['triceps', 'hamstrings', 'glutes', 'calves', 'upperBack', 'lats'])
const storageMessage = (issue: StorageIssue) => {
  if (issue === 'corrupt') return 'Saved setup was unreadable. Starting fresh.'
  if (issue === 'unsupported-version') return 'A newer saved profile was found. Changes this visit cannot be saved.'
  if (issue) return 'Settings are available for this visit, but cannot be saved on this device.'
  return null
}
const historyMessage = (issue: HistoryIssue) => {
  if (issue === 'corrupt') return 'Some saved workout history was unreadable. Valid workouts are still shown.'
  if (issue === 'unsupported-version') return 'Newer workout history was found. This visit cannot save workouts.'
  if (issue) return 'Workout history could not be saved on this device.'
  return null
}
const recoveryMessage = (issue: RecoveryIssue) => {
  if (issue === 'corrupt') return 'Your previous check-in could not be read. You can make a new one today.'
  if (issue === 'unsupported-version') return 'A newer check-in was found. This visit cannot replace it.'
  if (issue) return 'Full Body could not save this check-in locally. It may not survive a refresh.'
  return null
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

function App() {
  const [initialProfile] = useState(() => browserProfileRepository.load())
  const [profileState, setProfileState] = useState<PersistedProfile>(initialProfile.state)
  const [storageIssue, setStorageIssue] = useState<StorageIssue>(initialProfile.issue)
  const [page, setPage] = useState<'dashboard' | 'benchmark' | 'progress' | 'strong' | 'weak' | 'health' | 'settings'>('dashboard')
  const dashboardScroll = useRef(0)
  const dashboardReturnFocus = useRef('.menu-button')
  const [initialHistory] = useState(() => browserWorkoutHistoryRepository.load())
  const [history, setHistory] = useState(initialHistory.entries)
  const [historyIssue, setHistoryIssue] = useState<HistoryIssue>(initialHistory.issue)
  const [initialVariants] = useState(() => browserVariantRepository.load())
  const [initialRecovery] = useState(() => browserRecoveryRepository.load(new Date()))
  const [recoveryCheckIn, setRecoveryCheckIn] = useState<RecoveryCheckIn | null>(initialRecovery.checkIn)
  const [recoveryIssue, setRecoveryIssue] = useState<RecoveryIssue>(initialRecovery.issue)
  const [variantIssue, setVariantIssue] = useState<VariantStorageIssue>(initialVariants.issue)
  const [variantSelections, setVariantSelections] = useState<VariantSelections>(() => Object.fromEntries(Object.entries(initialVariants.selections).filter(([id, variantId]) => {
    const base = workouts.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === id)
    return base && canSelectVariant(initialHistory.entries, base, variantId)
  })))
  const [view, setView] = useState<BodyView>('front')
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null)
  const [regionalSessionCompletedMuscles, setRegionalSessionCompletedMuscles] = useState<Set<MuscleGroup>>(() => new Set())
  const [regionalSession, setRegionalSession] = useState<SessionPlan | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutSession | null>(() => browserActiveWorkoutRepository.load(initialProfile.state.profile.equipment.dumbbellWeight))
  const [activeSaveIssue, setActiveSaveIssue] = useState(false)
  const [finishedWorkout, setFinishedWorkout] = useState<ActiveWorkoutSession | null>(null)
  const [workoutMode, setWorkoutMode] = useState<'dashboard' | 'active' | 'summary'>('dashboard')
  const previousWorkoutMode = useRef(workoutMode)
  const [pendingWorkout, setPendingWorkout] = useState<Workout | null>(null)
  const [localNow, setLocalNow] = useState(() => new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const previousPage = useRef(page)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDayReset, setConfirmDayReset] = useState(false)
  const [dayResetError, setDayResetError] = useState(false)
  const resetDayButtonRef = useRef<HTMLButtonElement>(null)
  const resetDayDialogRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  useEffect(() => { const timer = window.setInterval(() => setLocalNow(new Date()), 60_000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    if (previousPage.current === page) return
    previousPage.current = page
    const frame = window.requestAnimationFrame(() => {
      if (page === 'dashboard') {
        window.scrollTo(0, dashboardScroll.current)
        document.querySelector<HTMLElement>(dashboardReturnFocus.current)?.focus({ preventScroll: true })
      } else {
        window.scrollTo(0, 0)
        const heading = document.querySelector<HTMLElement>('main h1')
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [page])
  useEffect(() => {
    if (previousWorkoutMode.current === workoutMode) return
    previousWorkoutMode.current = workoutMode
    const frame = window.requestAnimationFrame(() => {
      if (workoutMode !== 'dashboard') window.scrollTo(0, 0)
      const heading = document.querySelector<HTMLElement>(workoutMode === 'dashboard' ? '.today-plan h1' : '.active-workout-main h1, .workout-summary h1')
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [workoutMode])
  useEffect(() => {
    if (!confirmDayReset) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setConfirmDayReset(false); return }
      if (event.key !== 'Tab') return
      const buttons = Array.from(resetDayDialogRef.current?.querySelectorAll('button') ?? [])
      if (!buttons.length) return
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); if (!resetDayButtonRef.current?.disabled) resetDayButtonRef.current?.focus() }
  }, [confirmDayReset])
  const today = todaysWorkout(profileState.profile.schedule, workouts, localNow)
  const next = nextWorkout(profileState.profile.schedule, workouts, localNow)
  const visibleWorkout = activeWorkout ? workouts.find((item) => item.id === activeWorkout.workoutId)! : today ?? next?.workout ?? workouts[0]
  const progressSession = [activeWorkout, finishedWorkout].find((session) => session?.workoutId === visibleWorkout.id) ?? null
  const scheduledWorkoutCompletedMuscles = useMemo(() => progressSession ? completedMusclesForSession(visibleWorkout, progressSession) : new Set<MuscleGroup>(), [visibleWorkout, progressSession])
  const todayHistoryCount = history.filter((entry) => localDateKey(new Date(entry.completedAt)) === localDateKey(localNow)).length
  const canResetToday = Boolean(activeWorkout || todayHistoryCount || regionalSessionCompletedMuscles.size)
  const todayRecovery = recoveryCheckIn?.date === recoveryDate(localNow) ? recoveryCheckIn : null
  const dayResetItems = [todayHistoryCount ? `${todayHistoryCount} completed workout${todayHistoryCount === 1 ? '' : 's'}` : null,
    activeWorkout ? 'the workout in progress' : null, regionalSessionCompletedMuscles.size ? 'quick-workout checks' : null].filter(Boolean).join(', ')

  const saveProfile = (next: PersistedProfile) => {
    setProfileState(next)
    const result = browserProfileRepository.save(next)
    setStorageIssue(result.issue)
  }
  const openPage = (destination: typeof page) => {
    if (page === 'dashboard' && destination !== 'dashboard') {
      dashboardScroll.current = window.scrollY
      const trigger = document.activeElement as HTMLElement | null
      dashboardReturnFocus.current = trigger?.closest('.dashboard-recovery-link') ? '.dashboard-recovery-link'
        : trigger?.closest('.recent-training') ? '.recent-training button' : '.menu-button'
    }
    setPage(destination)
  }
  const backToDashboard = () => setPage('dashboard')
  const saveRecovery = (checkIn: RecoveryCheckIn): boolean => {
    const result = browserRecoveryRepository.save(checkIn)
    setRecoveryIssue(result.issue)
    if (result.ok) setRecoveryCheckIn(checkIn)
    return result.ok
  }
  const selectVariant = (exerciseId: string, variantId: string): boolean => {
    const base = workouts.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === exerciseId)
    if (!base || !canSelectVariant(history, base, variantId)) return false
    const next = { ...variantSelections, [exerciseId]: variantId }
    const result = browserVariantRepository.save(next)
    setVariantIssue(result.issue)
    if (!result.ok) return false
    setVariantSelections(next)
    return true
  }

  const closeSession = useCallback(() => setRegionalSession(null), [])
  const clearSelectedMuscle = useCallback(() => setSelectedMuscle(null), [])
  const selectMuscle = useCallback((muscle: MuscleGroup) => setSelectedMuscle((current) => current === muscle ? null : muscle), [])
  const chooseMuscle = (muscle: MuscleGroup) => {
    selectMuscle(muscle)
    setView(posteriorMuscles.has(muscle) ? 'back' : 'front')
  }
  const startMuscle = (muscle: MuscleGroup) => {
    setNotice(null)
    const base = quickExerciseForMuscle(workouts, muscle)
    setRegionalSession({ kind: 'regional', muscle, exercises: [resolveExercise(base, variantSelections[base.id])], index: 0 })
  }
  const saveActiveWorkout = (session: ActiveWorkoutSession) => {
    setActiveWorkout(session)
    setActiveSaveIssue(!browserActiveWorkoutRepository.save(session))
  }
  const startFullWorkout = (workout: Workout) => {
    setNotice(null)
    if (activeWorkout) {
      if (activeWorkout.workoutId === workout.id) setWorkoutMode('active')
      else setPendingWorkout(workout)
      return
    }
    const slot = profileState.profile.schedule.slots.find((item) => item.workoutId === workout.id)
    saveActiveWorkout(createActiveWorkout(workout, slot!.day, new Date(), crypto.randomUUID(), profileState.profile.equipment.dumbbellWeight, variantSelections))
    setFinishedWorkout(null)
    setWorkoutMode('active')
  }
  const advanceSession = (markDone: boolean) => {
    if (!regionalSession) return
    if (markDone) {
      setRegionalSessionCompletedMuscles((previous) => new Set(regionalSession.muscle ? [...previous, regionalSession.muscle] : previous))
    }
    setNotice(markDone ? `${muscleInfo[regionalSession.muscle!].label} quick workout complete` : 'Quick workout ended')
    setRegionalSession(null)
  }
  const resetToday = () => {
    setDayResetError(false)
    if (todayHistoryCount) {
      const result = browserWorkoutHistoryRepository.removeCompletedOnLocalDate(new Date())
      setHistoryIssue(result.issue)
      if (!result.saved) { setDayResetError(true); return }
      setHistory(result.entries)
      const validSelections = Object.fromEntries(Object.entries(variantSelections).filter(([id, variantId]) => {
        const base = workouts.flatMap((workout) => workout.exercises).find((exercise) => exercise.id === id)
        return base && canSelectVariant(result.entries, base, variantId)
      })) as VariantSelections
      if (Object.keys(validSelections).length !== Object.keys(variantSelections).length) {
        setVariantSelections(validSelections)
        setVariantIssue(browserVariantRepository.save(validSelections).issue)
      }
    }
    if (activeWorkout && !browserActiveWorkoutRepository.clear()) { setDayResetError(true); return }
    setActiveWorkout(null)
    setActiveSaveIssue(false)
    setFinishedWorkout(null)
    setRegionalSessionCompletedMuscles(new Set())
    setRegionalSession(null)
    setSelectedMuscle(null)
    setPendingWorkout(null)
    setWorkoutMode('dashboard')
    setConfirmDayReset(false)
    setNotice('Today’s workout progress was reset.')
  }

  if (!profileState.onboarding.completed) return <OnboardingFlow state={profileState} onChange={saveProfile} storageWarning={storageMessage(storageIssue)} />
  if (page === 'benchmark') return <BenchmarkPage state={profileState} onSave={saveProfile} onBack={backToDashboard} storageWarning={storageMessage(storageIssue)} />
  if (page === 'progress') return <ProgressPage history={history} benchmarks={profileState.benchmarks} currentWeight={profileState.profile.equipment.dumbbellWeight} variantSelections={variantSelections} now={localNow} storageWarning={historyMessage(historyIssue)} onBack={backToDashboard} />
  if (page === 'strong' || page === 'weak') return <InsightPage mode={page} history={history} weight={profileState.profile.equipment.dumbbellWeight} variantSelections={variantSelections} now={localNow} reducedMotion={reducedMotion} storageWarning={historyMessage(historyIssue)} onBack={backToDashboard} />
  if (page === 'health') return <RecoveryPage today={localNow} checkIn={todayRecovery} warning={recoveryMessage(recoveryIssue)} onSave={saveRecovery} onBack={backToDashboard} />
  if (page === 'settings') return <SettingsPage state={profileState} onSave={saveProfile} onBack={backToDashboard} history={history} selections={variantSelections} onSelectVariant={selectVariant} variantWarning={variantIssue ? 'Exercise difficulty could not be saved on this device.' : null} storageWarning={storageMessage(storageIssue)} />
  if (workoutMode === 'active' && activeWorkout) {
    const workout = workouts.find((item) => item.id === activeWorkout.workoutId)!
    return <ActiveWorkoutPage session={activeWorkout} workout={workout} benchmarks={profileState.benchmarks} history={history} weight={activeWorkout.dumbbellWeight} storageWarning={activeSaveIssue ? 'Full Body could not save this session locally. You can keep training, but progress may not survive a refresh.' : historyMessage(historyIssue)} reducedMotion={reducedMotion} onChange={saveActiveWorkout} onLeave={() => setWorkoutMode('dashboard')} onAbandon={() => { browserActiveWorkoutRepository.clear(); setActiveWorkout(null); setActiveSaveIssue(false); setWorkoutMode('dashboard') }} onFinish={(completed) => { const entry = historyEntryFromSession(completed, workout, new Date()); if (!entry) return; const result = browserWorkoutHistoryRepository.append(entry); setHistoryIssue(result.issue); if (!result.saved) return; setHistory(result.entries); browserActiveWorkoutRepository.clear(); setActiveWorkout(null); setActiveSaveIssue(false); setFinishedWorkout(completed); setWorkoutMode('summary') }} />
  }
  if (workoutMode === 'summary' && finishedWorkout) {
    const workout = workouts.find((item) => item.id === finishedWorkout.workoutId)!
    return <WorkoutSummary session={finishedWorkout} workout={workout} history={history} reducedMotion={reducedMotion} variantWarning={variantIssue ? 'Full Body could not save your variation choice locally.' : null} onSelectVariant={selectVariant} onReturn={() => setWorkoutMode('dashboard')} />
  }

  const selectedBenchmarkId = selectedMuscle ? muscleBenchmarkExercise[selectedMuscle] : undefined
  const selectedBenchmark = selectedBenchmarkId ? latestBenchmark(profileState.benchmarks[selectedBenchmarkId]) : null
  const selectedBenchmarkName = selectedBenchmarkId ? benchmarkExercises.find((exercise) => exercise.id === selectedBenchmarkId)?.name ?? null : null

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand" aria-label="Full Body"><span className="brand-mark" aria-hidden="true"><span /></span><span>FULL<span className="brand-divider">/</span>BODY</span></div>
      <button type="button" className="menu-button" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen} aria-label="Open menu"><span>MENU</span><Menu size={18} strokeWidth={1.7} /></button>
    </header>

    <section className="today-plan" aria-label="Workout plan at a glance">
      <div className="today-plan-heading">
        <span className="small-label">{localNow.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</span>
        <h1>{activeWorkout ? visibleWorkout.name : today ? today.name : 'Rest day'}</h1>
        {!today && !activeWorkout && <p>Next workout · {next?.date.toLocaleDateString(undefined, { weekday: 'long' })} · {visibleWorkout.name}</p>}
        {activeWorkout && <p>Workout in progress</p>}
        <button ref={resetDayButtonRef} type="button" className="reset-day-button" disabled={!canResetToday} onClick={() => { setDayResetError(false); setConfirmDayReset(true) }}><RotateCcw size={13} /> RESET TODAY</button>
      </div>
      <div className="today-plan-routine">
        <span className="small-label">{activeWorkout ? 'IN PROGRESS' : today ? 'TODAY’S ROUTINE' : 'NEXT ROUTINE'} · {visibleWorkout.exercises.length} EXERCISES</span>
        <ol>{visibleWorkout.exercises.map((exercise, index) => <li key={exercise.id}><span>{String(index + 1).padStart(2, '0')}</span>{resolveExercise(exercise, activeWorkout?.exercises[index].variantId ?? variantSelections[exercise.id]).name}</li>)}</ol>
      </div>
    </section>

    <main className="dashboard">
      <section className="hero-column" aria-label="Interactive anatomy">
        <h2 className="visually-hidden">Choose a muscle to start training</h2>
        <div className="anatomy-stage">
          <span className="stage-prompt">CHOOSE A MUSCLE</span>
          <div className="stage-halo" aria-hidden="true" />
          <div className="anatomy-canvas"><Suspense fallback={<BodyMapPlaceholder />}><AnatomyScene view={view} selectedMuscle={selectedMuscle} completedMuscles={scheduledWorkoutCompletedMuscles} onSelect={selectMuscle} onClear={clearSelectedMuscle} reducedMotion={reducedMotion} /></Suspense></div>
          {selectedMuscle && <div className="stage-callout">
            <span className="callout-line" aria-hidden="true" />
            <strong>{muscleInfo[selectedMuscle].label}</strong>
            <button type="button" onClick={() => startMuscle(selectedMuscle)}>START <ArrowRight size={15} /></button>
          </div>}
        </div>
        <div className="viewbar" aria-label="Anatomy camera views">
          <div className="view-buttons">{views.map((option) => <button key={option} type="button" className={view === option ? 'view-button active' : 'view-button'} onClick={() => setView(option)} aria-pressed={view === option}>{option.toUpperCase()}</button>)}</div>
        </div>
        <div className="region-index" aria-label="Choose muscle by name">
          <div className="region-list">{muscleGroups.map((muscle) => <button key={muscle} type="button" className={`region-chip ${selectedMuscle === muscle ? 'selected' : ''} ${scheduledWorkoutCompletedMuscles.has(muscle) ? 'completed' : ''}`} onClick={() => chooseMuscle(muscle)} aria-pressed={selectedMuscle === muscle} aria-label={`${muscleInfo[muscle].label}${scheduledWorkoutCompletedMuscles.has(muscle) ? ', completed' : ''}`}><span className="chip-indicator" />{muscleInfo[muscle].label}{scheduledWorkoutCompletedMuscles.has(muscle) && <span className="chip-complete-mark" aria-hidden="true">✓</span>}</button>)}</div>
        </div>
      </section>

      <aside className="sidebar" aria-label="Workout overview">
        <div className="sidebar-intro"><span className="small-label">START TRAINING</span></div>
        <div className="full-workout-launch"><button className="start-button" type="button" onClick={() => activeWorkout ? setWorkoutMode('active') : startFullWorkout(visibleWorkout)}>{activeWorkout ? 'CONTINUE COMPLETE WORKOUT' : 'START COMPLETE WORKOUT'} <ArrowRight size={18} /></button></div>
        <WeeklyStatus history={history} now={localNow} />
        <button type="button" className="dashboard-recovery-link" onClick={() => openPage('health')}><span className="small-label">{todayRecovery ? 'TODAY · RECOVERY CHECK-IN' : 'OPTIONAL RECOVERY CHECK-IN'}</span><span>{todayRecovery ? recoveryCheckInLabel(todayRecovery) : 'Take a moment to reflect'} <ArrowRight size={14} /></span></button>
        <MuscleInfoPanel muscle={selectedMuscle} exercise={selectedMuscle ? resolveExercise(quickExerciseForMuscle(workouts, selectedMuscle), variantSelections[quickExerciseForMuscle(workouts, selectedMuscle).id]) : null} regionalCompleted={selectedMuscle ? regionalSessionCompletedMuscles.has(selectedMuscle) : false} benchmark={selectedBenchmark} benchmarkExerciseName={selectedBenchmarkName} onClear={() => setSelectedMuscle(null)} />
        {notice && <p className="session-notice" role="status">{notice}</p>}
        {history[0] && <div className="recent-training"><span className="small-label">LAST WORKOUT</span><strong>{workouts.find((item) => item.id === history[0].workoutId)?.name}</strong><span>{historyEntrySummary(history[0]).completed} / {history[0].exercises.length} complete</span><button type="button" onClick={() => openPage('progress')}>VIEW PROGRESS <ArrowRight size={14} /></button></div>}
        {historyMessage(historyIssue) && <p className="session-notice" role="status">{historyMessage(historyIssue)}</p>}
        {activeSaveIssue && <p className="storage-warning" role="alert">Full Body could not save this session locally. Progress may not survive a refresh.</p>}

      </aside>
    </main>

    <TrainingCalendar schedule={profileState.profile.schedule} today={localNow} history={history} onChange={(schedule) => saveProfile({ ...profileState, profile: { ...profileState.profile, schedule } })} />

    <footer className="footer"><span>FULL BODY</span><span>{profileState.profile.equipment.dumbbellWeight} LB · {profileState.profile.schedule.slots.map((slot) => slot.day.slice(0, 3).toUpperCase()).join(' / ')}</span></footer>
    {storageMessage(storageIssue) && <p className="storage-warning dashboard-storage-warning" role="status">{storageMessage(storageIssue)}</p>}
    <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={openPage} currentPage={page} onReset={() => { try { if (!resetAppData(window.localStorage)) return false; window.location.reload(); return true } catch { return false } }} />
    {pendingWorkout && <div className="workout-confirm dashboard-confirm" role="alertdialog" aria-label="Start another workout?"><p>An unfinished {workouts.find((item) => item.id === activeWorkout?.workoutId)?.name} workout is saved. Discard it and start {pendingWorkout.name}?</p><div><button type="button" autoFocus onClick={() => setPendingWorkout(null)}>KEEP CURRENT</button><button type="button" onClick={() => { const workout = pendingWorkout; browserActiveWorkoutRepository.clear(); setActiveWorkout(null); setPendingWorkout(null); const slot = profileState.profile.schedule.slots.find((item) => item.workoutId === workout.id); saveActiveWorkout(createActiveWorkout(workout, slot!.day, new Date(), crypto.randomUUID(), profileState.profile.equipment.dumbbellWeight, variantSelections)); setWorkoutMode('active') }}>DISCARD & START</button></div></div>}
    {confirmDayReset && <div ref={resetDayDialogRef} className="workout-confirm dashboard-confirm reset-day-confirm" role="alertdialog" aria-modal="true" aria-label="Reset today's workout progress?" aria-describedby="reset-day-description"><p id="reset-day-description">Reset today’s progress? Removes {dayResetItems}. Earlier days, your schedule, and settings stay saved.</p>{dayResetError && <p role="alert">Reset could not be saved. Your browser may be blocking storage changes.</p>}<div><button type="button" autoFocus onClick={() => setConfirmDayReset(false)}>CANCEL</button><button type="button" onClick={resetToday}>RESET TODAY</button></div></div>}
    {regionalSession && <WorkoutSession session={regionalSession} onComplete={() => advanceSession(true)} onSkip={() => advanceSession(false)} onClose={closeSession} dumbbellWeight={profileState.profile.equipment.dumbbellWeight} benchmarks={profileState.benchmarks} />}
  </div>
}

export default App
