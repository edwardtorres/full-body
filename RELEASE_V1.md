# Full Body v1.0.0 release record

**Release date:** September 26, 2026  
**Production URL:** [https://fullbody.edwardtorres.dev/](https://fullbody.edwardtorres.dev/)  
**Scope:** Public static release of the existing Phase 1–8 application; no new workout mechanics.

## Major features

Interactive 3D muscle selection with text alternatives; Full Body A/B/C weekly dumbbell plan; benchmark onboarding; set, rep, RIR, and rest logging; conservative rep and difficulty progression; history and Progress; derived Strong/Weak analytics; streaks and milestones; optional Health & Recovery; and local calendar scheduling with `.ics` export.

## Architecture

React and TypeScript are built by Vite into static files. Three.js, React Three Fiber, and Drei power a lazily imported procedural anatomy scene. An assets-only Cloudflare Worker serves `dist/` on the custom subdomain. The browser owns all state; there are no server endpoints, accounts, analytics services, or workout uploads. The app navigates between views through React state on `/`.

## Local persistence

| Key | Purpose |
| --- | --- |
| `full-body:profile:v1` | Goal, equipment, weekly schedule, onboarding, benchmarks. |
| `full-body:active-session:v1` | A resumable scheduled workout. |
| `full-body:workout-history:v1` | Completed scheduled sessions and set results. |
| `full-body:exercise-variants:v1` | Selected exercise variations. |
| `full-body:recovery-checkin:v1` | At most one current local-day optional check-in. |

Repositories validate saved data and handle unavailable/corrupt storage. Reset All Data removes only these keys. Data is not synchronized across browsers or devices.

## Training progression

The benchmark initializes working targets at the chosen dumbbell weight. Scheduled completion can earn a conservative +1 total-rep target. At the prescribed rep ceiling and effort, a harder variation may unlock. The user explicitly selects an unlocked variation; that movement starts at its own lower rep bound, and future progression uses its own history at the same load. Quick workouts do not change the scheduled progression engine.

## Accessibility and privacy

The muscle-name controls duplicate the 3D map's selection function. Inputs, calendar dates, dialogs, and disclosures have accessible names; keyboard focus is directed at pages, rest controls, and modal actions. A release pass checked 320 px layout and selected contrast pairs. This is not a WCAG certification or a substitute for physical-device and screen-reader testing. The app uses local browser storage, no account, no tracking SDK, and no live calendar integration. Health & Recovery is general training support, not medical advice.

## Build and deployment

Run `npm ci`, `npm test`, and `npm run build`; deploy with `npm run deploy` using an authorized Wrangler login. `wrangler.jsonc` attaches only `fullbody.edwardtorres.dev`. `public/_headers` sets basic security headers, revalidation for HTML, and immutable caching for hashed assets. Metadata, manifest, favicon, and 1200×630 social preview are built into `dist/`. See [PHASE9_REPORT.md](PHASE9_REPORT.md) for exact test counts, bundle sizes, DNS/TLS checks, and production smoke results.

## Known limitations

Fixed-dumbbell/floor-space scope; local-browser persistence without cloud backup; procedural rather than clinical anatomy; no live calendar sync; no medical interpretation; and a sizable lazy anatomy chunk. Calendar imports must be repeated after schedule changes. Physical touch hardware and assistive technology require an external/manual release check.
