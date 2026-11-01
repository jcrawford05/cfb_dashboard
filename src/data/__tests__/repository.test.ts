import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDocument } from '../cfbdStaticRepository';
import { schemas } from '../schemas';
import { transform } from '../../../scripts/refresh-data/transforms';
import { parseSources } from '../../../scripts/refresh-data/sourceSchemas';
import fixture from '../../../scripts/refresh-data/fixtures/source.json';
const doc=transform(parseSources(fixture),2026,'fixture','2026-10-31T12:00:00.000Z',0)['teams.json'];
test('static repository consumes validated generated JSON using a relative Pages URL',async()=>{
  let path='';const mock=(async(url:any)=>{path=String(url);return new Response(JSON.stringify(doc));}) as typeof fetch;
  const result=await readDocument('teams.json',schemas.teams,undefined,mock);assert.equal(result.data.length,8);assert.equal(path,'./data/teams.json');
});
test('repository rejects network, HTTP, malformed JSON and schema failures with useful errors',async()=>{
  const cases=[async()=>{throw new Error('transport');},async()=>new Response('',{status:404}),async()=>new Response('<html>'),async()=>new Response('{}')];
  for(const mock of cases)await assert.rejects(()=>readDocument('teams.json',schemas.teams,undefined,mock as typeof fetch),/data/);
});
