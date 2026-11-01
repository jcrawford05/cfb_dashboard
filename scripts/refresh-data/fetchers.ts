import type { CfbdClient } from './cfbdClient';
import type { SourceKey } from './sourceSchemas';
export const requestPlan = (season: number): { key: SourceKey; path: string; params: Record<string, string> }[] => {
  const year = String(season);
  return [
    { key: 'teams', path: '/teams/fbs', params: { year } },
    { key: 'conferences', path: '/conferences', params: {} },
    { key: 'games', path: '/games', params: { year, seasonType: 'both', classification: 'fbs' } },
    { key: 'records', path: '/records', params: { year } },
    { key: 'rankings', path: '/rankings', params: { year, seasonType: 'both' } },
    { key: 'stats', path: '/stats/season', params: { year, classification: 'fbs' } },
    { key: 'players', path: '/stats/player/season', params: { year, seasonType: 'both' } },
  ];
};
export async function fetchSources(client: CfbdClient, season: number) {
  const raw = {} as Record<SourceKey, unknown>;
  // Sequential, bounded requests make throttling and budget accounting predictable.
  for (const request of requestPlan(season)) raw[request.key] = await client.get(request.path, request.params);
  return raw;
}
