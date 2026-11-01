# Pipeline and deployment design

## Request plan

All requests are broad. The owner supplies the key only through a default-branch Actions secret.

| Endpoint | Query | Public result |
| --- | --- | --- |
| `/teams/fbs` | `year` | Team catalog for the season |
| `/conferences` | none | Conference metadata |
| `/games` | `year`, `seasonType=both`, `classification=fbs` | Regular and postseason schedule/results |
| `/records` | `year` | Records joined to known teams |
| `/rankings` | `year`, `seasonType=both` | Poll history and latest per poll |
| `/stats/season` | `year`, `classification=fbs` | Team season statistics using the endpoint's season-wide scope |
| `/stats/player/season` | `year`, `seasonType=both` | Local yardage leader selection from broad player records |

Seven calls normally; at most 14 with retries. Requests are sequential. Each has a 25-second timeout. Network failures retry once after 1 second; 429/5xx retry once after 2 seconds. Other HTTP failures and malformed JSON fail immediately. Retries do not log response bodies or exception objects. Redirects fail rather than forwarding credentials.

These are the basic endpoints documented by CFBD; no `/live/*`, paid preview, ratings, advanced metric, or betting endpoint is used. Account-specific live access has not been exercised in this environment.

## Safe publication

1. Fetch into memory; parse each response.
2. Validate source years; normalize teams, games, records, polls and statistics through allowlists.
3. Create all 14 public documents; calculate deterministic content fingerprint.
4. Validate schemas, required files, IDs, references, metadata consistency, final scores and record totals.
5. Reject credential echoes and previously nonempty datasets that unexpectedly become empty.
6. Compare fingerprint with the saved valid snapshot. If equal, leave every file and timestamp untouched.
7. Write a staging directory, validate it, replace the public directory with rollback on rename failure.
8. Workflow validates again and builds before committing only `public/data/`.
9. Push without force. If another commit races this job, stop; the next owner run refreshes from the new branch head.
10. Call the reusable Pages workflow with the exact data commit SHA. It checks/builds, uploads the complete site artifact, and deploys via GitHub Pages.

An empty dataset on first import is valid for preseason or unavailable coverage. An empty dataset replacing a previously nonempty dataset in the same season and source mode is rejected. To accept an intentional source removal, investigate first and update the policy deliberately.

No raw source snapshots are persisted. There is no private response cache, automatic archival import, or database. A failed workflow leaves the previously deployed GitHub Pages artifact in place.

## Routing and build decisions

Hash-based routes are used rather than a 404 redirect trick. A URL such as `/repo/#/teams/utah-254` always asks Pages for `/repo/`; client navigation interprets the fragment. Relative Vite asset/data paths make repository subpaths work without source edits.

A small React hash router is sufficient for the Phase 0 route table and avoids an additional dependency. Tests use Node's built-in test runner with the `tsx` import hook rather than Vitest. Both are deliberate alternatives to the guide's recommended libraries. Phase 2 can migrate the router without changing the public URL shape or data contracts.

Dependency versions and cross-platform optional binary packages are locked in `package-lock.json`; use `npm ci`. The frontend bundle contains no imports from `scripts/refresh-data/`.

## Schedule

All cron times are UTC, explicitly documented in the workflow. Baseline: 08:17 every day. Extra windows: 14:17, 20:17, 23:17 on Thu/Fri/Sat in January and August–December. These windows are approximations, not a promise of a particular latency after games. No extra per-game requests are made. Sunday morning's baseline picks up late Saturday results. The scheduler does not yet skip extra windows without scheduled games.

## Official references consulted

- [CFBD games and records](https://api.collegefootballdata.com/api/games)
- [CFBD teams](https://api.collegefootballdata.com/api/teams)
- [CFBD rankings](https://api.collegefootballdata.com/api/rankings)
- [CFBD statistics](https://api.collegefootballdata.com/api/stats)
- [CFBD usage and access](https://api.collegefootballdata.com/usage-and-access)
- [GitHub workflow triggering](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

The explicit reusable deploy call accounts for GitHub's rule that a push authenticated with `GITHUB_TOKEN` does not automatically trigger a subsequent push workflow. Source terms and account quotas should be reviewed before public production use; this project claims no official NCAA, CFBD, ESPN, or school affiliation.
