// Regression: handleTasksChange used to serialise rawText via a display-order
// serialiser (Start|End|Durasi|Status) that parseRawText() maps to the wrong
// columns — every Generate after a Gantt drag then failed on ALL rows.
// The bridge must stay on rowsToRawText(); this locks that contract in.
import { parseRawText, rowsToRawText } from '../src/lib/format/raw-text';
import { parseRows } from '../src/lib/parser/row-parser';
import { createRowId, todayRef, type ParseRowState } from '../src/lib/schema';
import { createSuite } from './_suite';

const REF = '2026-09-06';
const suite = createSuite('test-generate-regression');

function templateRows(): ParseRowState[] {
  return [
    { id: 'row-a1', name: 'Sprint Planning', assignee: 'Scrum Master', start: REF, duration: '1 hari', end: REF, dependsOn: '' },
    { id: 'row-b2', name: 'Desain UI', assignee: 'Andi', start: '2026-09-07', duration: '3 hari', end: '2026-09-09', dependsOn: 'Sprint Planning' },
  ];
}

function toRowInputs(rows: ReturnType<typeof parseRawText>) {
  return rows.map((r) => ({
    name: r.name,
    assignee: r.assignee || null,
    start: r.start,
    duration: r.duration || null,
    end: r.end || null,
  }));
}

suite.section('drag roundtrip rows -> rawText -> rows');
const raw = rowsToRawText(templateRows());
console.log('--- serialised rawText ---');
console.log(raw);

const reparsed = parseRawText(raw);
suite.check('roundtrip preserves row count', reparsed.length === templateRows().length);
const reparsedResult = parseRows(toRowInputs(reparsed), REF);
suite.check('roundtrip has zero errors', Object.keys(reparsedResult.errors).length === 0, reparsedResult.errors);
suite.check('roundtrip yields tasks (chart renders)', reparsedResult.tasks.length === templateRows().length);
suite.check('dep name preserved', reparsed[1]?.dependsOn === 'Sprint Planning');

suite.section('progress survives serialisation');
const withProgress = templateRows().map((r) => ({ ...r, progress: '50' }));
const rawWithProgress = rowsToRawText(withProgress);
suite.check(
  'rowsToRawText keeps pipe shape',
  rawWithProgress.split('\n').every((line) => (line.match(/\|/g) || []).length >= 4),
);

suite.section('non-HTTPS fallback (no crypto.randomUUID)');
const g = globalThis as unknown as Record<string, unknown>;
const realCrypto = g['crypto'];
try {
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  const id = createRowId();
  suite.check('fallback ID generated without crypto', typeof id === 'string' && id.startsWith('row-'));
  suite.check('todayRef is local YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(todayRef()));
} finally {
  Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
}

suite.finish('generate regression contract holds.');
