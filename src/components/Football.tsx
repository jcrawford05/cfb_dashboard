import type { Team, Game } from '../data/types';
import type { Snapshot } from '../data/cfbdStaticRepository';
import { Link } from '../app/router';
import { gameTime, recordText } from '../lib/format';
export function TeamMark({ team }: { team?: Team }) {
  return <span className="team-mark" style={{ borderColor: team?.color }} aria-hidden="true">{team?.abbreviation?.slice(0,4) || 'CFB'}</span>;
}
export function GameCard({ game, data }: { game: Game; data: Snapshot }) {
  return <Link className="game-card" to={`/game/${game.id}`} aria-label={`${game.awayName} at ${game.homeName}, ${game.status === 'final' ? 'final' : 'scheduled'}`}>
    <div className="card-meta"><span>{game.seasonType === 'postseason' ? 'Postseason' : `Week ${game.week}`}</span><span className={`badge ${game.status === 'final' ? 'final' : ''}`}>{game.status === 'final' ? 'Final' : 'Scheduled'}</span></div>
    {[['away',game.awayId,game.awayName,game.awayScore],['home',game.homeId,game.homeName,game.homeScore]].map(([side,id,name,score]) => <div className="score-row" key={side}><TeamMark team={data.teams.find(t => t.id === id)}/><div><strong>{name}</strong><small>{recordText(data.records.find(r => r.teamId === id))}</small></div><b className="score">{score ?? '—'}</b></div>)}
    <div className="card-bottom"><span>{gameTime(game)}</span><span aria-hidden="true">↗</span></div>
  </Link>;
}
export function GameGrid({ games, data }: { games: Game[]; data: Snapshot }) { return <div className="game-grid">{games.map(game => <GameCard key={game.id} game={game} data={data}/>)}</div>; }
export function SectionHeading({ title, detail, to }: { title: string; detail?: string; to?: string }) { return <div className="section-heading"><h2>{title}</h2>{to ? <Link to={to}>{detail || 'View all'} <span aria-hidden="true">↗</span></Link> : detail ? <span className="muted">{detail}</span> : null}</div>; }
