# Full Body — Phase 7 audit report

**Phase:** Exercise Difficulty Progression  
**Completed:** September 25, 2026  
**Scope:** Existing local React/Vite application, with the Phase 1–6 workout, calendar, analytics, and achievement flows retained.

## 1. What was added

Scheduled exercise slots now have ordered, equipment-compatible variations. A successful set of ceiling targets at 2+ RIR can make the next variation available, after the prescribed rep target has progressed to that ceiling. The completion screen asks the user to use the harder variation or keep the current one. A selected variation applies to future sessions; an active workout keeps the variation captured when it started. History, progress, guides, analytics, settings, and restrained celebrations all identify the concrete movement.

## 2. Files created

| File | Purpose |
| --- | --- |
| `src/data/exerciseVariants.ts` | Typed families, variants, curated ladders, and exercise resolution. |
| `src/lib/variants.ts` | Pure unlock, readiness, selection, grouping, and difficulty-advance rules. |
| `src/lib/variantRepository.ts` | Versioned local preference storage. |
| `src/lib/variants.test.ts` | Phase 7 behavior and compatibility tests. |
| `PHASE7_REPORT.md` | This audit. |

## 3. Files modified

| Area | Files |
| --- | --- |
| Application and screens | `src/App.tsx`, `src/components/dashboard/ActiveWorkoutPage.tsx`, `src/components/dashboard/WorkoutSession.tsx`, `src/components/exercises/ExerciseGuide.tsx`, `src/components/progress/ProgressPage.tsx`, `src/components/analytics/InsightPage.tsx`, `src/components/settings/SettingsPage.tsx`, `src/components/navigation/MenuDrawer.tsx` |
| Workout logic and storage | `src/types/training.ts`, `src/lib/activeWorkout.ts`, `src/lib/activeWorkoutRepository.ts`, `src/lib/workoutHistory.ts`, `src/lib/workoutHistoryRepository.ts`, `src/lib/progression.ts`, `src/lib/muscleAnalytics.ts`, `src/lib/achievements.ts`, `src/lib/reset.ts` |
| Presentation and test | `src/gamification.css`, `src/lib/calendar.test.ts` |

## 4. Exercise-family data model

Each `ExerciseFamily` has a stable ID, base scheduled exercise ID, and ordered variant IDs. Each `ExerciseVariant` has a stable ID, family ID, name, level, typed modifier, modifier cue, unilateral flag, and rep range. The existing workout A/B/C exercise ID remains the scheduled slot; `variantId` records the concrete movement. `resolveExercise` supplies the active name and rep range without replacing the stable ID or changing the number of dumbbells. The two Suitcase March slots have base variants only.

## 5. Variation persistence

`full-body:exercise-variants:v1` stores `{ schemaVersion: 1, selections }`. It stores selected variant IDs only. Unlocks are derived from scheduled history, avoiding duplicate history or analytics state. The repository validates known family/variant pairs, reports unavailable/corrupt/unsupported storage, and the app rejects saved choices that are not unlocked by the loaded history. Settings and completion choices save immediately. Reset All Data removes the key.

## 6. Unlock/readiness rules

For a rep-based scheduled exercise, an earned, successful prescribed +1 step into the active variation's ceiling permanently unlocks the next ordered level. The ceiling session must use the correct variant, weight, dumbbell count, and set count; every target must equal the variation ceiling, every actual result must meet it, and every RIR must be at least 2. An edited target, manual jump, skipped exercise, quick session, or failed set does not unlock it. One successful ceiling session suffices when that session is the earned ceiling step. The completion offer also requires the latest performance for that variant at the current weight to be a successful ceiling. An earlier unlock remains selectable even if a later session is harder or incomplete.

## 7. Initial targets after variation change

A newly selected harder movement begins at its own lower rep bound for every prescribed set. Paused Floor Press starts at **8 / 8 / 8** in its 8–12 range, even if standard Floor Press ended at 15 / 15 / 15. After its first completed performance, conservative +1 total-rep progression uses only the same variant at the same weight and count. A base exercise benchmark does not inflate a harder variant's first target.

