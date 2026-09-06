import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeHashToRows, encodeRowsToHash } from '../src/lib/url-state';
import type { ParseRowState } from '../src/lib/schema';
import { createSuite } from './_suite';

const here = path.dirname(fileURLToPath(import.meta.url));
const suite = createSuite('test-routing-build');

function sampleRows(): ParseRowState[] {
  return [
    { id: '1', name: 'Produksi Roti', assignee: 'Bu Siti', start: '2026-09-07', duration: '3 hari', end: '2026-09-09', dependsOn: '' },
    { id: '2', name: 'Packaging', assignee: 'Doni', start: '2026-09-10', duration: '2 hari', end: '2026-09-11', dependsOn: '' },
  ];
}

suite.section('/app route links back to landing');
const appPagePath = path.join(here, '../src/app/app/page.tsx');
suite.check('frontend/src/app/app/page.tsx exists', fs.existsSync(appPagePath));
if (fs.existsSync(appPagePath)) {
  const src = fs.readFileSync(appPagePath, 'utf8');
  suite.check('back-link href="/" present', src.includes('href="/"'));
  suite.check('back-link label present', src.includes('Kembali ke Beranda'));
}

suite.section('URL hash handoff');
const hash = encodeRowsToHash(sampleRows());
suite.check('hash uses #data= envelope', hash.startsWith('#data='), hash.slice(0, 32));

const decoded = decodeHashToRows(hash);
suite.check(
  'hash round-trips both rows',
  !!decoded && decoded.length === 2 && decoded[0]?.name === 'Produksi Roti',
  decoded,
);

// No window / no arg under Node must be safe: null, never a throw.
suite.check('decodeHashToRows() with no hash returns null', decodeHashToRows() === null);

suite.finish('routing handoff works.');
