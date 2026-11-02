import type { Team, Game } from '../data/types';
import type { Snapshot } from '../data/cfbdStaticRepository';
import { Link } from '../app/router';
import { gameTime, recordText } from '../lib/format';
import { FavoriteButton } from './FavoriteButton';
export function TeamMark({ team }: { team?: Team }) {
  return <span className="team-mark" style={{ borderColor: team?.color }} aria-hidden="true">{team?.abbreviation?.slice(0,4) || 'CFB'}</span>;
}
export function TeamLogo({ team, className = '' }: { team?: Team; className?: string }) {
  if (!team?.logo) return <TeamMark team={team}/>;
  return <img className={`team-logo ${className}`} src={team.logo} alt={`${team.name} logo`} loading="lazy" onError={event => { event.currentTarget.replaceWith(Object.assign(document.createElement('span'), { className: 'team-mark', textContent: team.abbreviation.slice(0,4), 'aria-hidden': 'true' })); }}/>;
}
export function GameCard({ game, data, favoriteIds = [], onToggleFavorite }: { game: Game; data: Snapshot; favoriteIds?: string[]; onToggleFavorite?: (id: string) => void }) {
  const away = data.teams.find(team => team.id === game.awayId); const home = data.teams.find(team => team.id === game.homeId);
  const sides: { side: string; team?: Team; name: string; score: number | null }[] = [
    { side: 'away', team: away, name: game.awayName, score: game.awayScore },
    { side: 'home', team: home, name: game.homeName, score: game.homeScore },
  ];
  return <article className="game-card">
    <Link className="game-card-main" to={`/game/${game.id}`} aria-label={`${game.awayName} at ${game.homeName}, ${game.status === 'final' ? 'final' : 'scheduled'}`}>
      <div className="card-meta"><span>{game.seasonType === 'postseason' ? 'Postseason' : `Week ${game.week}`}</span><span className={`badge ${game.status === 'final' ? 'final' : ''}`}>{game.status === 'final' ? 'Final' : 'Scheduled'}</span></div>
      {sides.map(({side,team,name,score}) => <div className="score-row" key={side}><TeamMark team={team}/><div><strong>{name}</strong><small>{recordText(data.records.find(r => r.teamId === team?.id))}</small></div><b className="score">{score ?? '—'}</b></div>)}
      <div className="card-bottom"><span>{gameTime(game)}</span><span aria-hidden="true">↗</span></div>
    </Link>
    {onToggleFavorite && <div className="game-favorites">{[away,home].filter((team): team is Team => !!team).map(team => <FavoriteButton key={team.id} compact teamName={team.name} favorite={favoriteIds.includes(team.id)} onToggle={() => onToggleFavorite(team.id)}/>)}</div>}
  </article>;
}
export function GameGrid({ games, data, favoriteIds, onToggleFavorite }: { games: Game[]; data: Snapshot; favoriteIds?: string[]; onToggleFavorite?: (id: string) => void }) { return <div className="game-grid">{games.map(game => <GameCard key={game.id} game={game} data={data} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite}/>)}</div>; }
export function SectionHeading({ title, detail, to }: { title: string; detail?: string; to?: string }) { return <div className="section-heading"><h2>{title}</h2>{to ? <Link to={to}>{detail || 'View all'} <span aria-hidden="true">↗</span></Link> : detail ? <span className="muted">{detail}</span> : null}</div>; }
