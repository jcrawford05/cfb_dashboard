import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CfbdClient } from './cfbdClient';
import { fetchSources } from './fetchers';
import { parseSources } from './sourceSchemas';
import { transform } from './transforms';
import { publishSnapshot } from './publish';
let client: CfbdClient | undefined;
try {
  const fixtures = process.argv.includes('--fixtures');
  const now = new Date();
  const fallbackYear = now.getUTCFullYear() - (now.getUTCMonth() < 2 ? 1 : 0);
  const year = fixtures ? 2026 : Number(process.env.DATA_SEASON || fallbackYear);
  if (!Number.isInteger(year) || year < 1869 || year > 2200) throw new Error('Invalid season.');
  if (!fixtures && (process.env.GITHUB_ACTIONS !== 'true' || !process.env.GITHUB_DEFAULT_BRANCH || process.env.GITHUB_REF !== `refs/heads/${process.env.GITHUB_DEFAULT_BRANCH}`)) throw new Error('Production refresh is restricted to trusted default-branch GitHub Actions.');
  const raw = fixtures ? JSON.parse(await readFile(new URL('./fixtures/source.json', import.meta.url), 'utf8')) : await fetchSources(client = new CfbdClient(process.env.CFBD_API_KEY ?? ''), year);
  const files = transform(parseSources(raw), year, fixtures ? 'fixture' : 'production', fixtures ? '2026-10-31T12:00:00.000Z' : now.toISOString(), client?.requestCount ?? 0);
  const changed = await publishSnapshot(files, resolve('public/data'), fixtures ? undefined : process.env.CFBD_API_KEY);
  console.log(changed ? 'Validated snapshot published.' : 'No content changes; saved timestamps preserved.');
} catch {
  // Do not serialize arbitrary exceptions, response bodies, headers, or environment values.
  console.error('Refresh failed. Last good snapshot preserved. Check configuration, source availability, and schema compatibility.');
  process.exitCode = 1;
} finally { console.log(`CFBD requests this run: ${client?.requestCount ?? 0}`); }
