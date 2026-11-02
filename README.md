# Saturday Standard — NCAA Football Dashboard

A static college-football dashboard implementing **Phases 0–3** of the supplied development guide. Vite + React + TypeScript; no server, account system, or paid service is required. The included data is synthetic and prominently labeled throughout the app.

## Start locally

Install **Node.js 24 LTS** (Node 22.12+ is also supported), unzip this project, then open a terminal in the folder containing `package.json`:

```bash
npm ci
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). No API key is needed. Do not open `index.html` by double-clicking it.

```bash
npm run check          # tests + public data validation + TypeScript + production build
npm run build          # outputs dist/
npm run preview        # serves the production build
npm run data:fixtures  # regenerates the included synthetic 2026 dataset
npm run data:rebuild-derived # adds Phase 2/3 analytics to the existing saved snapshot
```

`data:fixtures` replaces the local public snapshot with demonstration data. Use it only when you intend to reset the current snapshot. It makes zero API requests. The committed snapshot already exists, so regeneration is not required before startup.

When upgrading an older Phase 1 checkout, run `npm run data:rebuild-derived` before `npm run check`. It preserves the saved games, records, polls, and source metadata while adding the derived Phase 3 documents; it makes no CFBD requests.

## Put it on GitHub Pages

1. Create a **public GitHub repository** for free hosting and public-repository Actions usage. Upload the contents of this project, including `.github/`, `public/`, and `package-lock.json`, to its `main` branch. Do not upload `node_modules/` or `dist/`.
2. In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
3. Open **Actions → Deploy GitHub Pages → Run workflow**. Future source pushes to `main` deploy automatically.
4. Open the URL shown by the deployment job. Hash links such as `https://YOUR_NAME.github.io/YOUR_REPO/#/scores` work on refresh and direct navigation.

The build uses `base: './'`; there is no repository-name constant to edit. If the default branch is named something other than `main`, update the `push.branches` entry in `.github/workflows/deploy-pages.yml`. The refresh job discovers the repository's default branch automatically.

## Enable real CFBD data

1. Obtain a free/academic CFBD key through [CollegeFootballData](https://collegefootballdata.com/key). Confirm the quota and endpoint access on your account. This implementation uses no paid/live CFBD endpoints.
2. In the repository, open **Settings → Secrets and variables → Actions → New repository secret**. Name it **`CFBD_API_KEY`** and paste the key as its value. Never paste it into a source file or frontend environment variable.
3. Optionally add a repository **variable** named `DATA_SEASON`, e.g. `2026`. Without it, refreshes use the UTC calendar year, except January/February use the prior football season.
4. Run **Actions → Refresh CFBD data → Run workflow** on the default branch. The optional season input overrides the repository variable for that run.
5. A successful changed snapshot is committed under `public/data/`, then the reusable Pages workflow deploys that exact commit. A successful unchanged refresh does not commit or deploy.

The workflow needs repository content-write permission and permission to deploy to the `github-pages` environment. Branch protection may prevent bot commits; if so, adjust the repository policy deliberately or use a dedicated data branch in a later revision. No force-push workaround is built in.

Production refresh is intentionally restricted to the trusted default-branch GitHub Actions job. Do not run it locally with a key. Pull-request CI has read-only permissions and never receives `CFBD_API_KEY`.

## What's implemented

| Phase | Deliverables |
| --- | --- |
| 0 | Responsive dark design tokens; navigation; all ten planned route patterns; hash-based Pages deep links; error boundary; loading, empty and error states; accessible labels and focus styling; complete synthetic fixtures; executable Zod schemas and metadata convention; Pages deployment workflow. |
| 1 | Seven broad CFBD requests; bounded retries and request-count logging; input and output validation; minimal public JSON; cross-file checks; content fingerprint; unchanged-output detection; staging and rollback; last-good-snapshot protection; default-branch-only refresh workflow; static repository/facade; fixture-driven tests. |
| 2 | Browser-only favorites; personalized home and scoreboard filters; team profile tabs and color themes; poll movement and ranking history chart with data table; matchup explorer for scheduled games, records, stats, prior results, and common opponents. All pages continue to use the generated static snapshot. |
| 3 | Snapshot-generated team form, completed/remaining schedule strength, rule-based upset tracker, ranking-versus-results comparison, weekly recap, and descriptive playoff context. Formulas, timestamps, source limitations, validation, and missing-data states are surfaced in the UI and JSON envelopes. |

**Later phases:** ESPN live polling, drives, field position and win probability (Phase 4); comprehensive browser/accessibility/performance testing (Phase 5).

## Data safeguards

- All source fetches finish and pass validation before public files are replaced.
- A failed request, invalid shape, unresolved reference, invalid final score, suspicious secret value, or unexpectedly emptied existing dataset aborts publication.
- Responses are mapped through explicit allowlists; raw payloads and credentials are never saved.
- The CLI prints only fixed status messages and request counts. Provider response bodies and exceptions are not logged.
- Unknown non-FBS opponents are retained as neutral schedule opponents; no fake team metadata is inferred.
- The entire tree is staged, checked, and renamed with rollback on replacement failure. Remote publication happens only after validation/build and a successful Git commit/push. An abrupt machine termination between local renames is not a database transaction; in Actions it cannot change the deployed site without a completed commit and deployment.
- The single-season starter replaces the public snapshot when changing seasons. It does not yet retain a multi-season archive.
- `generatedAt` describes the content generation time, not the most recent successful no-change check.

## Refresh budget

Seven calls per normal refresh: teams, conferences, games, records, rankings, team statistics, and player season statistics. No per-team or per-player fetch loops. At most one retry per request and 14 calls per run. The workflow runs once daily and three additional windows on Thursdays, Fridays, and Saturdays in January and August–December, at most four runs per day. Extra windows are not yet skipped based on game schedules. A typical in-season month is about 70 runs × 7 calls ≈ 490 calls before retries/manual runs. The guide's 3,000/month academic allocation is a planning assumption; confirm your account's current allowance.

GitHub schedules are best-effort; they do not provide live scores. ESPN is only an unavailable provider stub in this build.

## Project map

- `src/app/` — app shell and small hash router.
- `src/pages/` — dashboard, team, ranking, and matchup views consuming the saved snapshot.
- `src/data/` — provider-neutral types, Zod schemas, static repository and facade.
- `src/components/`, `src/hooks/`, `src/styles/` — shared UI, browser-only favorites, and data loading.
- `scripts/refresh-data/` — all CFBD credential handling, transformations, validation, publication and tests.
- `public/data/` — 14 validated public JSON documents, initially synthetic.
- `.github/workflows/` — PR checks, secure refresh, reusable Pages deployment.
- `docs/` — contracts, implementation notes, verification results, and handoff.

See [data dictionary](docs/data-dictionary.md), [pipeline design](docs/pipeline.md), [phase status and verification](docs/phase-status.md), and the original [development guide](docs/development-guide.md).
