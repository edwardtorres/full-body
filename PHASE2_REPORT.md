# Full Body — Phase 2 report

**Completed:** September 24, 2026  
**Scope:** First-run onboarding, performance benchmark, retest, and completion-state clarification

## 1. What was added

- A four-step onboarding flow: build-muscle goal, editable dumbbell weight and floor space, exactly three training days, and a short benchmark introduction.
- A skip route that finishes setup without inventing benchmark values.
- A five-movement benchmark with form cues, estimated two reps in reserve, accessible `1–100` repetition entry, progress, and a starting-point summary.
- A Benchmark destination in the menu showing original and latest values with their dates. A retest shows prior and new values before **Save New Benchmark** commits them.
- Benchmark values in relevant dashboard muscle panels and conservative working-set targets in the existing workout dialog.
- A separate scheduled-workout completion state for the main body map. Regional quick sessions keep their own temporary completion state.
- Lazy loading of the 3D scene so first-run setup loads without the large Three.js chunk.

## 2. Files created

| File | Purpose |
| --- | --- |
| [`src/types/profile.ts`](src/types/profile.ts) | Profile, goal, equipment, schedule, benchmark history, onboarding, and persisted-state types |
| [`src/data/benchmark.ts`](src/data/benchmark.ts) | Five stable benchmark exercise IDs, concise cues, and muscle-to-benchmark mapping |
| [`src/lib/profile.ts`](src/lib/profile.ts) | Defaults, three-day schedule replacement, rep validation, benchmark lookup, and target calculation |
| [`src/lib/profileRepository.ts`](src/lib/profileRepository.ts) | Versioned localStorage load/save and recovery behavior |
| [`src/lib/profile.test.ts`](src/lib/profile.test.ts) | New Phase 2 rule, persistence, and completion tests |
| [`src/components/onboarding/OnboardingFlow.tsx`](src/components/onboarding/OnboardingFlow.tsx) | First-run setup and benchmark summary |
| [`src/components/benchmark/BenchmarkEntry.tsx`](src/components/benchmark/BenchmarkEntry.tsx) | Shared benchmark/retest exercise entry |
| [`src/components/benchmark/BenchmarkPage.tsx`](src/components/benchmark/BenchmarkPage.tsx) | Saved values, retest, comparison, and confirmation |

## 3. Files modified

| File | Change |
| --- | --- |
| [`src/App.tsx`](src/App.tsx) | Profile loading, onboarding gate, Benchmark navigation, dashboard data, split completion state, lazy anatomy scene |
| [`src/types/training.ts`](src/types/training.ts) | Exercise dumbbell count and session kind |
| [`src/data/workouts.ts`](src/data/workouts.ts) | Exercise quantity independent of profile weight; Friday front squat uses two 20-lb dumbbells by default |
| [`src/lib/training.ts`](src/lib/training.ts) | Pure regional-versus-scheduled completion helper |
| [`src/lib/training.test.ts`](src/lib/training.test.ts) | Exercise quantity validation |
| [`src/components/anatomy/MuscleInfoPanel.tsx`](src/components/anatomy/MuscleInfoPanel.tsx) | Relevant benchmark and separate regional checkmark |
| [`src/components/dashboard/WorkoutSession.tsx`](src/components/dashboard/WorkoutSession.tsx) | Profile load and benchmark-based target |
| [`src/components/navigation/MenuDrawer.tsx`](src/components/navigation/MenuDrawer.tsx) | Active Benchmark destination |
| [`src/styles.css`](src/styles.css) | Onboarding, benchmark, comparison, and mobile layouts |
| [`README.md`](README.md) | Current run instructions and Phase 2 behavior |
| [`AUDIT_REPORT.md`](AUDIT_REPORT.md) | Marked as a historical pre-Phase-2 audit |

## 4. Data model changes

`UserProfile` contains a supported `TrainingGoal`, an `EquipmentProfile` with a numeric pound value and floor space, and a `TrainingSchedule` with exactly three unique days. `Exercise.dumbbellCount` is `1 | 2`; exercises no longer embed the user's fixed 20-lb value in an equipment string. `BenchmarkResult` stores a stable exercise ID, weight, reps, target RIR of 2, and timestamp. Each exercise has a result history, so the first entry is the original and the last is the latest. `OnboardingState` records step, benchmark index, and saved draft results.

## 5. Persistence design

