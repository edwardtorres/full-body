# Phase 5 audit — Strong Points, Weak Points, and muscle analytics

Date: 2026-09-24 · updated after workout UI refinements  
Project: Full Body  
Scope: Historical scheduled-workout analytics at the current profile weight, plus the subsequent dashboard and set-checklist refinements. Existing onboarding, benchmarks, calendar, and exercise guides remain in place.

## 1. What was added

- Strong Points and Weak Points pages, reachable from the existing menu.
- A pure analytics layer for rep progression, exercise trends, muscle evidence, confidence, and relative classifications.
- An anatomy visualization mode that highlights strong or weak muscles separately from dashboard workout colors.
- A compact exercise trend summary on Progress, above the existing exercise history.
- Recent (last 42 days) and all-time selectors. Recent is the default.
- A workout-plan strip at the top of the dashboard, per-set checkboxes in quick and complete workouts, and a single direct complete-workout action in place of the old dashboard workout-status card.

## 2. Files created

| File | Purpose |
| --- | --- |
| `src/lib/muscleAnalytics.ts` | Pure exercise and muscle analytics helpers. |
| `src/lib/muscleAnalytics.test.ts` | Phase 5 rule tests. |
| `src/components/analytics/InsightPage.tsx` | Shared Strong/Weak page. |
| `src/analytics.css` | Analytics page and Progress summary styles, including updated body-control spacing. |
| `PHASE5_REPORT.md` | This audit. |

The temporary browser fixture used for manual QA was removed after verification and is not part of the product.

## 3. Files modified

| File | Change |
| --- | --- |
| `src/App.tsx` | Routes Strong/Weak destinations and passes analytics inputs; places the day and workout routine above the dashboard and replaces the workout-status card with one direct launch button. |
| `src/components/navigation/MenuDrawer.tsx` | Enables Strong Points and Weak Points links. |
| `src/components/anatomy/AnatomyScene.tsx` | Accepts optional analytics visualization state. |
| `src/components/anatomy/AnatomyModel.tsx` | Applies restrained strong/weak tones to highlighted regions. |
| `src/components/progress/ProgressPage.tsx` | Adds selected-exercise trend summary and period selector. |
| `src/components/dashboard/WorkoutSession.tsx` | Adds independently selectable checkboxes for each quick-workout set. |
| `src/components/dashboard/ActiveWorkoutPage.tsx` | Uses a checkbox to log each scheduled-workout set and displays logged sets as checked. |
| `src/refinements.css` | Styles the plan strip, set checklists, launch action, and extra body-control spacing. |
| `src/main.tsx` | Loads analytics styles. |

## 4. Exercise analytics model

Each rep exercise is analyzed from completed scheduled-workout records at one exact dumbbell weight and its prescribed dumbbell count. The result includes completed and skipped occurrences, first and latest historical targets, next target, earned steps, holds, consecutive holds, last progression date, latest performance date, rep-ceiling state, confidence, and trend status. Timed exercises can report `TIME TARGET` in Progress but do not contribute to rep-step muscle rankings. Benchmarks remain separate.

## 5. Progression-step calculation

A step requires two qualifying, successful completed performances of the same exercise at the same weight and dumbbell count. The newer prescribed target must equal the existing balanced-target helper's exact next sequence and increase total prescribed reps by one. For example, `12 / 12 / 12` → `13 / 12 / 12` → `13 / 13 / 12` earns two steps. A manual jump, failed target, benchmark, skip, timed target, or weight/count mismatch earns none. A skip between completed sessions does not break the comparison.

## 6. Exercise trend rules

| Status | Rule |
| --- | --- |
| `REP RANGE COMPLETE` | Latest successful performance is at the exercise's rep ceiling. |
| `BUILDING DATA` | Fewer than three completed qualifying performances. |
| `PROGRESSING` | An earned step occurred in one of the latest two completed performances. |
| `STEADY` | No step in the latest two, without three step-free completions. |
| `STALLED` | No earned step in the latest three completed performances. |
| `TIME TARGET` | Timed exercise; excluded from rep-step ranking. |

Skips do not enter the completed-performance sequence or consecutive-hold count.

## 7. Muscle aggregation rules

Only **primary** muscle mappings count. For each muscle, the helper totals qualifying completions, skips, progression steps, progressing/stalled/ceiling exercises, eligible exercises, and latest earned progression. An exercise needs at least three completions to be eligible. Fewer than two muscle completions are low data, two or three are building data, and four or more are enough data. The page shows only muscles with completed training evidence in its text list; all highlighted regions have a matching text entry.

