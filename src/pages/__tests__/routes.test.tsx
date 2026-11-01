import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home, Scores, Rankings, Teams, TeamPage, Matchups, GameCenter, Playoffs, About, NotFound } from '../Pages';
import { LoadingState, EmptyState, ErrorState } from '../../components/States';
import { transform } from '../../../scripts/refresh-data/transforms';
import { parseSources } from '../../../scripts/refresh-data/sourceSchemas';
import fixture from '../../../scripts/refresh-data/fixtures/source.json';
import type { Snapshot } from '../../data/cfbdStaticRepository';
const files=transform(parseSources(fixture),2026,'fixture','2026-10-31T12:00:00.000Z',0);
const data:Snapshot={metadata:files['metadata.json'],teams:files['teams.json'].data,games:files['seasons/2026/games.json'].data,records:files['seasons/2026/records.json'].data,rankings:files['seasons/2026/rankings-by-week.json'].data,stats:files['seasons/2026/team-stats.json'].data,leaders:files['seasons/2026/player-leaders.json'].data};
const routes=[
  ['Home',<Home data={data}/>],['Scores',<Scores data={data}/>],['Rankings',<Rankings data={data}/>],['Teams',<Teams data={data}/>],
  ['Team',<TeamPage data={data} slug={data.teams[0].slug}/>],['Matchups',<Matchups data={data}/>],
  ['Pair',<Matchups data={data} pair={`${data.teams[0].slug}-vs-${data.teams[1].slug}`}/>],['Game',<GameCenter data={data} id={data.games[0].id}/>],
  ['Playoffs',<Playoffs data={data}/>],['About',<About data={data}/>],['Not found',<NotFound/>],
] as const;
for(const [name,component] of routes)test(`${name} route renders a usable fixture state with a page heading`,()=>{
  const html=renderToStaticMarkup(component);assert.match(html,/<h1/);assert.ok(!html.includes('undefined'));assert.ok(!html.includes('NaN'));
});
test('unknown team and game produce recovery links',()=>{
  for(const component of [<TeamPage data={data} slug="missing"/>,<GameCenter data={data} id="missing"/>]){
    const html=renderToStaticMarkup(component);assert.match(html,/Page not found/);assert.match(html,/href="#\/"/);
  }
});
test('empty cached season keeps core browsing routes usable',()=>{
  const empty={...data,games:[],rankings:[],stats:[],records:[],leaders:[]};
  for(const component of [<Home data={empty}/>,<Scores data={empty}/>,<Rankings data={empty}/>,<TeamPage data={empty} slug={data.teams[0].slug}/>])assert.match(renderToStaticMarkup(component),/<h1/);
});
test('loading and failure components expose accessible status and retry',()=>{
  assert.match(renderToStaticMarkup(<LoadingState/>),/role="status"/);
  assert.match(renderToStaticMarkup(<ErrorState message="Unavailable" retry={()=>{}}/>),/role="alert"/);
  assert.match(renderToStaticMarkup(<EmptyState title="No games"/>),/No games/);
});
