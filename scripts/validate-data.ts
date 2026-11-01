import { resolve } from 'node:path';
import { readSnapshot } from './refresh-data/publish';
if (!await readSnapshot(resolve('public/data'))) throw new Error('Public snapshot missing.');
console.log('All public documents and cross-file references are valid.');
