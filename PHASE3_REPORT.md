# Full Body — Phase 3 audit report

Date: September 24, 2026

## 1. What was added

Phase 3 adds a dedicated scheduled workout page with exercise-by-exercise, set-by-set logging. The dashboard now uses the browser's local calendar date to show the scheduled A, B, or C workout, or a rest day and the next session. Every weekly workout can also be started manually. A saved unfinished workout can be resumed after leaving or refreshing.

The workout page shows the anatomical model, active primary muscles, completed primary muscles, exercise progress, actual reps, target reps, RIR, completed sets, rest, the exercise list, and the count of completed, skipped, and remaining exercises. A finished workout shows a concise summary. Regional quick workouts remain separate.

## 2. Files created

- `src/lib/schedule.ts` and `src/lib/schedule.test.ts` — local-day schedule mapping and tests.
- `src/lib/activeWorkout.ts` and `src/lib/activeWorkout.test.ts` — pure session and logging rules and tests.
- `src/lib/activeWorkoutRepository.ts` — validated active-session persistence.
- `src/components/dashboard/ActiveWorkoutPage.tsx` — focused scheduled workout and summary pages.
- `PHASE3_REPORT.md` — this report.

## 3. Files modified

- `src/App.tsx` — dashboard schedule, scheduled workout launch/resume, session lifecycle, regional isolation.
- `src/types/profile.ts`, `src/lib/profile.ts`, `src/lib/profileRepository.ts` — explicit A/B/C schedule slots and old-profile normalization.
- `src/types/training.ts` — typed session, exercise, and set records.
- `src/components/onboarding/OnboardingFlow.tsx` — day selection with stable workout slots.
- `src/components/anatomy/AnatomyScene.tsx`, `src/components/anatomy/AnatomyModel.tsx` — active primary muscle highlight.
- `src/lib/training.ts`, `src/lib/training.test.ts`, `src/lib/profile.test.ts` — primary-only muscle completion and updated schedule expectations.
- `src/styles.css` — full workout layout, controls, rest, summary, and responsive rules.

## 4. Active-session data model

`ActiveWorkoutSession` stores a stable session ID, stable workout ID, scheduled weekday, ISO start time, current exercise index, status, exercise records, and an optional ISO rest-end timestamp. Each `SessionExercise` has a stable exercise ID, status (`pending`, `active`, `completed`, or `skipped`), and numbered `LoggedSet` records. Each set records its target, actual result, RIR, and completion timestamp. The active repository accepts only an active, structurally valid session matching the current workout seed data.

## 5. Schedule mapping and migration

The schedule now has three ordered slots with explicit workout IDs. Defaults are Monday → A, Wednesday → B, Friday → C. Replacing a day keeps its workout ID in the same slot. Existing valid Phase 2 profiles with a `days` tuple are normalized to slots on read; benchmark history and onboarding state are retained. The normalized shape is written on the next profile save. Future schema versions remain read-only as before.

## 6. Set logging behavior

The starting target comes from the latest matching-weight benchmark when present; otherwise it uses the lower end of the exercise's prescribed range. Target and actual values can be adjusted for the current set. `COMPLETE SET` records both values and RIR, then locks that row in the normal flow. `EDIT` deliberately unlocks a completed row's actual result and RIR. An exercise completes only after all prescribed sets are logged. Unilateral movements use one value labelled per side and ask the user to log the lower side when sides differ. Timed carries use seconds and are excluded from the summary's total-reps figure.

## 7. RIR behavior

RIR options are 0, 1, 2, 3, and 4+. The default selection is 2, and a set is recorded only when `COMPLETE SET` is pressed. The page explains RIR as the number of clean reps that could still be performed. The radio controls support keyboard arrow selection.

## 8. Rest timer implementation

Compounds use 120 seconds; isolation, core, and carries use 75 seconds. Rest starts after a logged set when training remains. `SKIP REST` and `+30 SEC` change the state. The saved ISO end timestamp determines remaining time, so refreshes and backgrounded tabs do not depend on interval tick counts. At zero, the page says the next set is ready and waits for an explicit `CONTINUE` action. No notifications or exercise animations were added.

