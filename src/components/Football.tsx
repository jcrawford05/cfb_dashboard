import type { CSSProperties } from 'react';
import type { Team, Game } from '../data/types';
import type { Snapshot } from '../data/cfbdStaticRepository';
import { Link } from '../app/router';
import { gameTime, recordText } from '../lib/format';
import { latestApRanks } from '../lib/rankings';
import { FavoriteButton } from './FavoriteButton';
export function TeamMark({ team }: { team?: Team }) {
  return <span className="team-mark" style={{ '--team': team?.color ?? '#888888' } as CSSProperties} aria-hidden="true"/>;
}
export function TeamLogo({ team, className = '' }: { team?: Team; className?: string }) {
  if (!team?.logo) return <TeamMark team={team}/>;
  return <img className={`team-logo ${className}`} src={team.logo} alt="" loading="lazy" onError={event => { event.currentTarget.replaceWith(Object.assign(document.createElement('span'), { className: 'team-mark' })); }}/>;
}
export function GameCard({ game, data, favoriteIds = [], onToggleFavorite }: { game: Game; data: Snapshot; favoriteIds?: string[]; onToggleFavorite?: (id: string) => void }) {
  const away = data.teams.find(team => team.id === game.awayId); const home = data.teams.find(team => team.id === game.homeId);
  const ranks = latestApRanks(data.rankings);
  const final = game.status === 'final' && game.homeScore !== null && game.awayScore !== null;
  const leader = final ? (game.homeScore! > game.awayScore! ? 'home' : game.homeScore! < game.awayScore! ? 'away' : '') : '';
  const upset = final && data.upsets.some(u => u.gameId === game.id && u.state === 'completed');
  const sides: { side: string; team?: Team; name: string; score: number | null }[] = [
    { side: 'away', team: away, name: game.awayName, score: game.awayScore },
    { side: 'home', team: home, name: game.homeName, score: game.homeScore },
  ];
  const label = `${game.awayName} ${game.neutralSite ? 'vs.' : 'at'} ${game.homeName}, ${final ? `final, ${game.awayScore} to ${game.homeScore}` : gameTime(game)}`;
  // The link covers the whole card and carries the full game text for screen readers, so the visible rows are aria-hidden.
  // Star buttons sit above the link, one beside each team's row.
  return <article className="game-card">
    <Link className="game-card-main" to={`/game/${game.id}`}><span className="sr-only">{label}</span></Link>
    <div className="card-meta" aria-hidden="true"><span className={final ? 'final' : ''}>{final ? 'Final' : gameTime(game)}</span>{upset ? <span className="flag">Upset</span> : <span>{game.seasonType === 'postseason' ? 'Postseason' : `Week ${game.week}`}</span>}</div>
    {sides.map(({side,team,name,score}) => {
      const rank = team ? ranks.get(team.id) : undefined;
      const star = onToggleFavorite && team;
      return <div className={`score-row${leader && leader !== side ? ' lose' : ''}${star ? ' has-star' : ''}`} key={side}><span className="tt" aria-hidden="true"><span className="chip" style={{ background: team?.color ?? '#888888' }}/>{rank ? <sup>{rank}</sup> : null}{name}{!final && <small>{recordText(data.records.find(r => r.teamId === team?.id))}</small>}</span><b className="score" aria-hidden="true">{final ? score : ''}</b>{star && <FavoriteButton compact teamName={team.name} favorite={favoriteIds.includes(team.id)} onToggle={() => onToggleFavorite(team.id)}/>}</div>;
    })}
    {game.venue && <div className="card-bottom" aria-hidden="true">{game.neutralSite ? `${game.venue}, neutral site` : game.venue}</div>}
  </article>;
}
export function GameGrid({ games, data, favoriteIds, onToggleFavorite, single = false }: { games: Game[]; data: Snapshot; favoriteIds?: string[]; onToggleFavorite?: (id: string) => void; single?: boolean }) { return <div className={single ? 'game-grid one' : 'game-grid'}>{games.map(game => <GameCard key={game.id} game={game} data={data} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite}/>)}</div>; }
export function SectionHeading({ title, detail, to }: { title: string; detail?: string; to?: string }) { return <div className="section-heading"><h2>{title}</h2>{to ? <Link to={to}>{detail || 'See all'}</Link> : detail ? <span className="muted">{detail}</span> : null}</div>; }
