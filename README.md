# Full Body

Full Body is a browser-based dumbbell workout tracker built around an interactive 3D muscle map. It helps people train with a fixed pair of dumbbells and floor space, log each set, and progress through reps and exercise variations.

**Production:** [fullbody.edwardtorres.dev](https://fullbody.edwardtorres.dev/) · **Release:** v1.0.0

## Features

- Interactive 3D front/back muscle map with text controls for every region and quick muscle workouts.
- Three-day Full Body A/B/C dumbbell program with a configurable weekly calendar and `.ics` export.
- Five-movement benchmark onboarding and conservative, history-based working targets.
- Per-set target, actual reps, RIR, rest timer, edit, skip, resume, and workout history.
- Progressive rep targets and unlocked exercise difficulty variations.
- Progress views, derived Strong/Weak muscle analytics, weekly streaks, and milestones.
- Optional Health & Recovery check-in with general training-support guidance.

## Tech stack

React 19, TypeScript, Vite, Three.js, React Three Fiber, Drei, Vitest, and Cloudflare Workers Static Assets. The app has no backend or account service.

## Local development

```bash
npm ci
npm run dev
npm test
npm run build
```

Vite prints the local URL, normally `http://localhost:5173/`. `npm run preview` serves the production build locally. The static output is `dist/`.

## Training model

The benchmark gives an initial reference at the chosen dumbbell weight. Scheduled sessions present working targets at that weight. Completing the prescribed sets can earn a conservative **+1 total rep** target. After reaching an exercise's rep ceiling at the required effort, a harder variation can become available; choosing it starts at its own lower rep range. History remains attached to the specific movement and load. Quick workouts are separate from scheduled progression.

## Data and privacy

Profile, benchmarks, active sessions, workout history, exercise variation choices, and the optional current-day recovery check-in are stored in this browser's `localStorage`. There is no account, cloud workout database, analytics SDK, or tracking pixel. **Reset All Data** removes only Full Body's five storage keys after confirmation. Calendar export downloads a file for manual import; it is not live calendar sync.

Browser storage is device/profile-specific and can be lost when site data is cleared. If you want to keep workouts, avoid clearing this site's storage. The current app does not offer account backup or cross-device transfer.

## Limitations

- Designed for fixed dumbbells and floor space, with weight recorded per dumbbell in pounds.
- The procedural body map and exercise illustrations are training guides, not a clinical anatomy atlas.
- Recovery content is general training information, not medical advice or a diagnosis.
- Calendar export is a downloaded `.ics` file; plan changes require a new export.
- The 3D scene is lazy-loaded but still a relatively large asset on a slow network.

## Deployment

`wrangler.jsonc` configures an assets-only Cloudflare Worker for `fullbody.edwardtorres.dev`, following the same static deployment pattern as the owner's other React project. Hashed Vite assets receive long browser caching; HTML remains revalidated. For an authenticated maintainer:

```bash
npm ci
npm test
npm run deploy
```

`npm run deploy` builds and runs `wrangler deploy`. It requires a Cloudflare account with permission to deploy Workers and attach the custom domain. No credentials belong in this repository. The app uses state-based navigation rather than pathname routes, so it does not need a SPA route fallback.

See [RELEASE_V1.md](RELEASE_V1.md) for the release record and [PHASE9_REPORT.md](PHASE9_REPORT.md) for verification results.