## 9. Active-session persistence

Only the current scheduled workout is stored under `full-body:active-session:v1`. Saving covers logged sets, skipped exercises, current exercise, and rest end. Refresh opens the dashboard with `CONTINUE WORKOUT`; resuming restores the workout and remaining rest. Invalid saved data is ignored safely. Finishing or deliberately discarding clears active storage. A finished summary stays in memory for the current page session only.

## 10. Muscle-completion rules

The active workout highlights all primary muscles of its current exercise in orange. A muscle becomes teal when every exercise in that scheduled workout which lists it as a **primary** muscle is completed. Skipped exercises do not complete a muscle; secondary-muscle work is not required. Regional quick sessions update only their own regional indicator and never the scheduled count or scheduled body highlights.

## 11. Tests added

The suite covers migration, A/B/C assignment, local today and next workout, deterministic unbenchmarked targets, set completion, set editing, exercise completion, skipping, remaining counts, primary-only muscles, save/load and corruption recovery, timestamp-based rest, timed carry summary handling, and regional isolation. Existing Phase 1 and 2 cases remain in the suite.

## 12. `npm test` result

**Passed:** 4 files, 28 tests.

## 13. `npm run build` and TypeScript result

**Passed:** `tsc -b` and Vite production build. Vite still reports the existing warning that the lazy anatomy chunk exceeds 500 kB.

## 14. Bundle-size changes

| Asset | Before Phase 3 | After Phase 3 | Change |
| --- | ---: | ---: | ---: |
| Main JS | 259.18 kB | 277.24 kB | +18.06 kB |
| Lazy anatomy JS | 898.48 kB | 898.57 kB | +0.09 kB |
| CSS | 27.24 kB | 34.83 kB | +7.59 kB |

The anatomy/Three.js code remains in a separate lazy chunk and is not loaded on onboarding or benchmark screens.

## 15. Known limitations

- Finished workouts and their highlights are retained only in the current page session; permanent history belongs to a later phase.
- The regional quick workout keeps its existing lightweight whole-exercise completion flow.
- The existing lazy anatomy chunk remains large and retains Vite's size warning.
- The app is a local preview at `http://127.0.0.1:5173/`; no deployment was requested for this phase.

## 16. Exact manual states to inspect

1. With a fresh default schedule, inspect Monday, Wednesday, and Friday: the dashboard should offer Full Body A, B, and C respectively. On another day, inspect `Rest day` and its next session. These calendar mappings are also covered by unit tests.
2. Open `This week` and launch a workout assigned to another day. Leave it, reload, and use `CONTINUE WORKOUT`.
3. Set actual reps with the stepper, choose a RIR option, press `COMPLETE SET`, then inspect the logged row and its deliberate `EDIT` control.
4. During rest, press `+30 SEC`, refresh, and confirm the remaining time is retained. Press `SKIP REST` to expose the next set.
5. Complete all three sets of an exercise and inspect the completed count and primary muscle color. Skip another exercise and inspect completed/skipped/remaining as separate figures.
6. Try starting another weekly workout while one is active. Inspect the discard confirmation; `KEEP CURRENT` should preserve the original workout.
7. Finish with completed and skipped exercises. Inspect set totals, actual-rep total, duration, body highlight, and `SET RESULTS` on the summary.
8. Return to the dashboard, complete a regional quick session, and confirm the scheduled exercise count does not change.
9. At 390px width, inspect controls and scrolling; the workout page should have no horizontal overflow. Keyboard users can tab to controls and change RIR with arrow keys.

### Browser verification performed

In the temporary test preview, manually launching Workout B on a rest day, logging and editing a set, choosing RIR, extending and skipping rest, refreshing during rest, completing one exercise, skipping seven, finishing the summary, running a regional quick session, manually launching Workout A and C, using keyboard RIR selection, confirming active-workout replacement, and discarding a test session all succeeded. The summary showed 1/8 exercises, 7 skipped, 3 sets, and 25 actual reps for the test inputs. Browser application error logs were empty. At a 390px viewport, `document.documentElement.scrollWidth` equalled 390px. The main preview on port 5173 returned HTTP 200 after the changes.
