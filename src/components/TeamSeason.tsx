import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Game, PollSnapshot, Team } from '../data/types';
import { Link } from '../app/router';
import { isApPoll, pollOrder } from '../lib/rankings';

function shortDate(iso: string | null) { return iso ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(iso)) : 'TBA'; }
function apRankFor(polls: PollSnapshot[], teamId: string, week: number, seasonType: string) {
  return polls.find(p => p.week === week && p.seasonType === seasonType)?.entries.find(e => e.teamId === teamId)?.rank;
}
export function SeasonLedger({ team, games, teams, rankings }: { team: Team; games: Game[]; teams: Team[]; rankings: PollSnapshot[] }) {
  const polls = rankings.filter(isApPoll);
  const rows = [...games].sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? '') || a.week - b.week);
  return <div className="table-wrap"><table className="ledger">
    <caption>AP is the team’s rank in that week’s published poll. A dash means unranked or no poll that week.</caption>
    <thead><tr><th scope="col">Wk</th><th scope="col" className="col-date">Date</th><th scope="col">Opponent</th><th scope="col" className="n">Result</th><th scope="col"><span className="sr-only">Margin</span></th><th scope="col" className="n">AP</th></tr></thead>
    <tbody>{rows.map(game => {
      const home = game.homeId === team.id; const oppId = home ? game.awayId : game.homeId;
      const opp = teams.find(t => t.id === oppId); const oppName = home ? game.awayName : game.homeName;
      const oppRank = apRankFor(polls, oppId, game.week, game.seasonType);
      const own = home ? game.homeScore : game.awayScore; const other = home ? game.awayScore : game.homeScore;
      const final = game.status === 'final' && own !== null && other !== null;
      const m = final ? own! - other! : 0; const out = m > 0 ? 'W' : m < 0 ? 'L' : 'T';
      const c = Math.max(-35, Math.min(35, m)); const w = Math.abs(c) / 70 * 100;
      const rank = apRankFor(polls, team.id, game.week, game.seasonType);
      return <tr key={game.id} className={final ? '' : 'next'}>
        <td>{game.seasonType === 'postseason' ? 'Post' : game.week}</td>
        <td className="col-date">{shortDate(game.startDate)}</td>
        <td><Link to={`/game/${game.id}`}>{game.neutralSite ? 'vs. ' : home ? '' : 'at '}{oppRank ? `No. ${oppRank} ` : ''}{opp?.name ?? oppName}</Link></td>
        <td className="n">{final ? <span className={`res ${out}`}>{out} {own}-{other}</span> : 'Scheduled'}</td>
        <td>{final ? <div className="mbar" aria-hidden="true"><span style={{ [c >= 0 ? 'left' : 'right']: '50%', width: `${w}%`, background: c >= 0 ? 'var(--team-primary)' : 'var(--mute)' } as CSSProperties}/></div> : null}</td>
        <td className="n">{rank ?? '—'}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null); const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el); return () => ro.disconnect(); }, []);
  return [ref, size] as const;
}
export function RankLine({ team, rankings }: { team: Team; rankings: PollSnapshot[] }) {
  const polls = rankings.filter(isApPoll).sort(pollOrder);
  const pts = polls.map((p, i) => ({ i, label: p.seasonType === 'postseason' ? 'Post' : `Wk ${p.week}`, rank: p.entries.find(e => e.teamId === team.id)?.rank ?? null }));
  const ranked = pts.filter(p => p.rank !== null) as { i: number; label: string; rank: number }[];
  const [ref, { w: W, h: H }] = useWidth<HTMLDivElement>();
  if (!ranked.length) return <p className="muted">Not ranked in any published AP poll this season.</p>;
  const L = 28, R = 12, top = 14, bot = 24, n = Math.max(1, pts.length - 1);
  const x = (i: number) => L + i / n * (W - L - R); const y = (r: number) => top + (r - 1) / 24 * (H - top - bot);
  const segs: string[] = []; let cur = '';
  pts.forEach((p, i) => { if (p.rank === null) { if (cur) segs.push(cur); cur = ''; return; } cur += cur ? ` H${x(i)} V${y(p.rank)}` : `M${x(i)},${y(p.rank)}`; });
  if (cur) segs.push(cur);
  const last = ranked.at(-1)!;
  return <div className="rank-fig" ref={ref} role="img" aria-label={`${team.name} AP rank by week: ${ranked.map(p => `${p.label} ${p.rank}`).join(', ')}`}>
    {W > 0 && <svg aria-hidden="true">
      {[1, 10, 25].map(v => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--rule)"/><text x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
      {segs.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--team-primary)" strokeWidth={2.5}/>)}
      <text x={x(0)} y={H - 4}>{pts[0].label}</text>
      {pts.length > 1 && <text x={x(pts.length - 1)} y={H - 4} textAnchor="end">{pts.at(-1)!.label}</text>}
      <circle cx={x(last.i)} cy={y(last.rank)} r={4} fill="var(--team-primary)"/>
      <text className="k" x={x(last.i)} y={y(last.rank) - 9} textAnchor={last.i > n / 2 ? 'end' : 'start'}>No. {last.rank}</text>
    </svg>}
  </div>;
}
