import { z } from 'zod';
export const id = z.string().min(1);
export const season = z.number().int().min(1869).max(2200);
const count = z.number().int().nonnegative();
const color = z.string().regex(/^#[a-fA-F0-9]{6}$/);
export const teamSchema = z.object({
  id, slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: z.string().min(1),
  abbreviation: z.string().min(1), mascot: z.string().nullable(), conference: z.string().nullable(),
  classification: z.string().nullable(), color, alternateColor: color,
  logo: z.string().url().startsWith('https://').nullable(),
}).strict();
export const gameSchema = z.object({
  id, season, week: count, seasonType: z.enum(['regular', 'postseason']),
  startDate: z.string().datetime({ offset: true }).nullable(), startTimeTBD: z.boolean(),
  homeId: id, awayId: id, homeName: z.string(), awayName: z.string(),
  homeScore: count.nullable(), awayScore: count.nullable(),
  status: z.enum(['scheduled', 'final', 'unknown']), venue: z.string().nullable(), neutralSite: z.boolean(),
}).strict().refine(g => g.homeId !== g.awayId, 'Teams must differ')
  .refine(g => g.status !== 'final' || (g.homeScore !== null && g.awayScore !== null), 'Final needs scores');
export const recordSchema = z.object({ teamId: id, wins: count, losses: count, ties: count, games: count }).strict()
  .refine(r => r.games === r.wins + r.losses + r.ties, 'Record totals disagree');
export const rankingSchema = z.object({ teamId: id, teamName: z.string(), rank: z.number().int().min(1).max(25), points: z.number().nonnegative().nullable() }).strict();
export const pollSchema = z.object({ poll: z.string(), week: count, seasonType: z.enum(['regular', 'postseason']), entries: z.array(rankingSchema) }).strict();
export const statSchema = z.object({ teamId: id, name: z.string(), value: z.union([z.number().finite(), z.string()]) }).strict();
export const playerSchema = z.object({ playerId: id, name: z.string(), teamId: id, category: z.string(), stat: z.string(), value: z.number().finite() }).strict();
export const conferenceSchema = z.object({ id, name: z.string(), abbreviation: z.string().nullable(), classification: z.string().nullable() }).strict();
export const teamFormSchema = z.object({ teamId: id, sampleSize: count.max(5), results: z.array(z.object({ gameId: id, opponentId: id, outcome: z.enum(['W','L','T']), pointsFor: count, pointsAgainst: count }).strict()).max(5), averageMargin: z.number().finite().nullable(), averagePointsFor: z.number().finite().nullable(), averagePointsAgainst: z.number().finite().nullable(), opponentWinPercentage: z.number().min(0).max(1).nullable() }).strict();
export const scheduleStrengthSchema = z.object({ teamId: id, completedScore: z.number().min(0).max(1).nullable(), remainingScore: z.number().min(0).max(1).nullable(), completedSample: count, remainingSample: count, formulaVersion: z.literal('opponent-win-pct-v1') }).strict();
export const upsetSchema = z.object({ gameId: id, week: count, seasonType: z.enum(['regular','postseason']), state: z.enum(['completed','watch']), winnerId: id.nullable(), loserId: id.nullable(), challengerId: id.nullable(), rankedTeamId: id.nullable(), winnerPregameRank: count.min(1).max(25).nullable(), loserPregameRank: count.min(1).max(25).nullable(), rankGap: count.nullable(), trigger: z.enum(['unranked-over-ranked','lower-ranked-over-higher-ranked']) }).strict();
export const rankingResultsSchema = z.object({ teamId: id, teamName: z.string(), rank: count.min(1).max(25), rankPercentile: z.number().min(0).max(100), winPercentage: z.number().min(0).max(1).nullable(), scheduleStrength: z.number().min(0).max(1).nullable(), pointDifferential: z.number().finite().nullable(), pointDifferentialPercentile: z.number().min(0).max(100).nullable(), performanceScore: z.number().min(0).max(100).nullable(), gap: z.number().finite().nullable() }).strict();
export const weeklyRecapSchema = z.object({ week: count, cards: z.array(z.object({ category: z.enum(['biggest-upset','closest-game','highest-scoring','largest-margin','ranking-mover']), gameId: id.nullable(), teamId: id.nullable(), description: z.string().min(1) }).strict()) }).strict();
export const playoffTeamSchema = z.object({ teamId: id, rank: count.min(1).max(25), wins: count, losses: count, ties: count, conference: z.string().nullable(), remainingGames: count, rankedOpponentsRemaining: count, remainingStrength: z.number().min(0).max(1).nullable(), recentForm: z.string() }).strict();
export const envelopeShape = {
  schemaVersion: z.literal(1), generatedAt: z.string().datetime(), season,
  sources: z.array(z.enum(['cfbd', 'fixture'])).min(1), mode: z.enum(['fixture', 'production']),
  status: z.enum(['available', 'empty', 'not-implemented']), notes: z.array(z.string()),
};
export function documentSchema<T extends z.ZodTypeAny>(item: T) { return z.object({ ...envelopeShape, data: z.array(item) }).strict(); }
export const metadataSchema = z.object({ ...envelopeShape, data: z.object({
  availableSeasons: z.array(season).min(1), coverage: z.literal('FBS'),
  requestCount: count, contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  files: z.array(z.string().regex(/^[a-z0-9/.-]+\.json$/)),
}).strict() }).strict();
export const schemas = {
  teams: documentSchema(teamSchema), conferences: documentSchema(conferenceSchema),
  games: documentSchema(gameSchema), records: documentSchema(recordSchema),
  'team-stats': documentSchema(statSchema), 'player-leaders': documentSchema(playerSchema),
  rankings: documentSchema(pollSchema), 'rankings-by-week': documentSchema(pollSchema),
  'team-form': documentSchema(teamFormSchema), 'schedule-strength': documentSchema(scheduleStrengthSchema),
  'upset-tracker': documentSchema(upsetSchema), 'ranking-vs-results': documentSchema(rankingResultsSchema),
  'weekly-recap': documentSchema(weeklyRecapSchema), 'playoff-picture': documentSchema(playoffTeamSchema),
  deferred: documentSchema(z.never()),
};
export type Team = z.infer<typeof teamSchema>;
export type Game = z.infer<typeof gameSchema>;
export type PollSnapshot = z.infer<typeof pollSchema>;
export type RankingEntry = z.infer<typeof rankingSchema>;
export type DataMetadata = z.infer<typeof metadataSchema>;
export type DerivedTeamForm = z.infer<typeof teamFormSchema>;
export type DerivedScheduleStrength = z.infer<typeof scheduleStrengthSchema>;
export type DerivedUpset = z.infer<typeof upsetSchema>;
export type DerivedRankingResults = z.infer<typeof rankingResultsSchema>;
export type DerivedWeeklyRecap = z.infer<typeof weeklyRecapSchema>;
export type DerivedPlayoffTeam = z.infer<typeof playoffTeamSchema>;
