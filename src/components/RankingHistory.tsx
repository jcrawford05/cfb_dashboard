import type { PollSnapshot, Team } from '../data/types';
import { pollOrder } from '../lib/rankings';
export function RankingHistory({ snapshots, teams, selectedTeamIds, onSelectionChange, allowSelection = true }: {
  snapshots: PollSnapshot[]; teams: Team[]; selectedTeamIds: string[]; onSelectionChange?: (ids: string[]) => void; allowSelection?: boolean;
}) {
  const teamById = new Map(teams.map(team => [team.id, team]));
  const chosen = selectedTeamIds.map(id => teamById.get(id)).filter((team): team is Team => !!team).slice(0,5);
  const ordered = [...snapshots].sort(pollOrder);
  const weeks = [...new Set(ordered.map(p => `${p.seasonType}:${p.week}`))];
  const width=760, height=300, left=42, right=18, top=22, bottom=42;
  const x=(index:number)=>left+(weeks.length<=1?(width-left-right)/2:index*(width-left-right)/(weeks.length-1));
  const y=(rank:number)=>top+(rank-1)*(height-top-bottom)/24;
  return <section className="ranking-history" aria-labelledby="history-title">
    <div className="history-heading"><div><h2 id="history-title">Ranking history</h2><p className="muted">Lower rank numbers appear higher. Missing poll entries remain gaps.</p></div>{allowSelection&&<label className="history-select">Compare 2–5 teams<select multiple size={Math.min(5,Math.max(2,teams.length))} aria-label="Choose two to five teams for ranking history" value={chosen.map(t=>t.id)} onChange={event=>{const ids=[...event.currentTarget.selectedOptions].map(option=>option.value);onSelectionChange?.(ids.slice(0,5));}}>{teams.map(team=><option value={team.id} key={team.id}>{team.name}</option>)}</select><span className="muted">Use Ctrl-click (Windows) or Command-click (Mac) to select several.</span></label>}</div>
    {chosen.length===0?<p className="muted">Choose a team to display its available history.</p>:weeks.length===0?<p className="muted">No ranking snapshots are available for this poll.</p>:<>
      <div className="history-chart-scroll"><svg className="history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="history-svg-title history-svg-desc">
        <title id="history-svg-title">Weekly {ordered[0]?.poll ?? ''} rankings</title><desc id="history-svg-desc">Rank history for {chosen.map(t=>t.name).join(', ')}. Rank one is at the top; rank twenty-five is at the bottom. Missing ranks are not connected.</desc>
        {[1,5,10,15,20,25].map(rank=><g key={rank}><line x1={left} x2={width-right} y1={y(rank)} y2={y(rank)} className="chart-gridline"/><text x={left-10} y={y(rank)+4} textAnchor="end" className="chart-label">#{rank}</text></g>)}
        {chosen.map((team,index)=>{
          const values=weeks.map(week=>{const [type,rawWeek]=week.split(':');const poll=ordered.find(p=>p.week===Number(rawWeek)&&p.seasonType===type);return poll?.entries.find(entry=>entry.teamId===team.id)?.rank ?? null;});
          const segments:string[]=[];let segment:string[]=[];
          values.forEach((rank,i)=>{if(rank===null){if(segment.length)segments.push(segment.join(' '));segment=[];}else segment.push(`${x(i)},${y(rank)}`);});if(segment.length)segments.push(segment.join(' '));
          return <g key={team.id}><title>{team.name}</title>{segments.map((points,i)=><polyline key={i} points={points} fill="none" stroke={team.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>)}{values.map((rank,i)=>rank===null?null:<circle key={weeks[i]} cx={x(i)} cy={y(rank)} r="5" fill={team.color} stroke="#101416" strokeWidth="2"><title>{`${team.name}, ${weeks[i].replace(':',' · Week ')}: rank ${rank}`}</title></circle>)}</g>;
        })}
        {weeks.map((key,index)=><text key={key} x={x(index)} y={height-12} textAnchor="middle" className="chart-label">{key.replace(':',' · ')}</text>)}
      </svg></div>
      <ul className="chart-legend" aria-label="Chart teams">{chosen.map(team=><li key={team.id}><span style={{background:team.color}} aria-hidden="true"/><span>{team.name}</span></li>)}</ul>
      <div className="table-wrap panel history-data"><table><caption>Accessible ranking history data. A dash means that team was absent from that poll.</caption><thead><tr><th scope="col">Poll week</th>{chosen.map(team=><th scope="col" key={team.id}>{team.name}</th>)}</tr></thead><tbody>{weeks.map(key=>{const [type,week]=key.split(':');const poll=ordered.find(p=>p.week===Number(week)&&p.seasonType===type);return <tr key={key}><th scope="row">{type} · Week {week}</th>{chosen.map(team=><td key={team.id}>{poll?.entries.find(entry=>entry.teamId===team.id)?.rank ?? '—'}</td>)}</tr>;})}</tbody></table></div>
    </>}
  </section>;
}
