import { mkdtemp, mkdir, writeFile, rename, rm, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PublicFiles } from './transforms';
import { validateFiles } from './validators';
export async function readSnapshot(directory: string): Promise<PublicFiles | null> {
  try {
    const meta = JSON.parse(await readFile(join(directory, 'metadata.json'), 'utf8'));
    if (!Array.isArray(meta.data?.files)) throw new Error('Invalid manifest');
    const files: PublicFiles = { 'metadata.json': meta };
    for (const path of meta.data.files) {
      if (typeof path !== 'string' || path.includes('..') || !/^[a-z0-9/.-]+\.json$/.test(path) || path.startsWith('/')) throw new Error('Invalid path');
      files[path] = JSON.parse(await readFile(join(directory, path), 'utf8'));
    }
    validateFiles(files);
    return files;
  } catch (error: any) {
    if (error.code === 'ENOENT') return null;
    console.error('Snapshot validation detail:', error);
    throw new Error('Saved snapshot is invalid.');
  }
}
export async function publishSnapshot(files: PublicFiles, target: string, secret?: string) {
  validateFiles(files);
  // Defense in depth: even a provider echo of the key cannot enter public output.
  if (secret && (JSON.stringify(files).includes(secret) || JSON.stringify(files).includes(JSON.stringify(secret).slice(1,-1)))) throw new Error('Sensitive value detected; snapshot preserved.');
  const previous = await readSnapshot(target);
  // Protect against syntactically valid but unexpectedly empty source responses.
  if (previous && previous['metadata.json'].season === files['metadata.json'].season && previous['metadata.json'].mode === files['metadata.json'].mode) {
    for (const [path, doc] of Object.entries(previous)) if (Array.isArray(doc.data) && doc.data.length && Array.isArray(files[path]?.data) && files[path].data.length === 0) throw new Error('Unexpected empty dataset; snapshot preserved.');
  }
  if (previous && previous['metadata.json'].data.contentHash === files['metadata.json'].data.contentHash) return false;
  const parent = dirname(target);
  await mkdir(parent, { recursive: true });
  const stage = await mkdtemp(join(parent, '.data-stage-'));
  const backup = `${stage}-backup`;
  let moved = false;
  try {
    for (const [path, doc] of Object.entries(files)) { await mkdir(dirname(join(stage, path)), { recursive: true }); await writeFile(join(stage, path), JSON.stringify(doc, null, 2) + '\n'); }
    await readSnapshot(stage);
    try { await rename(target, backup); moved = true; } catch (e: any) { if (e.code !== 'ENOENT') throw e; }
    try { await rename(stage, target); } catch (e) { if (moved) await rename(backup, target); throw e; }
    if (moved) await rm(backup, { recursive: true, force: true });
    return true;
  } finally { await rm(stage, { recursive: true, force: true }); }
}
