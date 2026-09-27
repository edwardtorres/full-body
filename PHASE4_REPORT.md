# Full Body — Phase 4 audit report

Date: September 24, 2026

The numbered sections below preserve the original Phase 4 delivery and its test/build snapshot. The **Post-Phase-4 refinements** section at the end records the later exercise-guide, menu, and calendar changes and the current verification results.

## 1. What was added

Phase 4 adds permanent local history for finished scheduled workouts, exercise performance history, conservative rep progression, previous-session context, and a working Progress page. The existing dashboard, benchmark flow, regional quick sessions, active-session restore, set logging, RIR, and anatomy remain in place. Settings now exposes the profile's dumbbell weight so a later equipment change can be handled without repeating onboarding.

## 2. Files created

- `src/lib/workoutHistory.ts` — immutable history snapshots, date sorting, and safe summary totals.
- `src/lib/workoutHistoryRepository.ts` — validated, versioned local persistence.
- `src/lib/progression.ts` — pure next-target rules.
- `src/lib/workoutHistory.test.ts` and `src/lib/progression.test.ts` — Phase 4 behavior and storage tests.
- `src/components/progress/ProgressPage.tsx` — completed-workout detail and exercise performance history.
- `src/components/settings/SettingsPage.tsx` — dumbbell-weight setting.
- `PHASE4_REPORT.md` — this report.

## 3. Files modified

- `src/App.tsx` — loads history, commits a finished workout before clearing its active record, opens Progress and Settings, and shows a small recent-workout indicator.
- `src/types/training.ts` — active workout weight and historical record types.
- `src/lib/activeWorkout.ts` and `src/lib/activeWorkoutRepository.ts` — capture active-session weight and normalize Phase 3 sessions that predate that field.
- `src/components/dashboard/ActiveWorkoutPage.tsx` — suggested set targets, target reason, last-session detail, and next-target summary.
- `src/components/navigation/MenuDrawer.tsx` — enables Progress and Settings.
- `src/data/workouts.ts` — Floor Press A's upper rep limit is 15 so the requested 12 / 12 / 12 → 13 / 12 / 12 example can coexist with ceiling enforcement.
- `src/lib/profile.test.ts` — aligns the Floor Press range assertion with that prescription.
- `src/styles.css` — Progress, Settings, prior-performance, summary, and responsive presentation.

## 4. History data model

`WorkoutHistoryEntry` records the session ID, workout ID, scheduled day, ISO start and completion timestamps, fixed duration in seconds, dumbbell weight per implement, and an ordered exercise list. Each `HistoricalExercise` records its stable exercise ID, completed/skipped status, prescribed dumbbell count, and the logged sets. Each set retains its number, actual target, actual reps or seconds, RIR, and ISO completion timestamp. History stores raw values and stable IDs, not display strings or derived strength scores.

## 5. History persistence design

`full-body:workout-history:v1` contains `{ schemaVersion: 1, entries }` in localStorage behind a repository. Only an explicitly finished, fully resolved scheduled session can become a history entry; a finished session may include skipped exercises. Regional quick sessions and discarded sessions do not enter it. On finish, the app saves the history entry, clears the active-session key, then opens the summary. If history cannot be saved, the active session remains so the user can retry. Repeated appends with the same session ID do not duplicate a workout.

The repository tolerates absent storage, invalid JSON, malformed entries, and write errors without crashing. It retains valid entries when individual records are bad. A future schema version is treated as read-only rather than overwritten. History is sorted by completion instant; timestamps are displayed in the browser's local time zone.

## 6. Progression algorithm

For each exercise, the app finds the latest completed occurrence at the current dumbbell weight and prescribed dumbbell count. Skipped occurrences are ignored. With no such history, it uses the latest benchmark at the same weight, or the deterministic lower end of the seed rep range. With history, it evaluates the *recorded targets* and logged results. Successful work adds exactly one total rep to the lowest target set; ties go to the earliest set. For example, 12 / 12 / 12 → 13 / 12 / 12 → 13 / 13 / 12. Extra actual reps never cause a larger jump. Timed exercises retain their time target.

## 7. Success, hold, and ceiling rules

A completed exercise progresses only when all prescribed sets are present, every actual value meets or exceeds its target, and every RIR is at least 2 (including 4+). One missed target or RIR 0–1 holds the same targets; there is no automatic decrease. When all set targets have reached that exercise's upper rep limit, the result is `ceiling` and the targets stay there. The UI labels these states `+1 REP`, `REPEAT TARGET`, and `REP RANGE COMPLETE`; timed work is labelled `TIME TARGET`.

## 8. Manual target interaction

The existing per-set target input remains editable. A saved set records the target actually entered, even if it differs from the suggestion. The next workout evaluates and, where appropriate, increments that recorded target sequence. A suggested 13 / 12 / 12 changed by the user to 12 / 12 / 12 therefore progresses from 12 / 12 / 12.

## 9. Weight-matching behavior