## 8. Variation ladders implemented

All 22 rep-based scheduled slots have curated ladders. The movements are Goblet Squat, Floor Press, One-Arm Row, Romanian Deadlift, Overhead Press, Calf Raise in A, Reverse Lunge, Squeeze Floor Press, Bent-Over Row, Single-Leg Romanian Deadlift, Lateral Raise, Hammer Curl, Overhead Triceps Extension, Dead Bug, Double-Dumbbell Front Squat, Neutral-Grip Floor Press, Pullover, Sumo Deadlift, Reverse Fly, Alternating Curl, Skull Crusher, and Calf Raise in C. The A/C calf raises remain separate stable slots. Their harder levels use the requested pause, eccentric, squeeze, one-and-half-rep, and single-leg modifiers as appropriate. The Dead Bug has one conservative extended-pause level. Harder variants have explicit ranges, generally 8–12 for larger movements and 10–15 or 12–20 for accessories. No ladder adds equipment or changes its base dumbbell count. Suitcase March remains on its existing timed behavior.

## 9. Exercise-guide changes

The existing setup and movement cues and two-position SVG remain available. A harder variant adds its name, difficulty, rep range, and a visible modifier cue, such as the two-second pause for Floor Press. The guide also appears in a selected-variant quick session.

## 10. Active-workout changes

Session creation snapshots selected `variantId`s. Resume and history serialization preserve them. The active card shows the concrete name, family, level, current weight, rep range, modifier, and normal set logging. Targets, RIR, rest, history, set checkboxes, skip, and resume still use the existing system. The dashboard routine and exercise list use concrete selected names. Completion offers an explicit **USE HARDER VARIATION** or **KEEP CURRENT VARIATION** choice with the next movement and lower starting target; accepting never alters the completed or already active session.

## 11. Progress changes

Progress shows the selected variation, level, previous variation, current-weight target, per-variant steps, and difficulty advances. Historical rows are grouped under their concrete variant names and labeled at the transition. A standard 15 / 15 / 15 result and paused 8 / 8 / 8 result are no longer presented as one declining rep sequence.

## 12. Strong/Weak analytics changes

Rep trends and steps compare only the same variant at the same weight and dumbbell count. A valid first completion of the next ordered variation after a prior earned ceiling is a separate difficulty advance. For its first one or two qualifying performances, the new movement reports **ADVANCED VARIATION**; that state contributes positive evidence to Strong/Weak and is not treated as stalled or weak merely because the rep target reset. Normal trend classification resumes with sufficient new-variant history.

## 13. Gamification integration

The completion summary can display **DIFFICULTY ADVANCED** after a harder scheduled movement is actually completed. This is separate from an earned +1 rep step and does not increase the existing 10 PROGRESSION STEPS achievement count. Existing week-streak and perfect-week behavior remains in place. No new badge system was added.

## 14. Settings changes

An **EXERCISE DIFFICULTY** section lists the current variant and level for each rep-based slot. Expanding a family shows `CURRENT`, `UNLOCKED`, and disabled `LOCKED` levels. Users can select an unlocked easier movement and later return to an unlocked harder one. Separate A/C labels disambiguate the two Calf Raise slots. The selection is for future workouts only.

## 15. Historical migration/normalization

Active-session and workout-history loaders normalize records without `variantId` to their base exercise ID in memory. Existing records remain usable and are not rewritten solely for Phase 7. New history writes include `variantId`. New set logs also record whether a target was edited, so a manually edited +1-shaped target does not earn a step or unlock.

## 16. Tests added

The new Phase 7 suite covers all 25 requested categories: ladder coverage and timed exclusion; successful, failed, skipped, edited, quick-session, sequential, weight, and dumbbell-count unlock cases; explicit selection persistence and step-back; base and active-history compatibility; initial target and active-variant snapshot; variant-specific ceiling/rep logic; grouped history; actual difficulty-advance detection; separation from +1 achievements; and positive, non-stalled Strong/Weak treatment. The reset-key test was updated. There are 17 new tests in `variants.test.ts`, bringing the suite from 85 to 102 tests.

