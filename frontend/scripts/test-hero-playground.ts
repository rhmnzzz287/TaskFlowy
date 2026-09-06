import { parseRawText } from '../src/lib/format/raw-text';
import { parseRows } from '../src/lib/parser/row-parser';
import { buildPmPreset, buildUmkmPreset } from '../src/lib/landing-presets';
import { createSuite } from './_suite';

const REF = '2026-09-07';
const EXPECTED_TASKS = 4;
const EXPECTED_DEPS = 3;

const suite = createSuite('test-hero-playground');

function toRowInputs(rows: ReturnType<typeof parseRawText>) {
  return rows.map((r) => ({
    name: r.name,
    assignee: r.assignee || null,
    start: r.start,
    duration: r.duration || null,
    end: r.end || null,
    dependsOn: r.dependsOn || null,
  }));
}

function checkPreset(label: string, build: (ref: string) => string) {
  suite.section(`${label} preset parses cleanly`);
  const result = parseRows(toRowInputs(parseRawText(build(REF))), REF);
  suite.check(`${label}: ${EXPECTED_TASKS} tasks`, result.tasks.length === EXPECTED_TASKS, {
    tasks: result.tasks.length,
    errors: result.errors,
  });
  // Error rows are dropped in /app, so fixtures must be error-free.
  suite.check(`${label}: zero errors`, Object.keys(result.errors).length === 0, result.errors);
  return result;
}

const umkm = checkPreset('UMKM', buildUmkmPreset);
checkPreset('PM', buildPmPreset);

suite.section('chronological chain');
const starts = umkm.tasks.map((t) => t.start);
suite.check('UMKM tasks in chronological order', JSON.stringify(starts) === JSON.stringify([...starts].sort()), { starts });

suite.section('dependsOn round-trip (dependency arrows in /app)');
const umkmRows = parseRawText(buildUmkmPreset(REF));
const rowDepCount = umkmRows.filter((r) => r.dependsOn.trim().length > 0).length;
suite.check(`${EXPECTED_DEPS} dependsOn relations survive raw-text`, rowDepCount === EXPECTED_DEPS, { rowDepCount });

const parsedDeps = parseRows(umkmRows, REF).tasks.filter((t) => (t.dependsOn ?? '').trim().length > 0);
suite.check('TimelineTask[] keeps dependsOn for Gantt arrows', parsedDeps.length === EXPECTED_DEPS, {
  found: parsedDeps.length,
});

suite.finish('hero playground presets render.');
