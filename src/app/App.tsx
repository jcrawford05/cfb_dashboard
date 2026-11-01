import { useEffect, useState } from 'react';
import { useRoute, Link } from './router';
import { useSnapshot } from '../hooks/useSnapshot';
import { LoadingState, ErrorState } from '../components/States';
import { Home, Scores, Rankings, Teams, TeamPage, Matchups, GameCenter, Playoffs, About, NotFound } from '../pages/Pages';
import { dateTime } from '../lib/format';
const nav = [['/','Home','◈'],['/scores','Scores','▤'],['/rankings','Rankings','↗'],['/teams','Teams','◉'],['/matchups','Matchups','⇄'],['/playoff-picture','Playoff Picture','◇'],['/about-data','About Data','ⓘ']];
export default function App() {
  const path=useRoute();const {snapshot:data,error,retry}=useSnapshot();const [open,setOpen]=useState(false);
  useEffect(()=>{setOpen(false);const title=nav.find(([to])=>to==='/'?path==='/':path.startsWith(to))?.[1]??'Game Center';document.title=`${title} · Saturday Standard`;requestAnimationFrame(()=>document.querySelector<HTMLHeadingElement>('h1')?.focus({preventScroll:true}));},[path]);
  const active=(to:string)=>to==='/'?path==='/':path.startsWith(to);
  let page;
  if(data){
    if(path==='/')page=<Home data={data}/>;
    else if(path==='/scores')page=<Scores data={data}/>;
    else if(path==='/rankings')page=<Rankings data={data}/>;
    else if(path==='/teams')page=<Teams data={data}/>;
    else if(path.startsWith('/teams/'))page=<TeamPage data={data} slug={path.slice(7)}/>;
    else if(path==='/matchups')page=<Matchups key={path} data={data}/>;
    else if(path.startsWith('/matchups/'))page=<Matchups key={path} data={data} pair={path.slice(10)}/>;
    else if(path.startsWith('/game/'))page=<GameCenter data={data} id={path.slice(6)}/>;
    else if(path==='/playoff-picture')page=<Playoffs data={data}/>;
    else if(path==='/about-data')page=<About data={data}/>;
    else page=<NotFound/>;
  }
  return <><a className="skip-link" href="#main" onClick={e=>{e.preventDefault();document.getElementById('main')?.focus();}}>Skip to content</a><aside className="sidebar"><Link to="/" className="brand" aria-label="Saturday Standard Home"><span className="brand-mark" aria-hidden="true">S<span>∕</span>S</span><span>SATURDAY<br/><b>STANDARD</b><small>COLLEGE FOOTBALL</small></span></Link><button className="menu-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="primary-nav">{open?'Close menu':'Menu'} <span aria-hidden="true">☰</span></button><nav id="primary-nav" className={open?'open':''} aria-label="Main navigation"><p className="nav-label">THE DASHBOARD</p>{nav.map(([to,label,icon])=><Link key={to} to={to} aria-current={active(to)?'page':undefined} className={active(to)?'nav-link active':'nav-link'}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav><div className="sidebar-note"><span className="small-dot"/> A wider view of the game.<p>Independent. Transparent.<br/>Built for college football.</p></div></aside><div className="workspace"><header className="topbar"><span>COLLEGE FOOTBALL <span className="divider">/</span> <b>{data?.metadata.season??'Season'}</b></span><Link to="/about-data" className="source-chip"><span className="small-dot"/>{data?.metadata.mode==='fixture'?'Demo snapshot':'Saved snapshot'}</Link></header><main id="main" tabIndex={-1}>{data?.metadata.mode==='fixture'&&<div className="fixture-banner"><strong>DEMO DATA</strong><span>Scores, records, and rankings are synthetic examples.</span><Link to="/about-data">About this snapshot ↗</Link></div>}{error?<ErrorState message={error} retry={retry}/>:!data?<LoadingState/>:page}</main><footer><span>SATURDAY STANDARD <span className="footer-tag">/ An independent college football dashboard</span></span><span>{data?`Snapshot generated ${dateTime(data.metadata.generatedAt)}`:'Loading snapshot'}</span></footer></div></>;
}