The active workout captures the profile weight when it starts, and its history retains that weight even if Settings changes later. Progression only reads completed records at the active session's weight and the exercise's dumbbell count. If weight changes from 20 lb to 25 lb, old 20 lb targets are not transferred. A matching-weight benchmark is used if available; otherwise the seed target is used. Changing Settings back to 20 lb restores the relevance of the saved 20 lb history. The app does not calculate a combined load from one- versus two-dumbbell movements.

## 10. Progress page behavior

Progress lists saved workouts newest first with local completion date and time, exercise completion/skips, working sets, actual repetition total, and duration. Selecting a workout shows each exercise's completed or skipped state, weight, dumbbell count, recorded targets, actual values, and RIR. The exercise selector shows recent completed performances with targets, actuals, and RIR. Its original benchmark appears separately as a single benchmark set; it is not compared as if it were a multi-set workout total. Timed seconds are excluded from the repetition total. History uses buttons, a native select, visible focus styles, and readable text without hover or charts.

## 11. Workout summary changes

The summary uses the saved entry's duration and totals. Its set results now show actual targets, actual performance, RIR, and the next target with a concise progression state for completed exercises. Skipped exercises show no next target. Returning to the dashboard leaves history intact; the dashboard shows a small last-workout line and a Progress shortcut.

## 12. Tests added

Fifteen new tests across two files cover balanced one-rep distribution; success with 2+ RIR; holding for RIR 1 or a missed set; skipped performances; choosing the last completed performance past a later skip; rep ceilings; timed exercises; manual-target basis; matching weight and dumbbell count; benchmark/seed fallback; history save/load; corrupt or future storage; duplicate prevention; weight preservation; active-key clearing; and discarded-workout exclusion. One existing range assertion was updated for Floor Press A. Phase 1–3 tests remain in the suite.

## 13. `npm test` result

Passed: **6 test files, 43 tests** (September 24, 2026). Phase 3 had 4 files and 28 tests.

## 14. `npm run build` result

Passed: `tsc -b` and Vite production build. The existing Vite warning for the anatomy chunk above 500 kB remains. Browser application errors and warnings were empty during the manual test.

## 15. Bundle-size changes

| Asset | Phase 3 | Phase 4 | Change |
| --- | ---: | ---: | ---: |
| Main JS | 277.24 kB | 292.55 kB | +15.31 kB |
| Lazy anatomy JS | 898.57 kB | 898.57 kB | 0.00 kB |
| CSS | 34.83 kB | 40.89 kB | +6.06 kB |

These are minified, uncompressed production sizes. The anatomy/Three.js bundle remains lazy loaded.

## 16. Known limitations

- History is local to this browser profile. There is no account, backend, or cloud sync; clearing site data removes it.
- A completed summary remains visible until leaving it, while its permanent record is found in Progress after a reload.
- Timed exercises keep the previous time target; automatic timed progression is deferred.
- Progress uses text lists rather than a chart and does not estimate strength, calorie burn, or muscle growth.
- The large lazy anatomy bundle still raises Vite's existing size warning.
- Floor Press A's ceiling was changed from 12 to 15 to satisfy the specified first progression from 12 to 13. Other exercise ceilings remain their seeded ranges.
- This phase has a local preview only; no deployment was requested.

## 17. Exact manual states tested

The checks used a separate local test preview and test browser profile. Its benchmark for Floor Press was 20 lb × 13 reps; that original benchmark stayed unchanged throughout.

1. First Full Body A: Floor Press began at **12 / 12 / 12**. Logged **12 @ 2, 12 @ 2, 12 @ 2**; skipped the other six exercises and explicitly finished. Summary showed **next 13 / 12 / 12, +1 REP**.
2. Reloaded the page. Progress still showed the saved A workout with **1/7 completed, 6 skipped, 3 sets, 36 reps**, weight and one-dumbbell count, plus the separate original benchmark.
3. Second Full Body A: Floor Press began at **13 / 12 / 12** with last-session context. Logged **13 @ 2, 12 @ 1, 12 @ 2** and finished. Summary showed **repeat 13 / 12 / 12**.
4. Third Full Body A: Floor Press again began at **13 / 12 / 12**. Logged **13 @ 2, 12 @ 2, 12 @ 2** and finished. Summary showed **next 13 / 13 / 12, +1 REP**.
5. Progress listed all three workouts by completion timestamp and the three Floor Press target/actual/RIR series in that order. The benchmark remained **20 lb × 13** in its own block. The last two sessions each showed 37 actual reps, and skipped exercises did not show a new target. Unit tests additionally verified that a later skip does not replace the last completed progression basis.
6. Started Full Body C, logged Front Squat **8 @ 2**, refreshed, and continued the saved workout with its set and remaining rest intact. Discarded that test workout; it did not appear in history.
7. Changed the test profile to **25 lb**. A new Full Body A showed **8 / 8 / 8** for Floor Press and said there was no previous completed performance at this weight, despite the 20 lb history. Discarded it and restored the test profile to **20 lb**. The three 20 lb records remained visible.
8. At a **390px** viewport, `window.innerWidth` and `document.documentElement.scrollWidth` were both **390px** on Progress after the final date/time formatting. Browser error and warning logs were empty.

