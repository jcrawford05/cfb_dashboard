import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fixture from '../fixtures/source.json';
import { parseSources } from '../sourceSchemas';
import { transform } from '../transforms';
import { validateFiles } from '../validators';
import { publishSnapshot, readSnapshot } from '../publish';
import { CfbdClient } from '../cfbdClient';
import { fetchSources, requestPlan } from '../fetchers';
const clone = () => structuredClone(fixture);
const generate = (raw = clone(), time = '2026-10-31T12:00:00.000Z') => transform(parseSources(raw), 2026, 'fixture', time, 0);
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const mockFetch = (fn: (...args: any[]) => any) => fn as typeof fetch;
async function temp(fn: (target: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'cfb-test-'));
  try { await fn(join(root,'data')); } finally { await rm(root, { recursive: true, force: true }); }
}
test('complete fixture snapshot validates and deferred analytics are explicit', () => {
  const files = generate(); validateFiles(files); assert.equal(Object.keys(files).length,14);
  assert.equal(files['seasons/2026/derived/team-form.json'].status, 'not-implemented');
  assert.deepEqual(files['seasons/2026/derived/team-form.json'].data, []);
});
test('two identical refreshes preserve every byte and timestamp', async () => temp(async target => {
  assert.equal(await publishSnapshot(generate(),target),true);
  const original=await readFile(join(target,'metadata.json'),'utf8');
  assert.equal(await publishSnapshot(generate(clone(),'2026-11-01T12:00:00.000Z'),target),false);
  assert.equal(await readFile(join(target,'metadata.json'),'utf8'),original);
}));
test('source order does not cause a no-op snapshot change', () => {
  const raw=clone(); raw.teams.reverse();raw.games.reverse();raw.stats.reverse();raw.rankings.reverse();raw.records.reverse();raw.players.reverse();
  assert.equal(generate(raw)['metadata.json'].data.contentHash,generate()['metadata.json'].data.contentHash);
});
test('changed data publishes a new complete snapshot', async () => temp(async target => {
  await publishSnapshot(generate(),target);
  const raw=clone();raw.games[0].homePoints=30;
  assert.equal(await publishSnapshot(generate(raw,'2026-11-01T12:00:00.000Z'),target),true);
  assert.equal((await readSnapshot(target))?.['seasons/2026/games.json'].data[0].homeScore,30);
}));
test('invalid final score and unexpected empty responses preserve last good snapshot', async () => temp(async target => {
  await publishSnapshot(generate(),target);const before=await readFile(join(target,'metadata.json'),'utf8');
  const raw=clone();raw.games[0].homePoints=null;
  await assert.rejects(()=>publishSnapshot(generate(raw),target),/schema/);
  const empty=clone();empty.games=[];
  await assert.rejects(()=>publishSnapshot(generate(empty),target),/Unexpected empty/);
  assert.equal(await readFile(join(target,'metadata.json'),'utf8'),before);
}));
test('failed source fetch cannot alter prior saved data', async () => temp(async target => {
  await publishSnapshot(generate(),target);const before=await readFile(join(target,'metadata.json'),'utf8');
  let calls=0;const client=new CfbdClient('sentinel-private-token',mockFetch(async()=>{calls++;return calls===3?response({message:'sentinel-private-token'},401):response(calls===1?fixture.teams:fixture.conferences);}),async()=>{});
  await assert.rejects(()=>fetchSources(client,2026), /HTTP 401/);
  assert.equal(client.requestCount,3);
  assert.equal(await readFile(join(target,'metadata.json'),'utf8'),before);
}));
test('secret is in the authorization header only; redirects are disallowed', async () => {
  let observed: any;
  const client=new CfbdClient('sentinel-private-token',mockFetch(async(url,options)=>{observed={url:String(url),options};return response([]);}),async()=>{});
  await client.get('/games',{year:'2026'});
  assert.equal(observed.options.headers.Authorization,'Bearer sentinel-private-token');assert.equal(observed.options.redirect,'error');assert.ok(!observed.url.includes('sentinel'));assert.equal(client.requestCount,1);
});
test('auth errors do not retry or reflect response bodies', async () => {
  const client=new CfbdClient('secret',mockFetch(async()=>response({message:'secret'},403)),async()=>{});
  await assert.rejects(()=>client.get('/games',{}), e=>{assert.ok(e instanceof Error);assert.ok(!e.message.includes('secret'));return true;});assert.equal(client.requestCount,1);
});
test('transient errors retry once and report request count', async () => {
  let calls=0;const client=new CfbdClient('secret',mockFetch(async()=>response([],++calls===1?429:200)),async()=>{});
  await client.get('/games',{});assert.equal(client.requestCount,2);
  const failed=new CfbdClient('secret',mockFetch(async()=>response([],503)),async()=>{});
  await assert.rejects(()=>failed.get('/games',{}),/HTTP 503/);assert.equal(failed.requestCount,2);
});
test('request budget, endpoint allowlist, and no per-team requests', async () => {
  const plan=requestPlan(2026);assert.equal(plan.length,7);assert.ok(plan.every(p=>!('team' in p.params)));
  const client=new CfbdClient('secret',mockFetch(async()=>response([])),async()=>{});
  for(let i=0;i<14;i++)await client.get('/games',{});
  await assert.rejects(()=>client.get('/games',{}),/budget/);await assert.rejects(()=>client.get('https://example.com',{}),/not allowed/);
});
test('raw unknown fields are stripped and secret echo is rejected before writing', async () => temp(async target => {
  const raw:any=clone();raw.teams[0].authorization='sensitive-sentinel';
  assert.ok(!JSON.stringify(generate(raw)).includes('sensitive-sentinel'));
  raw.teams[0].school='sensitive-sentinel';
  await assert.rejects(()=>publishSnapshot(generate(raw),target,'sensitive-sentinel'),/Sensitive/);assert.equal(await readSnapshot(target),null);
}));
test('duplicate IDs, missing files, cross-document season, and record errors fail validation', () => {
  const duplicate=generate();duplicate['teams.json'].data.push(duplicate['teams.json'].data[0]);assert.throws(()=>validateFiles(duplicate),/Duplicate/);
  const missing=generate();delete missing['teams.json'];assert.throws(()=>validateFiles(missing));
  const year=generate();year['teams.json'].season=2025;assert.throws(()=>validateFiles(year),/metadata mismatch/);
  const raw=clone();raw.records[0].total.games=99;assert.throws(()=>validateFiles(generate(raw)),/schema/);
});
test('wrong source season and shape fail closed', () => {
  const raw=clone();raw.games[0].season=2025;assert.throws(()=>generate(raw),/season mismatch/);
  const malformed:any=clone();malformed.teams={message:'API error'};assert.throws(()=>generate(malformed),/Invalid teams/);
});
test('postseason sorts after regular week 15, regardless of week number', () => {
  const raw:any=clone();const post=structuredClone(raw.rankings[0]);post.seasonType='postseason';post.week=1;post.polls[0].ranks.reverse();raw.rankings.push(post);
  const files=generate(raw);assert.ok(files['seasons/2026/rankings.json'].data.every((p:any)=>p.seasonType==='postseason'));
});
test('unknown schedule opponents retain game and get neutral metadata', () => {
  const raw=clone();raw.games[0].awayId=99999;raw.games[0].awayTeam='Demo FCS';
  const files=generate(raw);validateFiles(files);assert.equal(files['teams.json'].data.find((t:any)=>t.id==='99999').classification,null);
});
test('null scores remain null, zero stays zero, unsafe colors and logos are neutralized', () => {
  const raw:any=clone();raw.teams[0].color='red;display:none';raw.teams[0].logos=['javascript:alert(1)'];raw.games[0].homePoints=0;
  const files=generate(raw);assert.equal(files['seasons/2026/games.json'].data[0].homeScore,0);assert.equal(files['seasons/2026/games.json'].data.at(-1).awayScore,null);
  assert.equal(files['teams.json'].data.find((t:any)=>t.id==='254').color,'#64748b');assert.equal(files['teams.json'].data.find((t:any)=>t.id==='254').logo,null);
});
test('first preseason snapshot accepts legitimately empty optional data', () => {
  const raw=clone();raw.games=[];raw.rankings=[];raw.stats=[];raw.players=[];raw.records=[];
  const files=generate(raw);validateFiles(files);assert.equal(files['seasons/2026/rankings.json'].status,'empty');
});
test('content fingerprint detects edits even when the JSON still matches its schema',()=>{
  const files=generate();files['teams.json'].data[0].mascot='Tampered';assert.throws(()=>validateFiles(files),/hash mismatch/);
});
