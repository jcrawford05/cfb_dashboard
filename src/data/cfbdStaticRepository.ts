import { z } from 'zod';
import { metadataSchema, schemas } from './schemas';
export async function readDocument<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal, transport: typeof fetch = fetch): Promise<T> {
  let response: Response;
  try { response = await transport(`${import.meta.env?.BASE_URL ?? './'}data/${path}`, { signal, cache: 'no-cache' }); }
  catch { throw new Error('Saved data could not be reached. Check your connection and retry.'); }
  if (!response.ok) throw new Error('Saved data is unavailable. Please try again shortly.');
  let raw: unknown;
  try { raw = await response.json(); } catch { throw new Error('The saved data could not be read.'); }
  const result = schema.safeParse(raw);
  if (!result.success) throw new Error('The saved data format is not supported.');
  return result.data;
}
export async function loadSnapshot(signal?: AbortSignal) {
  const metadata = await readDocument('metadata.json', metadataSchema, signal);
  const prefix = `seasons/${metadata.season}/`;
  const [teams, games, records, rankings, stats, leaders] = await Promise.all([
    readDocument('teams.json', schemas.teams, signal), readDocument(prefix + 'games.json', schemas.games, signal),
    readDocument(prefix + 'records.json', schemas.records, signal), readDocument(prefix + 'rankings-by-week.json', schemas['rankings-by-week'], signal),
    readDocument(prefix + 'team-stats.json', schemas['team-stats'], signal), readDocument(prefix + 'player-leaders.json', schemas['player-leaders'], signal),
  ]);
  for (const doc of [teams, games, records, rankings, stats, leaders]) if (doc.season !== metadata.season || doc.generatedAt !== metadata.generatedAt || doc.mode !== metadata.mode) throw new Error('A new snapshot is publishing. Please retry in a moment.');
  return { metadata, teams: teams.data, games: games.data, records: records.data, rankings: rankings.data, stats: stats.data, leaders: leaders.data };
}
export type Snapshot = Awaited<ReturnType<typeof loadSnapshot>>;
