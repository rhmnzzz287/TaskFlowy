import { enDict } from '../src/lib/i18n/en';
import { idDict } from '../src/lib/i18n/id';
import { createSuite } from './_suite';

type Dict = Record<string, unknown>;

const EM_DASH = '—';
const suite = createSuite('test-i18n-dictionaries');

function isPlainObject(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Collect every dotted path present on one side but missing on the other. */
function collectKeyDiffs(a: Dict, b: Dict, path = '', side: 'id' | 'en' = 'id'): string[] {
  const diffs: string[] = [];
  for (const key of Object.keys(a)) {
    const current = path ? `${path}.${key}` : key;
    if (!(key in b)) {
      diffs.push(`${current} (missing in ${side === 'id' ? 'EN' : 'ID'})`);
      continue;
    }
    if (isPlainObject(a[key]) && isPlainObject(b[key])) {
      diffs.push(...collectKeyDiffs(a[key] as Dict, b[key] as Dict, current, side));
    }
  }
  return diffs;
}

suite.section('key parity (idDict vs enDict)');
const missing = [
  ...collectKeyDiffs(idDict as unknown as Dict, enDict as unknown as Dict, '', 'id'),
  ...collectKeyDiffs(enDict as unknown as Dict, idDict as unknown as Dict, '', 'en'),
];
suite.check('100% key parity between id.ts and en.ts', missing.length === 0, missing.slice(0, 20));

suite.section('anti-slop: no em dashes');
suite.check('idDict has zero em dashes', !JSON.stringify(idDict).includes(EM_DASH));
suite.check('enDict has zero em dashes', !JSON.stringify(enDict).includes(EM_DASH));

suite.finish('i18n dictionaries are in sync.');
