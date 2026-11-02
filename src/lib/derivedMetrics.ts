import type { Game, PollSnapshot, Team } from '../data/types';
import { pollOrder } from './rankings';

type RecordRow = { teamId: string; wins: number; losses: number; ties: number; games: number };
const apOnly = (poll: PollSnapshot) => /^(AP Top 25|AP Poll)$/i.test(poll.poll);
const finalGames = (games: Game[]) => games.filter(g => g.status === 'final' && g.homeScore !== null && g.awayScore !== null);
const opponentOf = (game: Game, id: string) => game.homeId === id ? game.awayId : game.homeId;
const result = (game: Game, id: string) => {
  const own = game.homeId === id ? game.homeScore! : game.awayScore!;
  const other = game.homeId === id ? game.awayScore! : game.homeScore!;
  return { outcome: own > other ? 'W' as const : own < other ? 'L' as const : 'T' as const, pointsFor: own, pointsAgainst: other };
};
function currentRanks(polls: PollSnapshot[]) {
  const latest = [...polls.filter(apOnly)].sort(pollOrder).at(-1);
  return { latest, ranks: new Map(latest?.entries.map(e => [e.teamId, e.rank]) ?? []) };
}
function pregameRanks(game: Game, polls: PollSnapshot[]) {
  const eligible = polls.filter(p => apOnly(p) && p.week < game.week && p.seasonType === game.seasonType).sort(pollOrder);
  const chosen = eligible.at(-1);
  return new Map(chosen?.entries.map(e => [e.teamId, e.rank]) ?? []);
}
function adjustedOpponentPct(opponentId: string, excludeTeamId: string, records: RecordRow[], finals: Game[]) {
  const record = records.find(r => r.teamId === opponentId);
  if (!record) return null;
  let wins = record.wins, losses = record.losses, ties = record.ties;
  for (const game of finals.filter(g => (g.homeId === opponentId && g.awayId === excludeTeamId) || (g.awayId === opponentId && g.homeId === excludeTeamId))) {
    const own = game.homeId === opponentId ? game.homeScore! : game.awayScore!;
    const other = game.homeId === opponentId ? game.awayScore! : game.homeScore!;
    if (own > other) wins = Math.max(0, wins - 1); else if (own < other) losses = Math.max(0, losses - 1); else ties = Math.max(0, ties - 1);
  }
  return wins + losses + ties ? (wins + ties / 2) / (wins + losses + ties) : null;
}
function mean(values: Array<number | null>) { const valid = values.filter((n): n is number => n !== null && Number.isFinite(n)); return valid.length ? valid.reduce((a,b) => a+b, 0) / valid.length : null; }
function percentile(values: Array<{ teamId: string; value: number }>) {
  if (values.length === 1) return new Map([[values[0].teamId, 50]]);
  const sorted = [...values].sort((a,b) => a.value-b.value);
  const out = new Map<string, number>();
  for (let i=0;i<sorted.length;i++) {
    let first=i,last=i;
    while(first>0 && sorted[first-1].value===sorted[i].value) first--;
    while(last<sorted.length-1 && sorted[last+1].value===sorted[i].value) last++;
    out.set(sorted[i].teamId, ((first+last)/2)/(sorted.length-1)*100);
  }
  return out;
}
const round = (n: number | null) => n === null ? null : Math.round(n*100)/100;

