// File-only self-check (no framework) validating parser invariants
import { parseDate } from '../src/lib/parser/date-grammar'
import { parseDuration } from '../src/lib/parser/duration-grammar'
import { parseRows } from '../src/lib/parser/row-parser'

const REF = '2026-09-05'
let failures = 0
function check(desc: string, cond: boolean) {
  if (!cond) {
    failures++
    console.error(`FAIL: ${desc}`)
  } else {
    console.log(`ok: ${desc}`)
  }
}

// date-grammar
check('explicit date', parseDate('10 September 2026', REF).ok)
const d1 = parseDate('10 September 2026', REF)
if (d1.ok) check('explicit value', d1.value.getFullYear() === 2026 && d1.value.getMonth() === 8 && d1.value.getDate() === 10)
check('ISO date', parseDate('2026-09-10', REF).ok)
check('relative besok', parseDate('besok', REF).ok)
check('relative Senin depan', parseDate('Senin depan', REF).ok)
check('relative minggu depan', parseDate('minggu depan', REF).ok)
check('dd no year', parseDate('10 Sep', REF).ok)
check('bad date rejected', !parseDate('not-a-date', REF).ok)

// duration-grammar
const dur = parseDuration('3 hari')
check('duration 3 hari', dur.ok && dur.days === 3)
check('duration 1 minggu', parseDuration('1 minggu').ok)
check('bare number', parseDuration('5').ok)
check('empty rejected', !parseDuration('').ok)
// Plan-3 Task 3: 0-duration is now a valid milestone checkpoint (days === 0),
// while a negative/absent count remains invalid.
const zeroRes = parseDuration('0 hari')
check('zero = milestone', zeroRes.ok && zeroRes.days === 0)
check('milestone keyword', parseDuration('milestone').ok)
check('negative rejected', !parseDuration('-1 hari').ok)
// shorthand units used by table-mode typers
const d4 = parseDuration('4d')
const w2 = parseDuration('2w')
check('4d shorthand', d4.ok && d4.days === 4)
check('2w shorthand', w2.ok && w2.days === 14)

// row-parser: FR-02 workflow example
const rows = [
  { name: 'Desain', assignee: 'Andi', start: '10 September 2026', duration: '3 hari', end: null },
]
const result = parseRows(rows, REF)
check('FR-02 single task', result.tasks.length === 1)
const t = result.tasks[0]
check('start normalized', t.start === '2026-09-10')
check('duration 3', t.durationDays === 3)
check('end computed', t.end === '2026-09-12')
check('assignee parsed', t.assignee === 'Andi')

// validation
const bad = parseRows([
  { name: 'X', assignee: null, start: 'bad-date', duration: null, end: null },
], REF)
check('bad date flagged', Object.keys(bad.errors).length === 1)

// blank start + duration must NOT error (was blocking the whole chart render)
const blank = parseRows([
  { name: 'No Start', assignee: null, start: '', duration: '3 hari', end: null },
  { name: 'Nothing', assignee: null, start: '', duration: '', end: '' },
], REF)
check('blank start + duration parses', Object.keys(blank.errors).length === 0)
const bt = blank.tasks[0]
check('blank start falls back to reference day', bt.start === REF && bt.durationDays === 3)
check('name-only = 1d task', blank.tasks[1].durationDays === 1 && blank.tasks[1].start === REF)

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)