## 8. Strong Point rules

A muscle needs enough data, at least one eligible exercise, and a comparison pool with at least two distinct eligible exercise signatures. It then needs at least two earned steps, at least half its eligible exercises currently progressing or successfully at ceiling after prior steps, and an internal normalized ranking within 80% of the top adequately sampled muscle. The ranking uses steps per eligible completion plus the share of positive eligible exercises. It is never shown as a 0–100 strength score. Zero or several muscles may qualify.

## 9. Weak Point rules

A muscle needs the same evidence threshold and comparison pool. It must have a stalled eligible exercise, no progressing or ceiling eligible exercises, a materially lower normalized ranking (at most 45% of the top), and a top ranking of at least 0.4 so a comparison actually demonstrates progress elsewhere. Skips alone, too little training, and rep ceilings cannot cause a Weak Point. The interface states that Weak Points describe slower progress in this training history, not absolute physical weakness.

## 10. 3D analytics visualization

Strong regions use restrained green-teal; weak regions use muted amber. Unhighlighted regions remain subdued. This optional mode reuses `AnatomyScene` and `AnatomyModel`; the dashboard's selected, active, and completed workout colors are unchanged. Front and Back controls, pointer selection, the keyboard-accessible textual muscle list, visible pressed states, and reduced-motion handling remain available. The anatomy is still lazy-loaded when these pages open. The follow-up refinement increased the gap between the body figure and Front/Back controls on the dashboard, active workout, and analytics pages.

## 11. Progress page changes

The existing workout and exercise history remains. The selected exercise now displays its current status, next target, first target in the selected window, earned steps, completed sessions, last progression, and current holds. The same pure helper powers both Progress and the Strong/Weak pages. The historical rows still retain all weights for inspection; the summary uses the current profile weight.

## 12. Weight and window filtering

Recent means the preceding 42 days through the current time; all-time includes valid earlier records, never future records. Both Strong/Weak and Progress default to recent. Exact profile weight and prescribed dumbbell count are required for analytics. Changing from 20 lb to 25 lb removes the old-weight Strong/Weak classifications until 25-lb completed history exists; restoring 20 lb restores them.

## 13. Tests added

One new test file adds **18 tests** covering all 21 requested Phase 5 test topics: prescribed +1 sequences, manual jumps, skips, early data, progressing/steady/stalled/ceiling statuses, timed exclusion, primary-only mapping, sufficient data, zero/multiple classifications, skip/ceiling safeguards, weight/count matching, and recent/all-time filtering. The direct step helper is also tested against mismatched weight and dumbbell count. Existing tests were not changed. The later UI refinements were verified through browser interactions; they did not add unit tests.

## 14. `npm test` result

Latest run after the UI refinements: **8 test files passed; 68 tests passed; 0 failed**. Baseline before Phase 5: 7 files and 50 tests passed.

## 15. `npm run build` result

Latest run after the UI refinements: **passed**. `tsc -b` passed and Vite built successfully. The existing Vite warning for a chunk over 500 kB remains; it is the lazy anatomy/Three.js chunk, not an application error.

## 16. Bundle-size changes

| Asset | Before Phase 5 | Initial Phase 5 | Current after refinements | Total change |
| --- | ---: | ---: | ---: | ---: |
| Main JavaScript | 309.77 kB | 321.78 kB | 322.76 kB | +12.99 kB |
| CSS | 48.21 kB | 54.02 kB | 57.17 kB | +8.96 kB |
| Lazy anatomy chunk | 898.54 kB | 898.69 kB | 898.69 kB | +0.15 kB |

These are Vite's uncompressed production sizes. The current main bundle is 97.18 kB gzip; CSS is 12.53 kB gzip; anatomy is 244.99 kB gzip. No charting dependency was added.

## 17. Known limitations

- Strong/Weak labels are conservative relative training trends. They do not estimate absolute strength, muscle size, hypertrophy, injury, or health.
- A user training only one eligible exercise signature gets building data, even after repeated sessions, because there is no independent muscle comparison yet.
- The body visual groups muscles by region rather than isolating every individual anatomical muscle. The underlying model remains the project's existing procedural anatomy.
- There is no calendar-based frequency adjustment or external population comparison. Skips remain available in History and are intentionally excluded from stall judgments.
- Quick-workout set checkboxes are local to the open quick-workout dialog. Closing it before finishing resets those checkmarks; quick workouts still do not write scheduled-workout history. Complete-workout set logs continue to persist through the existing active-session repository.
- The existing lazy Three.js anatomy chunk still triggers Vite's size advisory.