The repository uses the key `full-body:profile:v1` and a `{ schemaVersion: 1, profile, onboarding, benchmarks }` document. React components do not access localStorage directly. Missing data starts onboarding with defaults. Invalid JSON or invalid data starts fresh with a notice. An unsupported schema version is not overwritten. Read and write failures leave the current session usable in memory. Submitted benchmark movements and completed onboarding survive reloads; valid equipment edits and day swaps are saved during setup.

Daily exercise completion, regional quick-session completion, streaks, and detailed workout history are intentionally **not persisted**.

## 6. Benchmark algorithm

For an exercise with a benchmark at the current profile weight:

```text
initialTargetPerSet = max(1, min(exercise rep ceiling, floor(benchmark reps × 0.8)))
```

For example, 15 Floor Press reps produce a target of 12 reps per working set. A very low benchmark can produce a target below the usual seed rep range, so the target does not exceed the user's tested capacity. Exercises without a benchmark keep their preset rep range. The code does not raise the dumbbell weight or implement progression recommendations.

## 7. Completion-state semantic fix

`scheduledCompletedExerciseIds` drives the Full Body A counter and `scheduledWorkoutCompletedMuscles` drives the main 3D highlight. `regionalSessionCompletedMuscles` drives only the selected muscle panel's quick-workout checkmark. Completing a regional Floor Press leaves the scheduled Full Body A count at 0/7 and does not color Chest as complete on the main body map. The states reset on page reload.

## 8–10. Tests and build

New tests cover profile defaults, exactly three selected days, rep validation, benchmark storage and retrieval, corrupt JSON recovery, unsupported schema protection, storage failure fallback, original result preservation, latest result update, initial targets, and regional-versus-scheduled completion. Existing Phase 1 tests remain.

| Check | Result |
| --- | --- |
| `npm test` | **16 tests passed** across 2 files |
| `npm run build` | **Passed**, including TypeScript checks |
| Browser console | No captured errors or warnings during tested flows |

The build still warns that the lazy-loaded anatomy chunk is large. Splitting it reduced the initial app chunk to about **80 kB gzipped**; the anatomy chunk is about **245 kB gzipped** and loads when the dashboard opens.

## 11. Known limitations

- Only Build Muscle is supported; the goal type is ready to expand, but there is no alternate program.
- The full workout button still starts Full Body A. Selected days appear in **This week** but do not select a workout by calendar date.
- Benchmarks measure controlled rep performance at a chosen load, not maximal strength. No strength score or population comparison is displayed.
- Retest entries remain a draft until explicit confirmation. An unfinished retest is not saved across reloads.
- Workout sessions still mark whole exercises done. There is no per-set logging, rest timer, full history, or progression engine.
- The body remains a stylized procedural map rather than a clinical anatomy model.
- There is no account, backend, cloud sync, deployment, AI feature, Strong/Weak Points view, or Health & Recovery content.

## 12. Screens and states to inspect

1. **Fresh origin:** Goal → Equipment → Training Days → Benchmark introduction. Check the default 20 lb and Monday/Wednesday/Friday selection.
2. **Equipment:** Enter an invalid value, then a valid value. Reload midway and confirm the saved valid value remains.
3. **Schedule:** Select an existing day, then a replacement. Confirm three days remain selected and the swap survives reload.
4. **Benchmark:** Start, enter five values, and review the summary. Try blank, zero, negative, nonnumeric, and over-100 reps. For One-Arm Row, check the weaker-side note.
5. **Skip route:** Skip at the intro. Confirm the dashboard loads and a selected Chest panel says **Not established yet**.
6. **Dashboard:** Complete onboarding, reload, and check the profile weight/days, muscle benchmark, and benchmark-derived target in a workout dialog.
7. **Completion separation:** Finish a Chest quick workout. The quick-workout checkmark appears; the Full Body A count and main body completion color do not change.
8. **Benchmark menu:** Open Benchmark, review originals and dates, start a retest, compare old and new reps, then explicitly save. Reload and confirm original and latest values remain distinct.
9. **390px width:** Check onboarding, benchmark entry, benchmark history, and dashboard. Keyboard navigation and Enter submission should work without relying on hover.

The app was manually exercised at desktop and 390 × 844 mobile size. Onboarding survived a reload at the schedule step and midway through benchmark entry. Completing and skipping onboarding both reached the dashboard. A retest preserved original values after save and reload. Browser checks found no horizontal overflow at 390px.
