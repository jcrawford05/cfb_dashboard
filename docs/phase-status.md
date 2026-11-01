# Phase 0–1 implementation status

## Scope completed in code

| Acceptance item | Status and evidence |
| --- | --- |
| TypeScript React application | Production build succeeds; dependency installation from the lockfile succeeds. |
| Design tokens and responsive layout | Dark neutral theme, scoped team-color borders, mobile menu, responsive grids, visible keyboard focus and reduced-motion rules. Browser visual inspection is still required. |
| Every target route has a usable state | Rendered with fixtures in automated tests: Home, Scores, Rankings, Teams, individual team, Matchups, individual matchup, Game Center, Playoff Picture, About Data, plus recovery/404 states. |
| Pages-compatible direct links | Hash router and relative Vite assets. Repository-subpath asset/data delivery smoke-tested locally; actual Pages deployment pending owner setup. |
| Loading, empty and error UI | Components implemented; status/alert and empty snapshot render tests pass. App error boundary is included. |
| JSON schemas and provenance | Zod public and source contracts; all 14 public documents validated with consistent metadata and a content fingerprint. |
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
6. Deploy fixture data to Pages and open/reload a hash deep link directly.
7. Add the Actions secret and run the real refresh. Confirm the fixture banner disappears, timestamps/source labels change, 14 documents validate, and the data commit deploys.
8. Run again if the provider has not changed: no commit should be made. Confirm a failed refresh leaves the last published site intact.

## Next recommended phase

Phase 2: browser-only favorites with validated IDs; richer team pages and readable team themes; 2–5 team ranking-history charts with table equivalents; full matchup comparison. Reuse the provider-neutral schemas and static repository instead of adding CFBD calls to the frontend.