## 18. Exact manual scenarios verified

Manual QA used a **separate localhost port (5174)** and temporary seeded browser history; the existing 5173 profile data was not modified. The fixture was removed afterward.

| Scenario | Browser evidence |
| --- | --- |
| A — progressing chest | Four 20-lb Floor Press targets (`12/12/12`, `13/12/12`, `13/13/12`, `13/13/13`) displayed Chest **STRONG POINT**, three steps, Floor Press **PROGRESSING**, next `14/13/13`. |
| B — stalled shoulders | Four successful 20-lb Overhead Press `10/10/10` completions at RIR 1 displayed Shoulders **WEAK POINT**, Overhead Press **STALLED**, four current holds, zero steps. |
| C — skips | Other exercises were skipped on four consecutive fixture workouts. They received no Weak Point classification; the completed-history detail retained their `SKIPPED` rows. |
| D — ceiling | Four successful 20-lb Calf Raise `20/20/20` completions displayed **REP RANGE COMPLETE**, never `STALLED` or a Weak Point. |
| E — weight change | Settings changed 20 → 25 lb. Strong Points became a neutral **Building your training profile** state at 25 lb. Restoring 20 lb returned Chest **STRONG POINT**. |
| F — early user | With one completed Floor Press performance, Strong and Weak pages showed building-profile empty states and no forced classifications. |

Additional UI checks: Front/Back controls changed pressed state; tapping a shoulder region on the 3D body selected Shoulder details; keyboard-selectable text buttons exposed the same status; the all-time selector changed Floor Press completed sessions from four to five by including an older July record; Progress showed the same `PROGRESSING`, `STALLED`, and `REP RANGE COMPLETE` statuses as the point pages; Strong and Weak pages had `scrollWidth === 390` at a 390 px viewport; browser console contained no errors or warnings in the isolated run. The original 5173 preview returned HTTP 200 during the final check.

Follow-up refinement QA used the same isolated 5174 origin with a temporary fresh profile fixture, then removed that fixture and stopped the extra server:

| Check | Browser evidence |
| --- | --- |
| Plan at first view | On a rest day, the top strip showed the current weekday and date, “Rest day,” Friday's Full Body C as the next workout, and all nine routine exercises. |
| Single complete-workout action | The dashboard showed **START COMPLETE WORKOUT** without the former progress/status card; after starting, it showed **CONTINUE COMPLETE WORKOUT** on return. |
| Quick-workout sets | Floor Press exposed three independent set checkboxes. Checking sets 1, 2, and 3 changed the count from `0 / 3` to `3 / 3`; **FINISH QUICK WORKOUT** became enabled only after all three were checked. |
| Complete-workout sets | Checking set 1 of Front Squat immediately logged it as a checked completed set and began rest. Skipping rest exposed a separate checkbox for set 2. |
| Body controls | The measured body-to-control gap was 14 px on the desktop dashboard, 16 px at 390 px, and 18 px in the active workout. |
| Mobile and console | Dashboard and active workout had no horizontal overflow at 390 px; the quick-workout dialog scrolled within the viewport; the isolated browser logged no application errors or warnings. |

## 19. Post-Phase-5 workout UI refinements

The dashboard now answers “what is my plan?” before the user reaches the body map: it shows today's day/date, today's workout or rest day, and the full ordered routine for today's or the next scheduled workout. If a complete workout is in progress, its routine is labeled **IN PROGRESS**. The old dashboard workout-status card, exercise count, and progress bar were removed from that surface. The sole complete-workout launch action is labeled **START COMPLETE WORKOUT**, or **CONTINUE COMPLETE WORKOUT** when a session is saved.

In the quick-workout dialog, each prescribed set can be checked as soon as it is completed. The count updates after each check; the user may uncheck a set before finishing. In a scheduled complete workout, the current-set checkbox records target, actual reps, RIR, and timestamp through the existing `completeSet` helper. Earlier logged sets appear checked and remain editable through the existing **EDIT** action. These UI changes do not alter the historical analytics rules: only completed scheduled performances feed Strong/Weak classifications.
