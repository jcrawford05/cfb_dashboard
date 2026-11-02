import type { PollSnapshot } from '../data/types';
export function pollOrder(a: PollSnapshot, b: PollSnapshot) {
  return Number(a.seasonType === 'postseason') - Number(b.seasonType === 'postseason') || a.week - b.week;
}
export function previousPoll(options: PollSnapshot[], current?: PollSnapshot) {
  if (!current) return undefined;
  const ordered = [...options].sort(pollOrder);
  const index = ordered.findIndex(p => p.week === current.week && p.seasonType === current.seasonType && p.poll === current.poll);
  return index > 0 ? ordered[index - 1] : undefined;
}
export function rankMap(snapshot?: PollSnapshot) { return new Map(snapshot?.entries.map(entry => [entry.teamId, entry.rank]) ?? []); }
export function rankMovement(previous: number | undefined, current: number) { return previous === undefined ? null : previous - current; }
