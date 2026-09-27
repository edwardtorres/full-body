# Full Body — portfolio handoff

**Project name:** Full Body  
**Live URL:** [https://fullbody.edwardtorres.dev/](https://fullbody.edwardtorres.dev/)  
**Repository:** [https://github.com/edwardtorres/full-body](https://github.com/edwardtorres/full-body)

## Short description

Full Body is a 3D dumbbell workout tracker for training with a fixed pair of weights and floor space. It turns completed sets into conservative rep targets and unlockable movement variations, with the workout plan and progress kept in the browser.

## Technologies

React, TypeScript, Three.js, React Three Fiber, Drei, Vite, Vitest, Cloudflare Workers Static Assets.

## Key features

- Interactive front/back muscle map with text-based muscle selection.
- Three-day Full Body A/B/C plan and weekly calendar export.
- Five-movement benchmark and per-set reps/RIR logging.
- History-based +1 total-rep progression and exercise difficulty ladders.
- Progress, derived Strong/Weak analytics, streaks, and milestones.
- Optional current-day Health & Recovery reflection.

## Problem and solution

**Problem:** With fixed dumbbells, adding weight is not always available as the next progression step. A useful tracker must keep the training plan actionable without pretending load can increase automatically.

**Solution:** Full Body uses a benchmark and completed session history to set conservative rep targets. Once an exercise reaches its prescribed ceiling, the user can choose a harder movement variation with a new rep range. The stable exercise-family model keeps history and analytics meaningful across variations.

## Technical highlights

- Procedural 3D anatomy with clickable muscle-region state and equivalent text controls.
- Pure, history-based progression rules separated from storage and UI.
- Stable exercise-family IDs with variation-specific history and difficulty tracking.
- Versioned local persistence repositories for profile, active session, history, variations, and recovery check-in.
- Derived Strong/Weak analytics rather than a separate analytics database.
- Keyboard, focus, reduced-motion, and 320 px layout considerations; lazy-loaded scene with a visible fallback.

## Screenshot states to capture

Use a **1440 px desktop viewport** and a clean, realistic disposable browser profile. Do not use error dialogs, debug labels, or empty states.

1. **Dashboard:** Onboard with 20 lb dumbbells, schedule A/B/C, select Chest on the front anatomy view; show the plan and weekly status.
2. **Active complete workout:** Full Body A on Goblet Squat or Floor Press after one completed set, with target/actual/RIR and the next-set rest state visible. Use realistic reps and a short elapsed duration.
3. **Progress:** Save at least two scheduled workouts at the same load so the exercise history and target change are visible.
4. **Strong/Weak:** Add enough realistic, varied scheduled history for one supported Strong Point and one Weak Point; capture their labeled explanations, not just color.
5. **Exercise difficulty or milestone:** Show a legitimate unlocked variation in Settings or an earned Perfect Week state from three completed scheduled workouts.

Capture screenshots from a separate QA profile/origin. Do not seed the normal production browser profile with fake training history.