export function calculateDerivedMetrics(teams: Team[], games: Game[], records: RecordRow[], polls: PollSnapshot[]) {
  const finals = finalGames(games);
  const forms = teams.map(team => {
    const recent = finals.filter(g => g.homeId===team.id || g.awayId===team.id).sort((a,b)=>(b.startDate??'').localeCompare(a.startDate??'')).slice(0,5);
    const outcomes = recent.map(g => ({ gameId:g.id, opponentId:opponentOf(g,team.id), ...result(g,team.id) }));
    return { teamId:team.id, sampleSize:outcomes.length, results:outcomes, averageMargin:round(mean(outcomes.map(r=>r.pointsFor-r.pointsAgainst))), averagePointsFor:round(mean(outcomes.map(r=>r.pointsFor))), averagePointsAgainst:round(mean(outcomes.map(r=>r.pointsAgainst))), opponentWinPercentage:round(mean(outcomes.map(r=>adjustedOpponentPct(r.opponentId,team.id,records,finals)))) };
  });
  const strength = teams.map(team => {
    const played = finals.filter(g => g.homeId===team.id || g.awayId===team.id);
    const remaining = games.filter(g => g.status==='scheduled' && (g.homeId===team.id || g.awayId===team.id));
    return { teamId:team.id, completedScore:round(mean(played.map(g=>adjustedOpponentPct(opponentOf(g,team.id),team.id,records,finals)))), remainingScore:round(mean(remaining.map(g=>adjustedOpponentPct(opponentOf(g,team.id),team.id,records,finals)))), completedSample:played.length, remainingSample:remaining.length, formulaVersion:'opponent-win-pct-v1' as const };
  });
  const { latest, ranks } = currentRanks(polls);
  const upsets:any[]=[];
  for (const game of games) {
    if (game.status==='final') {
      const before = pregameRanks(game,polls);
      const winnerId = game.homeScore! > game.awayScore! ? game.homeId : game.awayId;
      const loserId = winnerId===game.homeId ? game.awayId : game.homeId;
      const winnerPregameRank = before.get(winnerId) ?? null, loserPregameRank = before.get(loserId) ?? null;
      const trigger = loserPregameRank!==null && winnerPregameRank===null ? 'unranked-over-ranked' : winnerPregameRank!==null && loserPregameRank!==null && winnerPregameRank>loserPregameRank ? 'lower-ranked-over-higher-ranked' : null;
      if (trigger) upsets.push({ gameId:game.id, week:game.week, seasonType:game.seasonType, state:'completed', winnerId, loserId, challengerId:null, rankedTeamId:null, winnerPregameRank, loserPregameRank, rankGap:winnerPregameRank!==null&&loserPregameRank!==null?winnerPregameRank-loserPregameRank:null, trigger });
    } else if (game.status==='scheduled') {
      const homeRank=ranks.get(game.homeId)??null, awayRank=ranks.get(game.awayId)??null;
      if (homeRank!==null && awayRank===null) upsets.push({gameId:game.id,week:game.week,seasonType:game.seasonType,state:'watch',winnerId:null,loserId:null,challengerId:game.awayId,rankedTeamId:game.homeId,winnerPregameRank:null,loserPregameRank:homeRank,rankGap:null,trigger:'unranked-over-ranked'});
      else if (awayRank!==null && homeRank===null) upsets.push({gameId:game.id,week:game.week,seasonType:game.seasonType,state:'watch',winnerId:null,loserId:null,challengerId:game.homeId,rankedTeamId:game.awayId,winnerPregameRank:null,loserPregameRank:awayRank,rankGap:null,trigger:'unranked-over-ranked'});
      else if (homeRank!==null && awayRank!==null && homeRank>awayRank) upsets.push({gameId:game.id,week:game.week,seasonType:game.seasonType,state:'watch',winnerId:null,loserId:null,challengerId:game.homeId,rankedTeamId:game.awayId,winnerPregameRank:null,loserPregameRank:awayRank,rankGap:homeRank-awayRank,trigger:'lower-ranked-over-higher-ranked'});
      else if (homeRank!==null && awayRank!==null && awayRank>homeRank) upsets.push({gameId:game.id,week:game.week,seasonType:game.seasonType,state:'watch',winnerId:null,loserId:null,challengerId:game.awayId,rankedTeamId:game.homeId,winnerPregameRank:null,loserPregameRank:homeRank,rankGap:awayRank-homeRank,trigger:'lower-ranked-over-higher-ranked'});
    }
  }
  const recordMap=new Map(records.map(r=>[r.teamId,r]));
  const differential=teams.map(team=>{const own=finals.filter(g=>g.homeId===team.id||g.awayId===team.id);return {teamId:team.id,value:own.length?own.reduce((sum,g)=>sum+(result(g,team.id).pointsFor-result(g,team.id).pointsAgainst),0)/own.length:NaN};}).filter(x=>Number.isFinite(x.value));
  const differentialPct=percentile(differential);
  const rankedEntries=latest?.entries??[];
  const rankingResults=rankedEntries.map(entry=>{
    const record=recordMap.get(entry.teamId);const sos=strength.find(x=>x.teamId===entry.teamId)?.completedScore??null;const pointDifferential=differential.find(x=>x.teamId===entry.teamId)?.value??null;
    const winPct=record&&record.games?(record.wins+record.ties/2)/record.games:null;const diffPct=differentialPct.get(entry.teamId)??null;
    const score=winPct!==null&&sos!==null&&diffPct!==null?winPct*40+sos*30+diffPct*0.3:null;
    const rankPercentile=((26-entry.rank)/25)*100;
    return {teamId:entry.teamId,teamName:entry.teamName,rank:entry.rank,rankPercentile:round(rankPercentile)!,winPercentage:round(winPct),scheduleStrength:round(sos),pointDifferential:round(pointDifferential),pointDifferentialPercentile:round(diffPct),performanceScore:round(score),gap:score===null?null:round(score-rankPercentile)};
  });
  const weekly: Array<{week:number;cards:Array<{category:'biggest-upset'|'closest-game'|'highest-scoring'|'largest-margin'|'ranking-mover';gameId:string|null;teamId:string|null;description:string}>}> = [];
  const weeks=[...new Set(finals.map(g=>g.week))].sort((a,b)=>a-b);
  for(const week of weeks){
    const weekGames=finals.filter(g=>g.week===week);const cards:any[]=[];
    const rankedUpsets=upsets.filter(u=>u.week===week&&u.state==='completed').sort((a,b)=>(b.rankGap??26)-(a.rankGap??26));
    if(rankedUpsets[0]){const u=rankedUpsets[0],g=weekGames.find(v=>v.id===u.gameId)!;cards.push({category:'biggest-upset',gameId:g.id,teamId:u.winnerId,description:`${teams.find(t=>t.id===u.winnerId)?.name??'Winner'} upset ${teams.find(t=>t.id===u.loserId)?.name??'opponent'}${u.rankGap===null?' (unranked over ranked)':` with a ${u.rankGap}-place pregame rank gap`}.`});}
    const margins=weekGames.map(g=>({g,margin:Math.abs(g.homeScore!-g.awayScore!),total:g.homeScore!+g.awayScore!}));
    const closest=[...margins].sort((a,b)=>a.margin-b.margin)[0];if(closest)cards.push({category:'closest-game',gameId:closest.g.id,teamId:null,description:`${closest.g.awayName} at ${closest.g.homeName} finished with a ${closest.margin}-point margin.`});
    const high=[...margins].sort((a,b)=>b.total-a.total)[0];if(high)cards.push({category:'highest-scoring',gameId:high.g.id,teamId:null,description:`${high.g.awayName} and ${high.g.homeName} combined for ${high.total} points.`});
    const large=[...margins].sort((a,b)=>b.margin-a.margin)[0];if(large)cards.push({category:'largest-margin',gameId:large.g.id,teamId:null,description:`${large.g.homeScore!>large.g.awayScore!?large.g.homeName:large.g.awayName} won by ${large.margin} points.`});
    weekly.push({week,cards});
  }
  if(latest){
    const prior=[...polls.filter(p=>apOnly(p)&&p.poll===latest.poll)].sort(pollOrder).filter(p=>p.week<latest.week||p.seasonType!==latest.seasonType).at(-1);
    if(prior){
      const old=new Map(prior.entries.map(e=>[e.teamId,e.rank]));
      const mover=[...latest.entries].map(e=>({entry:e,delta:(old.get(e.teamId)??e.rank)-e.rank})).sort((a,b)=>b.delta-a.delta)[0];
      if(mover&&mover.delta>0){let recap=weekly.find(w=>w.week===latest.week);if(!recap){recap={week:latest.week,cards:[]};weekly.push(recap);weekly.sort((a,b)=>a.week-b.week);}recap.cards.push({category:'ranking-mover',gameId:null,teamId:mover.entry.teamId,description:`${mover.entry.teamName} moved up ${mover.delta} places in the ${latest.poll}.`});}
    }
  }
  const committee=[...polls.filter(p=>/^(Playoff Committee Rankings|CFP)$/i.test(p.poll))].sort(pollOrder).at(-1);
  const playoffPoll=committee??latest;
  const playoffRanks=new Map(playoffPoll?.entries.map(e=>[e.teamId,e.rank])??[]);
  const playoff=(playoffPoll?.entries??[]).map(entry=>{
    const team=teams.find(t=>t.id===entry.teamId);const record=recordMap.get(entry.teamId);const future=games.filter(g=>g.status==='scheduled'&&(g.homeId===entry.teamId||g.awayId===entry.teamId));
    const summary=forms.find(f=>f.teamId===entry.teamId);const recent=summary?.results.map(r=>r.outcome).join('')??'';
    return {teamId:entry.teamId,rank:entry.rank,wins:record?.wins??0,losses:record?.losses??0,ties:record?.ties??0,conference:team?.conference??null,remainingGames:future.length,rankedOpponentsRemaining:future.filter(g=>playoffRanks.has(opponentOf(g,entry.teamId))).length,remainingStrength:strength.find(s=>s.teamId===entry.teamId)?.remainingScore??null,recentForm:recent};
  });
  const notes=playoffPoll?[`Source poll: ${playoffPoll.poll}, week ${playoffPoll.week} (${playoffPoll.seasonType}).`,...(committee?[]:['No CFP committee snapshot is available. AP Top 25 is shown as descriptive context, not a playoff selection or prediction.'])]:['No published AP or CFP poll is available; playoff context is unavailable.'];
  return { forms, strength, upsets, rankingResults, weekly, playoff, playoffSource:playoffPoll?.poll??null, playoffWeek:playoffPoll?.week??null, playoffNotes:notes };
}
