import { z } from 'zod';
const nonnegative = z.number().int().nonnegative();
const sourceId = z.number().int().positive();
const text = z.string().nullable().optional();
const period = z.enum(['regular', 'postseason']);
export const sourceSchemas = {
  teams: z.array(z.object({ id: sourceId, school: z.string().min(1), abbreviation: text, mascot: text, conference: text, classification: text, color: text, alternateColor: text, logos: z.array(z.string()).nullable().optional() })).nonempty(),
  conferences: z.array(z.object({ id: sourceId, name: z.string().min(1), abbreviation: text, classification: text })).nonempty(),
  games: z.array(z.object({ id: sourceId, season: z.number().int(), week: nonnegative, seasonType: period,
    startDate: z.string().datetime({ offset: true }).nullable(), startTimeTBD: z.boolean().optional(), completed: z.boolean(),
    homeId: sourceId, homeTeam: z.string().min(1), awayId: sourceId, awayTeam: z.string().min(1),
    homePoints: nonnegative.nullable(), awayPoints: nonnegative.nullable(), venue: text, neutralSite: z.boolean().optional(),
  })),
  records: z.array(z.object({ year: z.number().int(), teamId: sourceId, total: z.object({ games: nonnegative, wins: nonnegative, losses: nonnegative, ties: nonnegative }) })),
  rankings: z.array(z.object({ season: z.number().int(), seasonType: period, week: nonnegative, polls: z.array(z.object({ poll: z.string(), ranks: z.array(z.object({ rank: z.number().int().positive(), teamId: sourceId.nullable().optional(), school: z.string(), points: z.number().nonnegative().nullable().optional() })) })) })),
  stats: z.array(z.object({ season: z.number().int(), team: z.string(), statName: z.string(), statValue: z.union([z.string(), z.number().finite()]) })),
  players: z.array(z.object({ season: z.number().int(), playerId: z.union([z.string(), sourceId]), player: z.string(), team: z.string(), category: z.string(), statType: z.string(), stat: z.union([z.string(), z.number().finite()]) })),
};
export type SourceKey = keyof typeof sourceSchemas;
export type RawBundle = { [K in SourceKey]: z.infer<(typeof sourceSchemas)[K]> };
export function parseSources(raw: Record<SourceKey, unknown>): RawBundle {
  const output: Partial<RawBundle> = {};
  for (const key of Object.keys(sourceSchemas) as SourceKey[]) {
    const result = sourceSchemas[key].safeParse(raw[key]);
    if (!result.success) throw new Error(`Invalid ${key} response; snapshot preserved.`);
    Object.assign(output, { [key]: result.data });
  }
  return output as RawBundle;
}