## 17. `npm test` result

**Pass:** 11 test files, **102 tests passed**, 0 failed. Final run: September 25, 2026.

## 18. `npm run build` result

**Pass:** `tsc -b && vite build`; 2,181 modules transformed. The existing Vite warning for a chunk over 500 kB remains on the lazy anatomy chunk. No TypeScript errors were reported.

## 19. Bundle-size changes

| Asset | Before Phase 7 | Final | Change |
| --- | ---: | ---: | ---: |
| Main JS, minified | 333.89 kB | 350.59 kB | +16.70 kB |
| Main JS, gzip | 100.10 kB | 104.27 kB | +4.17 kB |
| CSS, minified | 61.21 kB | 64.79 kB | +3.58 kB |
| CSS, gzip | 13.31 kB | 13.91 kB | +0.60 kB |
| Lazy anatomy JS, minified | 898.69 kB | 898.69 kB | No material change |

The anatomy scene remains lazy-loaded.

## 20. Known limitations

- Phase 1–6 logs do not contain the new `targetWasEdited` field. A historical manual target change that happened to look exactly like a prescribed +1 step cannot be distinguished retroactively; new logs capture this distinction.
- Variation state is local to this browser and follows the app's existing local-storage model. There is no account or cloud sync.
- Suitcase March has no Phase 7 timed variation ladder. Its time target behavior is unchanged.
- The existing large lazy anatomy chunk still triggers Vite's size advisory. This phase did not add to that chunk.

## 21. Exact manual scenarios verified

Browser QA used isolated seeded profile and history fixtures on a temporary Vite port. The temporary fixture was removed and that server stopped afterward. The user's normal local server was left alone.

| Scenario | Browser result |
| --- | --- |
| A — Floor Press upgrade | A prior 15 / 15 / 14 followed by 15 / 15 / 15 at RIR 2 displayed **REP RANGE COMPLETE**, **HARDER VARIATION READY**, and the paused movement. Choosing **USE HARDER VARIATION** changed the dashboard routine; the next scheduled session showed the paused guide and **8 / 8 / 8**. |
| B — Keep current | Choosing **KEEP CURRENT VARIATION** retained standard Floor Press on the dashboard. The unlocked paused option remained available in Settings. |
| C — Hard ceiling | A ceiling set with RIR 1 produced no upgrade offer. |
| D — History | Progress separated standard and paused rows, marked the difficulty transition, and showed one rep step and one difficulty advance. |
| E — Analytics | With a newly completed paused press, Chest received **ADVANCED VARIATION** and positive evidence; it was not Weak solely because reps restarted lower. A separately seeded struggling Shoulders example still appeared as Weak. |
| F — Settings | Base was `UNLOCKED`, paused was `CURRENT`, later levels were `LOCKED`; selecting base and reloading kept base `CURRENT` while paused stayed unlocked. |
| G — Weight change | At 25 lb the paused selection remained on the dashboard and next session started at 8 / 8 / 8. Pure tests confirmed 20-lb ceiling evidence did not make a 25-lb upgrade ready. |
| Complete workout and celebration | Finishing the first paused scheduled performance displayed **DIFFICULTY ADVANCED** without a +1 step. |
| Quick workout and guide | A Chest quick session used the selected paused variation and modifier guide, completed its checkboxes, and left scheduled completion at 0 / 3. |
| Reset | Reset All Data returned the isolated app to onboarding; the reset key test verifies removal of variant storage. |
| Mobile and keyboard | At a 390 px viewport, summary, Progress, and Settings fit without horizontal document overflow. The Settings family disclosure opened and closed with Enter. |
| Console | Browser console checks returned no application errors or warnings from the Phase 7 flows. |

