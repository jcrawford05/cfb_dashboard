import { basename } from 'node:path';
import { metadataSchema, schemas } from '../../src/data/schemas';
import { contentHash, type PublicFiles } from './transforms';
export function validateFiles(files: PublicFiles) {
  const metadata = metadataSchema.parse(files['metadata.json']);
  const year = metadata.season;
  const required = ['teams.json', 'conferences.json', ...['games', 'records', 'team-stats', 'player-leaders', 'rankings', 'rankings-by-week'].map(n => `seasons/${year}/${n}.json`), ...['team-form', 'schedule-strength', 'upset-tracker', 'weekly-recap', 'playoff-picture'].map(n => `seasons/${year}/derived/${n}.json`)];
  if (JSON.stringify([...metadata.data.files].sort()) !== JSON.stringify(required.sort()) || Object.keys(files).length !== required.length + 1) throw new Error('Incomplete public snapshot.');
  for (const path of required) {
    const name = basename(path, '.json') as keyof typeof schemas;
    const schema = path.includes('/derived/') ? schemas.deferred : schemas[name];
    const result = schema.safeParse(files[path]);
    if (!result.success) throw new Error(`Public schema failed: ${path}`);
    if (result.data.season !== year || result.data.generatedAt !== metadata.generatedAt || result.data.mode !== metadata.mode || JSON.stringify(result.data.sources) !== JSON.stringify(metadata.sources)) throw new Error('Snapshot metadata mismatch.');
    if (!path.includes('/derived/') && result.data.status !== (result.data.data.length ? 'available' : 'empty')) throw new Error('Dataset availability mismatch.');
    if (path.includes('/derived/') && result.data.status !== 'not-implemented') throw new Error('Deferred status mismatch.');
  }
  const teams = schemas.teams.parse(files['teams.json']).data;
  const ids = new Set(teams.map(t => t.id));
  if (ids.size !== teams.length || new Set(teams.map(t => t.slug)).size !== teams.length) throw new Error('Duplicate team identity.');
  const check = (teamId: string) => { if (!ids.has(teamId)) throw new Error('Unresolved team reference.'); };
  const games = schemas.games.parse(files[`seasons/${year}/games.json`]).data;
  if (new Set(games.map(g => g.id)).size !== games.length) throw new Error('Duplicate game identity.');
  games.forEach(g => { check(g.homeId); check(g.awayId); if (g.season !== year) throw new Error('Game season mismatch.'); });
  for (const name of ['records', 'team-stats', 'player-leaders'] as const) for (const row of schemas[name].parse(files[`seasons/${year}/${name}.json`]).data) check(row.teamId);
  const records = schemas.records.parse(files[`seasons/${year}/records.json`]).data;
  if (new Set(records.map(r => r.teamId)).size !== records.length) throw new Error('Duplicate team record.');
  for (const name of ['rankings', 'rankings-by-week'] as const) {
    const polls = schemas[name].parse(files[`seasons/${year}/${name}.json`]).data;
    if (new Set(polls.map(p => `${p.seasonType}:${p.week}:${p.poll}`)).size !== polls.length) throw new Error('Duplicate poll.');
    for (const poll of polls) {
      if (new Set(poll.entries.map(e => e.teamId)).size !== poll.entries.length) throw new Error('Duplicate ranked team.');
      poll.entries.forEach(e => check(e.teamId));
    }
  }
  if (metadata.data.contentHash !== contentHash(files)) throw new Error('Snapshot content hash mismatch.');
}
