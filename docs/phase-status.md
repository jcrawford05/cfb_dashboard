# Phase 0–3 implementation status

## Phase 2 scope implemented

| Acceptance item | Implementation |
| --- | --- |
| Home and favorites | Favorites persist in browser local storage, are filtered against known team IDs, and sync across tabs. Home surfaces favorite programs and their saved games. |
| Team pages and themes | Searchable/filterable team directory; team profile overview, schedule, stats, rankings and transparent analysis tabs; team colors receive a contrast-aware theme. |
| Ranking history | Poll selector, previous-poll movement, dropped-team list, multi-team weekly chart and an accessible table equivalent. Missing rankings remain gaps. |
| Matchup Explorer | Compare a saved scheduled game or choose two teams; see source records/ranks, shared season stat labels, recent results, head-to-head games and common opponents. |
| Static-data boundary | Phase 2 reads the existing generated snapshot only. No browser requests to CFBD or ESPN were added. |

The Phase 2 UI has not been browser- or build-verified in this handoff. Existing Phase 0–1 verification notes below describe the earlier implementation and are not evidence of Phase 2 verification.

## Phase 3 scope implemented

| Acceptance item | Implementation |
| --- | --- |
| Team form | Last five final results, newest first, with W/L/T sequence, averages, sample size, and adjusted recent-opponent win percentage. |
| Schedule strength | Separate completed and remaining opponent current win-percentage averages; head-to-head result removed where available; formula version and samples included. |
| Upset tracking | Completed upsets use the prior available AP poll; scheduled rank mismatches are separately labeled watch items. Filters include season type, team classification, conference, and minimum rank gap. No probabilities are claimed. |
| Ranking versus results | AP-ranked teams are plotted and listed with raw inputs, sortable values, an explicit weighted score, rank percentile, and descriptive gap. |
| Weekly recap | Per-week biggest qualifying upset, closest final, highest combined score, largest margin, and poll mover when available. Unsupported player and comeback cards are omitted. |
| Playoff context | CFP poll when available, with AP fallback explicitly disclosed; record, conference, remaining games, ranked opponents, remaining strength, and recent form. No bracket or odds model. |
| Definitions and freshness | About Data describes formulas, limitations, and same-snapshot generation time; each derived JSON document carries source notes and timestamp. |

The Phase 3 calculations and UI have not been build- or browser-verified in this handoff. The earlier Phase 0–1 checks below do not cover Phases 2–3.

## Scope completed in code

| Acceptance item | Status and evidence |
| --- | --- |
| TypeScript React application | Production build succeeds; dependency installation from the lockfile succeeds. |
| Design tokens and responsive layout | Dark neutral theme, scoped team-color borders, mobile menu, responsive grids, visible keyboard focus and reduced-motion rules. Browser visual inspection is still required. |
| Every target route has a usable state | Rendered with fixtures in automated tests: Home, Scores, Rankings, Teams, individual team, Matchups, individual matchup, Game Center, Playoff Picture, About Data, plus recovery/404 states. |
| Pages-compatible direct links | Hash router and relative Vite assets. Repository-subpath asset/data delivery smoke-tested locally; actual Pages deployment pending owner setup. |
| Loading, empty and error UI | Components implemented; status/alert and empty snapshot render tests pass. App error boundary is included. |
| JSON schemas and provenance | Zod public and source contracts; the Phase 0–1 baseline validated 14 documents. Phase 3 expands this to 15 documents with derived-metric schemas and cross-file checks; not covered by the earlier test/build audit. |
| Secure Actions data pipeline | Trusted-default-branch gate, per-step secret injection, seven broad requests, bounded retry policy and request counting. No source-side key in frontend or published output. |
| No-change behavior | Fixture refresh twice leaves files unchanged; tests confirm stable fingerprint despite source ordering and timestamps. |
| Last-good-snapshot behavior | Tests cover failed request, malformed payload, invalid final scores and unexpected empty responses without overwriting prior snapshot. |
| Generated data shown by app | Static repository loads public documents, validates them and feeds page components. No fixture import exists in production UI. |
| Deployment handoff | Refresh workflow commits only public data and explicitly calls reusable Pages workflow with the resulting SHA. |

## Verification performed

- `npm ci`: successful clean install using the environment's offline package cache. The shipped lockfile includes native dependencies for Linux, macOS, and Windows; only Linux execution was tested.
- `npm run check`: **34 passing tests**, complete public-data validation, TypeScript checking, and successful Vite production build.
- `npm run data:fixtures`: repeated run reports no content changes and zero CFBD requests.
- Source/output boundary audit: no `CFBD_API_KEY`, CFBD API host, or test-secret sentinel appears in frontend source, public data, or built assets.
- Workflow YAML parses; refresh workflow uses a default-branch guard and read-only PR workflow has no secret reference.
- All shipped public JSON documents are valid; references and fingerprint match.
- Static hosting smoke checks verify built HTML and data are served at root and repository-style subpaths.

## Not verified externally

No GitHub repository or API credential was provided. No production CFBD request, GitHub Actions execution, bot commit, or live Pages deployment was performed. Those acceptance steps must be completed by the repository owner using the README.

A browser executable is unavailable in this environment. Route components were rendered in automated React tests, but real browser interactions, screenshots, mobile layout at 320/768/desktop widths, keyboard traversal, and measured contrast remain manual checks. Do not treat this report as a completed Phase 5 audit.

## Owner smoke checklist

1. Run `npm ci`, `npm run check`, then `npm run dev`.
2. At 320 px, 768 px and desktop widths, use the menu and every route. Confirm no page-wide horizontal overflow (the ranking table intentionally scrolls within its container).
3. Test team search, score status/week filters, poll/week selection, a valid team/game link and an invalid link.
4. Tab through the skip link, navigation, forms and cards; verify visible focus. Enable reduced motion.
5. Disable network during a fresh load to inspect the retry state. Recover network and retry.
6. Deploy fixture data to Pages and open/reload a hash deep link directly. Check the analytics pages, empty states, and metric notes.
7. Add the Actions secret and run the real refresh. Confirm the fixture banner disappears, timestamps/source labels change, all 15 documents validate, and the data commit deploys.
8. Run again if the provider has not changed: no commit should be made. Confirm a failed refresh leaves the last published site intact.

## Next recommended phase

Phase 4: add the optional ESPN provider for live game state, drives, field position, and win probability while preserving static pages when the live provider is unavailable.
