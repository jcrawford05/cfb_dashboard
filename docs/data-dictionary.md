# Public data contract (schema version 1)

The executable JSON contracts are in `src/data/schemas.ts` (Zod). Raw CFBD response contracts are separate in `scripts/refresh-data/sourceSchemas.ts`. Unknown raw fields are stripped; public objects reject unknown fields. `npm run data:validate` validates every manifest entry and cross-file reference.

Every document has the following envelope:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Literal `1`; increment when making incompatible changes. |
| `generatedAt` | UTC ISO timestamp of the published content generation, identical across a snapshot. |
| `season` | Football season year; postseason retains its parent season. |
| `sources` | `["fixture"]` or `["cfbd"]`; never label fixtures CFBD. |
| `mode` | `fixture` or `production`. |
| `status` | `available`, `empty`, or `not-implemented`. |
| `notes` | Human-readable caveats, fixture disclosure, or feature availability. |
| `data` | Array of records, except metadata which contains an object. |

| Relative path under `public/data/` | Payload |
| --- | --- |
| `metadata.json` | Available season (one in this build), FBS coverage, request count for the published refresh, SHA-256 content fingerprint, list of the other 14 documents. |
| `teams.json` | Stable string ID, unique slug with ID suffix, name, abbreviation, mascot, conference, classification, sanitized colors and HTTPS logo URL or null. |
| `conferences.json` | Stable string ID, name, abbreviation, classification. |
| `seasons/2026/games.json` | `cfbd-<id>` ID namespace, season, week, regular/postseason, original kickoff ISO time, TBD flag, home/away IDs and names, nullable scores, status, venue and neutral-site flag. |
| `seasons/2026/records.json` | Team ID and source-reported games/wins/losses/ties. Sum must match. |
| `seasons/2026/team-stats.json` | Team ID, source metric name and number/string value. No invented rate conversion. |
| `seasons/2026/player-leaders.json` | Top ten per passing/rushing/receiving YDS category; player ID/name, team ID, category, stat and finite numeric value. |
| `seasons/2026/rankings.json` | Latest available snapshot per supported poll, including week and season type. |
| `seasons/2026/rankings-by-week.json` | All supplied AP Top 25, Coaches Poll, and committee poll snapshots, ordered regular then postseason. Entries include team ID/name, rank and nullable points. Tied ranks are allowed. |
| `seasons/2026/derived/team-form.json` | Per-team last five completed results and average margin, points for/against, and adjusted recent-opponent win percentage. |
| `seasons/2026/derived/schedule-strength.json` | Completed and remaining opponent current win percentage averages, sample counts, and formula version. |
| `seasons/2026/derived/upset-tracker.json` | Completed poll-rank upsets and scheduled rank mismatches, with source ranks and trigger type. |
| `seasons/2026/derived/ranking-vs-results.json` | Latest AP-ranked teams’ poll percentile, season performance inputs, composite score, and descriptive gap. |
| `seasons/2026/derived/weekly-recap.json` | Available per-week final-game highlights and ranking movement when a later poll exists. Unsupported categories are omitted. |
| `seasons/2026/derived/playoff-picture.json` | Latest CFP poll when available; otherwise AP context. Includes records, remaining schedule, ranked opponents, remaining strength, and form. No odds or prediction. |

The year path follows the selected season. A refresh for a different season replaces this single-season tree. Schema and route selectors leave room for multi-season data in a later phase.

## Semantics

- `null` means missing, not zero. A final requires two scores; 0–0 is valid data if the provider reports it as final.
- `scheduled` means CFBD has not marked the game complete. The cached pipeline does not infer live state from kickoff time or partial scores.
- Polls and records have different temporal scope: poll position is from its week; records are current within the whole snapshot. The table caption discloses this.
- Team slugs include the provider-neutral team ID to avoid school-name collisions. Example: `/teams/utah-254`.
- Non-FBS opponents encountered in schedules are given IDs and names with neutral visual metadata; `classification: null` is not an FCS assertion.
- Generation time is intentionally unchanged on semantic no-op refreshes. The Actions run log records those checks; there is no frontend “last checked” claim.
- Derived documents share the snapshot generation timestamp and are rebuilt on each changed source snapshot. An empty derived array uses `status: "empty"`; an available metric has explicit `null` values where required inputs are missing.
- Metadata fingerprint excludes generation timestamps, excludes metadata itself, and includes all normalized payloads and their provenance/status fields. Request-count differences alone do not create a new snapshot.
