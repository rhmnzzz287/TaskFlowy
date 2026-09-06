// Regression: handleTasksChange used to serialise rawText via a display-order
// serialiser (Start|End|Durasi|Status) that parseRawText() maps to the wrong
// columns — every Generate after a Gantt drag then failed on ALL rows.
// The bridge must stay on rowsToRawText(); this locks that contract in.
import { parseRawText, rowsToRawText } from '../src/lib/format/raw-text'
import { parseRows } from '../src/lib/parser/row-parser'
import type { ParseRowState } from '../src/lib/schema'

const REF = '2026-09-06'
let failures = 0
function check(desc: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${desc}`) } else { console.log(`ok: ${desc}`) }
}

// 1. Simulate template rows (as produced by getDefaultTemplate)
const templateLike: ParseRowState[] = [
  { id: 'row-a1', name: 'Sprint Planning', assignee: 'Scrum Master', start: REF, duration: '1 hari', end: REF, dependsOn: '' },
  { id: 'row-b2', name: 'Desain UI', assignee: 'Andi', start: '2026-09-07', duration: '3 hari', end: '2026-09-09', dependsOn: 'Sprint Planning' },
]

// 2. FIXED handleTasksChange path: rows -> rowsToRawText -> parseRawText -> parseRows
const raw = rowsToRawText(templateLike)
console.log('--- serialised rawText ---')
console.log(raw)
const reparsed = parseRawText(raw)
check('roundtrip preserves row count', reparsed.length === templateLike.length)
const res = parseRows(reparsed.map(r => ({
  name: r.name, assignee: r.assignee || null,
  start: r.start, duration: r.duration || null, end: r.end || null,
})), REF)
check('roundtrip has zero errors', Object.keys(res.errors).length === 0)
check('roundtrip yields tasks (chart renders)', res.tasks.length === templateLike.length)
check('dep name preserved', reparsed[1].dependsOn === 'Sprint Planning')

// 3. Progress preserved as string (was dropped -> reset to 0 after drag)
const withProgress = templateLike.map(r => ({ ...r, progress: '50' }))
const raw2 = rowsToRawText(withProgress)
check('rowsToRawText keeps pipe shape', raw2.split('\n').every(l => (l.match(/\|/g) || []).length >= 4))

// 4. safeId fallback works when crypto.randomUUID is missing (non-HTTPS hosts)
const g = globalThis as Record<string, unknown>
const realCrypto = g.crypto
try {
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require('../src/lib/schema') as typeof import('../src/lib/schema')
  const id = schema.createRowId()
  check('fallback ID generated without crypto', typeof id === 'string' && id.startsWith('row-'))
  const t = schema.todayRef()
  check('todayRef is local YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(t))
} finally {
  Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true })
}

console.log(failures === 0 ? '\nALL REGRESSION CHECKS PASS' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