The existing default preview on port 5173 returned HTTP 200 in a final network-permitted check. The temporary test preview on port 5174 was used only for verification and then closed.

---

## Post-Phase-4 refinements — September 24, 2026

### What changed

- Selecting a muscle now shows a related two-position SVG exercise illustration in its quick-workout card. The quick-workout dialog repeats the illustration and adds short **set up** and **move** instructions. Every seeded scheduled exercise also has its own guide, visible while logging that exercise.
- The menu no longer includes a Dashboard link. **Reset All Data** is directly in the menu and opens a confirmation that names the data it will permanently remove: setup, benchmarks, active workout, and completed history. The reset helper removes only Full Body's three localStorage keys; the browser page reloads after a successful reset.
- Dashboard and active-workout body controls now offer **Front** and **Back**. Left and Right controls were removed.
- A monthly training calendar sits below the dashboard. The user selects Full Body A, B, or C and clicks a date to assign that workout to the date's **recurring weekday**. Clicking a weekday already assigned to another workout swaps their days. Each workout has an editable start time, shown on every matching date in the month. The default time is 9:00 AM.
- **Export Calendar** downloads `full-body-workouts.ics` containing three weekly recurring, 60-minute events at the selected local wall times. The file must be imported into a calendar app; it is not a live sync. Re-export after changing the in-app schedule.

### Persistence and compatibility

The existing version-1 profile still owns the A/B/C schedule. Each slot now includes `time` in `HH:mm` form. The profile loader adds `09:00` when it reads a saved Phase 2 day list or Phase 3 schedule slots without times, preserving workout order, selected days, onboarding data, and benchmarks. Day changes keep each workout's time attached to its workout ID. The calendar writes through the existing profile repository. Global reset removes the profile, active-session, and workout-history keys after the in-app confirmation; it does not clear other applications' localStorage.

### Files added and changed

**Added:** `src/data/exerciseGuides.ts`, `src/components/exercises/ExerciseGuide.tsx`, `src/components/dashboard/TrainingCalendar.tsx`, `src/lib/calendar.ts`, `src/lib/reset.ts`, `src/lib/calendar.test.ts`, and `src/refinements.css`.

**Changed:** `src/App.tsx`, `src/components/anatomy/CameraControls.tsx`, `src/components/anatomy/MuscleInfoPanel.tsx`, `src/components/dashboard/ActiveWorkoutPage.tsx`, `src/components/dashboard/WorkoutSession.tsx`, `src/components/navigation/MenuDrawer.tsx`, `src/lib/profile.ts`, `src/lib/profile.test.ts`, `src/lib/schedule.test.ts`, `src/types/profile.ts`, `src/main.tsx`, and `README.md`.

### Verification after refinements

- `npm test`: **7 files, 50 tests passed**. The added cases cover free-day reassignment, occupied-day swapping, workout-time retention, invalid times, saved Phase 3 schedule migration, recurring calendar file content, next occurrence selection, exercise-guide coverage, and reset-key scope.
- `npm run build`: **passed**, including `tsc -b`. The existing Vite warning about the large lazy anatomy chunk remains.
- Current minified, uncompressed assets: main JS **309.77 kB** (Phase 4: 292.55 kB), CSS **48.21 kB** (Phase 4: 40.89 kB), lazy anatomy JS **898.54 kB** (Phase 4: 898.57 kB).
- In an isolated test preview, choosing Chest displayed the Floor Press start/move illustrations and cues in the quick-workout card and dialog. A scheduled Full Body C workout displayed Front Squat guidance above set logging. Both dashboard and active workout showed Front/Back only.
- In that test profile, Full Body A moved from Tuesday to Monday, its time changed to **9:30 AM**, and the repeated Monday calendar entries and time survived a full reload. The export action showed the app's download notice; the generated `.ics` content is also covered by a pure test. No external calendar import was performed.
- The menu showed no Dashboard link and placed Reset All Data directly in view at 390px. The confirmation and Cancel path were inspected. The destructive reset action was **not** run against the saved browser test profile; its storage-key behavior was tested with an isolated in-memory store.
- At a 390px viewport, the dashboard/calendar and active workout each had `document.documentElement.scrollWidth === window.innerWidth === 390`. Browser application error and warning logs were empty. The main preview on port 5173 returned HTTP 200; the temporary test preview was closed.

### Current limits

The exercise images are stylized two-position diagrams with text cues, not photos or motion demonstrations. Calendar events represent the recurring A/B/C plan only; regional quick sessions are not scheduled or exported. Export creates a file for manual import and does not update an external calendar automatically, send reminders, or remove previously imported events. The exported event duration is fixed at 60 minutes.
