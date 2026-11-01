import { createHash } from 'node:crypto';
import type { RawBundle } from './sourceSchemas';
import type { Team, PollSnapshot } from '../../src/data/types';
export type PublicFiles = Record<string, any>;
export function contentHash(files: PublicFiles) {
  return createHash('sha256').update(JSON.stringify(Object.entries(files).filter(([path]) => path !== 'metadata.json').sort(([a],[b]) => a.localeCompare(b)).map(([path, doc]) => [path, { ...doc, generatedAt: undefined }]))).digest('hex');
}
const slugify = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const safeColor = (value: string | null | undefined, fallback: string) => value && /^#?[\da-f]{6}$/i.test(value) ? `#${value.replace('#', '')}` : fallback;
const safeLogo = (value: string | undefined) => { try { return value && new URL(value).protocol === 'https:' ? value : null; } catch { return null; } };
export function transform(raw: RawBundle, year: number, mode: 'fixture' | 'production', generatedAt: string, requestCount: number): PublicFiles {
  for (const rows of [raw.games, raw.rankings, raw.stats, raw.players]) {
    if (rows.some(row => row.season !== year)) throw new Error('Source season mismatch; snapshot preserved.');
  }
  if (raw.records.some(row => row.year !== year)) throw new Error('Record season mismatch.');
  const teams: Team[] = raw.teams.map(t => ({
    id: String(t.id), slug: `${slugify(t.school)}-${t.id}`, name: t.school,
    abbreviation: t.abbreviation || t.school.slice(0, 3).toUpperCase(), mascot: t.mascot ?? null,
    conference: t.conference ?? null, classification: t.classification ?? 'fbs',
    color: safeColor(t.color, '#64748b'), alternateColor: safeColor(t.alternateColor, '#e2e8f0'), logo: safeLogo(t.logos?.[0]),
  }));
  const fbsIds = new Set(teams.map(t => t.id));
  const teamIds = new Set(fbsIds);
  // Preserve FCS/lower-division opponents on FBS schedules without inventing metadata.
  for (const g of raw.games) for (const [id, name] of [[g.homeId, g.homeTeam], [g.awayId, g.awayTeam]] as const) {
    if (!teamIds.has(String(id))) {
      teams.push({ id: String(id), slug: `${slugify(name)}-${id}`, name, abbreviation: name.slice(0, 3).toUpperCase(), mascot: null, conference: null, classification: null, color: '#64748b', alternateColor: '#e2e8f0', logo: null });
      teamIds.add(String(id));
    }
  }
  teams.sort((a, b) => a.id.localeCompare(b.id));
  const byName = new Map(teams.map(t => [t.name, t.id]));
  const games = raw.games.map(g => ({ id: `cfbd-${g.id}`, season: year, week: g.week, seasonType: g.seasonType,
    startDate: g.startDate, startTimeTBD: g.startTimeTBD ?? true, homeId: String(g.homeId), awayId: String(g.awayId),
    homeName: g.homeTeam, awayName: g.awayTeam, homeScore: g.homePoints, awayScore: g.awayPoints,
    status: g.completed ? 'final' : 'scheduled', venue: g.venue ?? null, neutralSite: g.neutralSite ?? false,
  })).sort((a,b) => a.id.localeCompare(b.id));
  const records = raw.records.filter(r => teamIds.has(String(r.teamId))).map(r => ({ teamId: String(r.teamId), ...r.total })).sort((a,b) => a.teamId.localeCompare(b.teamId));
  const polls: PollSnapshot[] = raw.rankings.flatMap(w => w.polls.filter(p => /^(AP Top 25|Coaches Poll|Playoff Committee Rankings|CFP)$/i.test(p.poll)).map(p => ({
    poll: p.poll, week: w.week, seasonType: w.seasonType,
    entries: p.ranks.filter(r => r.rank <= 25).map(r => {
      const teamId = r.teamId ? String(r.teamId) : byName.get(r.school);
      if (!teamId || !teamIds.has(teamId)) throw new Error('Ranking has an unresolved team; snapshot preserved.');
      return { teamId, teamName: r.school, rank: r.rank, points: r.points ?? null };
    }).sort((a,b) => a.rank - b.rank || a.teamId.localeCompare(b.teamId)),
  }))).sort((a,b) => Number(a.seasonType === 'postseason') - Number(b.seasonType === 'postseason') || a.week - b.week || a.poll.localeCompare(b.poll));
  const latest = new Map<string, PollSnapshot>();
  for (const p of polls) latest.set(p.poll, p);
  const stats = raw.stats.filter(s => fbsIds.has(byName.get(s.team) ?? '')).map(s => ({ teamId: byName.get(s.team)!, name: s.statName, value: s.statValue })).sort((a,b) => a.teamId.localeCompare(b.teamId) || a.name.localeCompare(b.name));
  // Only yardage leader categories have an unambiguous descending order in this phase.
  const players = raw.players.filter(p => ['passing', 'rushing', 'receiving'].includes(p.category.toLowerCase()) && p.statType.toUpperCase() === 'YDS' && fbsIds.has(byName.get(p.team) ?? '') && String(p.stat).trim() !== '' && Number.isFinite(Number(p.stat)))
    .map(p => ({ playerId: String(p.playerId), name: p.player, teamId: byName.get(p.team)!, category: p.category.toLowerCase(), stat: 'YDS', value: Number(p.stat) }));
  const leaders = ['passing', 'rushing', 'receiving'].flatMap(category => players.filter(p => p.category === category).sort((a,b) => b.value - a.value || a.playerId.localeCompare(b.playerId)).slice(0, 10));
  const notes = mode === 'fixture' ? ['Synthetic demonstration data. Not actual scores, records, or rankings.'] : [];
  const envelope = (data: unknown[], extra: string[] = [], status?: string) => ({ schemaVersion: 1, generatedAt, season: year, sources: [mode === 'fixture' ? 'fixture' : 'cfbd'], mode, status: status ?? (data.length ? 'available' : 'empty'), notes: [...notes, ...extra], data });
  const prefix = `seasons/${year}`;
  const files: PublicFiles = {
    'teams.json': envelope(teams),
    'conferences.json': envelope(raw.conferences.map(c => ({ id: String(c.id), name: c.name, abbreviation: c.abbreviation ?? null, classification: c.classification ?? null })).sort((a,b) => a.id.localeCompare(b.id))),
    [`${prefix}/games.json`]: envelope(games), [`${prefix}/records.json`]: envelope(records),
    [`${prefix}/team-stats.json`]: envelope(stats), [`${prefix}/player-leaders.json`]: envelope(leaders, ['Top 10 per category: passing, rushing, receiving yards. No rate-stat leaders.']),
    [`${prefix}/rankings.json`]: envelope([...latest.values()].sort((a,b) => a.poll.localeCompare(b.poll))),
    [`${prefix}/rankings-by-week.json`]: envelope(polls),
  };
  for (const name of ['team-form', 'schedule-strength', 'upset-tracker', 'weekly-recap', 'playoff-picture']) files[`${prefix}/derived/${name}.json`] = envelope([], ['Planned for Phase 3; no analytics have been calculated.'], 'not-implemented');
  const hash = contentHash(files);
  files['metadata.json'] = { ...envelope([]), status: 'available', data: { availableSeasons: [year], coverage: 'FBS', requestCount, contentHash: hash, files: Object.keys(files).sort() } };
  return files;
}
