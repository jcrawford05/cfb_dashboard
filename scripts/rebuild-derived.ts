import { basename, dirname, join, resolve } from 'node:path';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { metadataSchema, schemas } from '../src/data/schemas';
import { calculateDerivedMetrics } from '../src/lib/derivedMetrics';
import { contentHash, type PublicFiles } from './refresh-data/transforms';
import { validateFiles } from './refresh-data/validators';
import { readSnapshot } from './refresh-data/publish';

const target = resolve('public/data');
const derivedNames = ['team-form','schedule-strength','upset-tracker','ranking-vs-results','weekly-recap','playoff-picture'] as const;

async function main() {
  const metadata = metadataSchema.parse(JSON.parse(await readFile(join(target,'metadata.json'),'utf8')));
  const prefix = `seasons/${metadata.season}/`;
  const baseDocuments = ['teams.json','conferences.json',...['games','records','team-stats','player-leaders','rankings','rankings-by-week'].map(name=>`${prefix}${name}.json`)];
  const files: PublicFiles = {};
  for (const relative of metadata.data.files) files[relative] = JSON.parse(await readFile(join(target,relative),'utf8'));
  const parsed: Record<string, any> = {};
  for (const relative of baseDocuments) {
    const raw = files[relative] ?? JSON.parse(await readFile(join(target,relative),'utf8'));
    const schemaName = basename(relative,'.json') as keyof typeof schemas;
    const doc = schemas[schemaName].parse(raw);
    if (doc.season !== metadata.season || doc.generatedAt !== metadata.generatedAt || doc.mode !== metadata.mode) throw new Error(`Snapshot metadata mismatch in ${relative}`);
    parsed[relative] = doc;
    files[relative] = doc;
  }
  const teamsDoc = files['teams.json'];
  const finalMetrics = calculateDerivedMetrics(teamsDoc.data,parsed[prefix+'games.json'].data,parsed[prefix+'records.json'].data,parsed[prefix+'rankings-by-week.json'].data);
  const inheritedNotes = [...new Set((teamsDoc.notes ?? []).filter((note:string)=>note.includes('Synthetic demonstration data')))] as string[];
  const envelope = (data: unknown[], notes: string[]) => ({schemaVersion:1,generatedAt:metadata.generatedAt,season:metadata.season,sources:metadata.sources,mode:metadata.mode,status:data.length?'available':'empty',notes:[...inheritedNotes,...notes],data});
  const metricNotes: Record<(typeof derivedNames)[number],string[]> = {
    'team-form':['Last five completed games, newest first; averages use only available results.'],
    'schedule-strength':['Opponent current win percentage after removing its result against this team where available. Completed and remaining schedules are averaged separately. Formula: opponent-win-pct-v1.'],
    'upset-tracker':['Completed upsets use the latest available AP poll published before the game week; missing prior ranks stay missing. Watch entries are scheduled rank mismatches, not live alerts or odds.'],
    'ranking-vs-results':['AP Top 25 only. Performance score = 40% win percentage + 30% completed schedule opponent win percentage + 30% point-differential percentile. Gap = performance score minus rank percentile. Exploratory context, not a claim of deserving rank.'],
    'weekly-recap':['Cards summarize saved completed results; ranking movement appears when a later poll snapshot is available.'],
    'playoff-picture':finalMetrics.playoffNotes,
  };
  const values = {'team-form':finalMetrics.forms,'schedule-strength':finalMetrics.strength,'upset-tracker':finalMetrics.upsets,'ranking-vs-results':finalMetrics.rankingResults,'weekly-recap':finalMetrics.weekly,'playoff-picture':finalMetrics.playoff};
  for (const name of derivedNames) files[`${prefix}derived/${name}.json`] = envelope(values[name],metricNotes[name]);
  metadata.data.files = [...new Set([...Object.keys(files),...derivedNames.map(name=>`${prefix}derived/${name}.json`)])].filter(path=>path!=='metadata.json').sort();
  files['metadata.json'] = metadata;
  metadata.data.contentHash = contentHash(files);
  validateFiles(files);

  const parent = dirname(target);
  const stage = await mkdtemp(join(parent,'.derived-stage-'));
  const backup = join(parent,`.data-before-derived-${process.pid}-${Date.now()}`);
  let moved = false;
  try {
    for (const [path,doc] of Object.entries(files)) { const destination=join(stage,path);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,JSON.stringify(doc,null,2)+'\n'); }
    if (!await readSnapshot(stage)) throw new Error('Migrated snapshot could not be read.');
    await rename(target,backup);moved=true;
    try { await rename(stage,target); } catch (error) { if(moved)await rename(backup,target);throw error; }
    await rm(backup,{recursive:true,force:true});
    console.log('Rebuilt Phase 3 analytics from the saved snapshot. No API requests were made.');
  } finally { await rm(stage,{recursive:true,force:true}); }
}

try {
  await main();
} catch (error) {
  console.error('Derived-data migration failed. The original public snapshot was preserved.');
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
}