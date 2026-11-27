import { useEffect, useState } from 'react';
import { useRoute, Link } from './router';
import { useSnapshot } from '../hooks/useSnapshot';
import { LoadingState, ErrorState } from '../components/States';
import { Home, Scores, Rankings, Teams, TeamPage, Matchups, GameCenter, Playoffs, About, UpsetWatch, RankingResultsPage, WeeklyRecap, NotFound } from '../pages/Pages';
import { dateTime } from '../lib/format';
import { useFavorites } from '../hooks/useFavorites';
const nav = [['/','Home'],['/scores','Scores'],['/rankings','Rankings'],['/teams','Teams'],['/matchups','Matchups'],['/upsets','Upset watch'],['/ranking-vs-results','Rank vs results'],['/weekly-recap','Weekly recap'],['/playoff-picture','Playoff picture'],['/about-data','About the data']];
const PRIMARY_LINKS=4;
export default function App() {
  const path=useRoute();const {snapshot:data,error,retry}=useSnapshot();
  const favorites=useFavorites(data?.teams.map(team=>team.id)??[]);
  useEffect(()=>{const title=nav.find(([to])=>to==='/'?path==='/':path.startsWith(to))?.[1]??'Game';document.title=path==='/'?'Field Notes, college football':`${title}, Field Notes`;requestAnimationFrame(()=>document.querySelector<HTMLHeadingElement>('h1')?.focus({preventScroll:true}));},[path]);
  const active=(to:string)=>to==='/'?path==='/':path.startsWith(to);
  // On phones only the first four sections show; the rest open under "More".
  const [moreOpen,setMoreOpen]=useState(false);
  useEffect(()=>setMoreOpen(false),[path]);
  const extraActive=nav.slice(PRIMARY_LINKS).some(([to])=>active(to));
  let page;
  if(data){
    if(path==='/')page=<Home data={data} favoriteIds={favorites.favoriteIds} onToggleFavorite={favorites.toggle}/>;
    else if(path==='/scores')page=<Scores data={data} favoriteIds={favorites.favoriteIds} onToggleFavorite={favorites.toggle}/>;
    else if(path==='/rankings')page=<Rankings data={data}/>;
    else if(path==='/teams')page=<Teams data={data} favoriteIds={favorites.favoriteIds} onToggleFavorite={favorites.toggle}/>;
    else if(path.startsWith('/teams/'))page=<TeamPage data={data} slug={path.slice(7)} favoriteIds={favorites.favoriteIds} onToggleFavorite={favorites.toggle}/>;
    else if(path==='/matchups')page=<Matchups key={path} data={data}/>;
    else if(path.startsWith('/matchups/'))page=<Matchups key={path} data={data} pair={path.slice(10)}/>;
    else if(path==='/upsets')page=<UpsetWatch data={data}/>;
    else if(path==='/ranking-vs-results')page=<RankingResultsPage data={data}/>;
    else if(path==='/weekly-recap')page=<WeeklyRecap data={data}/>;
    else if(path.startsWith('/game/'))page=<GameCenter data={data} id={path.slice(6)}/>;
    else if(path==='/playoff-picture')page=<Playoffs data={data}/>;
    else if(path==='/about-data')page=<About data={data}/>;
    else page=<NotFound/>;
  }
  return <>
    <a className="skip-link" href="#main" onClick={e=>{e.preventDefault();document.getElementById('main')?.focus();}}>Skip to content</a>
    <header className="mast"><div className="wrap">
      <div className="mast-top">
        <Link to="/" className="name">Field Notes</Link>
        <span className="edition">{data?<>{data.metadata.season} season. Data from {dateTime(data.metadata.generatedAt)}. <Link to="/about-data">Sources</Link></>:'College football'}</span>
      </div>
      <nav aria-label="Main" id="main-nav" className={moreOpen?'open':undefined}>{nav.slice(0,PRIMARY_LINKS).map(([to,label])=><Link key={to} to={to} aria-current={active(to)?'page':undefined}>{label}</Link>)}<button type="button" className={extraActive?'nav-more current':'nav-more'} aria-expanded={moreOpen} aria-controls="main-nav" onClick={()=>setMoreOpen(open=>!open)}>{moreOpen?'Less':'More'}</button>{nav.slice(PRIMARY_LINKS).map(([to,label])=><Link key={to} to={to} className="extra" aria-current={active(to)?'page':undefined}>{label}</Link>)}</nav>
    </div></header>
    {data?.metadata.mode==='fixture'&&<div className="demo-note"><div className="wrap"><b>Demo data.</b> Scores, records and rankings here are made-up examples. <Link to="/about-data">About this snapshot</Link></div></div>}
    <main id="main" className="page" tabIndex={-1}><div className="wrap">{error?<ErrorState message={error} retry={retry}/>:!data?<LoadingState/>:page}</div></main>
    <footer className="foot"><div className="wrap"><span>Field Notes is an independent college football dashboard. Not affiliated with the NCAA or any school.</span><span>{data?`Snapshot from ${dateTime(data.metadata.generatedAt)}`:'Loading snapshot'}</span></div></footer>
  </>;
}
