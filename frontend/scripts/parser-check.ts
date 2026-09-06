// Self-check (no framework) validating parser invariants.
import { parseDate } from '../src/lib/parser/date-grammar';
import { parseDuration } from '../src/lib/parser/duration-grammar';
import { parseRows } from '../src/lib/parser/row-parser';
import { createSuite } from './_suite';

const REF = '2026-09-05';
const suite = createSuite('parser-check');

suite.section('date-grammar');
suite.check('explicit date', parseDate('10 September 2026', REF).ok);

const explicit = parseDate('10 September 2026', REF);
suite.check(
  'explicit value',
  explicit.ok && explicit.value.getFullYear() === 2026 && explicit.value.getMonth() === 8 && explicit.value.getDate() === 10,
);

for (const input of ['2026-09-10', 'besok', 'Senin depan', 'minggu depan', '10 Sep']) {
  suite.check(`parses "${input}"`, parseDate(input, REF).ok);
}
suite.check('bad date rejected', !parseDate('not-a-date', REF).ok);

suite.section('duration-grammar');
const threeDays = parseDuration('3 hari');
suite.check('duration 3 hari', threeDays.ok && threeDays.days === 3);
suite.check('duration 1 minggu', parseDuration('1 minggu').ok);
suite.check('bare number', parseDuration('5').ok);
suite.check('empty rejected', !parseDuration('').ok);

// Plan-3 Task 3: 0-duration is a valid milestone checkpoint (days === 0),
// while a negative/absent count remains invalid.
const zero = parseDuration('0 hari');
suite.check('zero = milestone', zero.ok && zero.days === 0);
suite.check('milestone keyword', parseDuration('milestone').ok);
suite.check('negative rejected', !parseDuration('-1 hari').ok);

// Shorthand units used by table-mode typers.
const fourDays = parseDuration('4d');
const twoWeeks = parseDuration('2w');
suite.check('4d shorthand', fourDays.ok && fourDays.days === 4);
suite.check('2w shorthand', twoWeeks.ok && twoWeeks.days === 14);

suite.section('row-parser: FR-02 workflow');
const result = parseRows(
  [{ name: 'Desain', assignee: 'Andi', start: '10 September 2026', duration: '3 hari', end: null }],
  REF,
);
suite.check('FR-02 single task', result.tasks.length === 1);
const task = result.tasks[0];
suite.check('start normalized', task.start === '2026-09-10');
suite.check('duration 3', task.durationDays === 3);
suite.check('end computed', task.end === '2026-09-12');
suite.check('assignee parsed', task.assignee === 'Andi');

suite.section('validation');
const bad = parseRows([{ name: 'X', assignee: null, start: 'bad-date', duration: null, end: null }], REF);
suite.check('bad date flagged', Object.keys(bad.errors).length === 1);

// Blank start + duration must NOT error (was blocking the whole chart render).
const blank = parseRows(
  [
    { name: 'No Start', assignee: null, start: '', duration: '3 hari', end: null },
    { name: 'Nothing', assignee: null, start: '', duration: '', end: '' },
  ],
  REF,
);
suite.check('blank start + duration parses', Object.keys(blank.errors).length === 0);
suite.check('blank start falls back to reference day', blank.tasks[0].start === REF && blank.tasks[0].durationDays === 3);
suite.check('name-only = 1d task', blank.tasks[1].durationDays === 1 && blank.tasks[1].start === REF);

suite.finish('parser invariants hold.');
