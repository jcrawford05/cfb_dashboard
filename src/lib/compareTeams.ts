import type { Game, Team } from '../data/types';
import type { Snapshot } from '../data/cfbdStaticRepository';
export function teamGames(teamId: string, games: Game[]) {
  return games.filter(g=>g.homeId===teamId||g.awayId===teamId).sort((a,b)=>(b.startDate??'').localeCompare(a.startDate??''));
}
export function resultFor(teamId: string, game: Game) {
  if(game.status!=='final'||game.homeScore===null||game.awayScore===null)return null;
  const own=game.homeId===teamId?game.homeScore:game.awayScore;
  const opponent=game.homeId===teamId?game.awayScore:game.homeScore;
  return own>opponent?'W':own<opponent?'L':'T';
}
export function sharedOpponentResults(awayId: string, homeId: string, data: Snapshot) {
  const results=(id:string)=>new Map(teamGames(id,data.games).filter(g=>g.status==='final').map(g=>{
    const opponent=g.homeId===id?g.awayId:g.homeId;return [opponent,resultFor(id,g)] as const;
  }));
  const away=results(awayId),home=results(homeId);
  return [...away.keys()].filter(id=>home.has(id)).map(opponentId=>({opponentId,away:away.get(opponentId),home:home.get(opponentId),opponent:data.teams.find(t=>t.id===opponentId)})).sort((a,b)=>(a.opponent?.name??'').localeCompare(b.opponent?.name??''));
}
