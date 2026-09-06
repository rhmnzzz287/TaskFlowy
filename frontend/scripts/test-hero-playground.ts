import { parseRawText } from '../src/lib/format/raw-text'
import { parseRows } from '../src/lib/parser/row-parser'
import { buildUmkmPreset, buildPmPreset } from '../src/lib/landing-presets'

const REF = '2026-09-07'

function toInput(rows: ReturnType<typeof parseRawText>) {
  return rows.map(r => ({
    name: r.name,
    assignee: r.assignee,
    start: r.start,
    duration: r.duration,
    end: r.end,
  }))
}

console.log('--- TEST 1: Playground UMKM Preset Parsing ---')
const umkmResult = parseRows(toInput(parseRawText(buildUmkmPreset(REF))), REF)

if (umkmResult.tasks.length !== 4) {
  console.error('FAIL: Expected 4 parsed tasks for UMKM, got:', umkmResult.tasks.length, umkmResult.errors)
  process.exit(1)
}
if (Object.keys(umkmResult.errors).length !== 0) {
  console.error('FAIL: UMKM preset must parse with ZERO errors (error rows are dropped in /app):', umkmResult.errors)
  process.exit(1)
}
// Chained schedule: each task starts after (or when) its predecessor starts.
const umkmStarts = umkmResult.tasks.map(t => t.start)
const umkmSorted = [...umkmStarts].sort()
if (JSON.stringify(umkmStarts) !== JSON.stringify(umkmSorted)) {
  console.error('FAIL: UMKM tasks not in chronological chain:', umkmStarts)
  process.exit(1)
}
console.log('✓ UMKM preset: 4 task valid, tanpa error, berurutan kronologis.')

console.log('--- TEST 2: Playground PM Preset Parsing ---')
const pmResult = parseRows(toInput(parseRawText(buildPmPreset(REF))), REF)

if (pmResult.tasks.length !== 4) {
  console.error('FAIL: Expected 4 parsed tasks for PM, got:', pmResult.tasks.length, pmResult.errors)
  process.exit(1)
}
if (Object.keys(pmResult.errors).length !== 0) {
  console.error('FAIL: PM preset must parse with ZERO errors (error rows are dropped in /app):', pmResult.errors)
  process.exit(1)
}
console.log('✓ PM preset: 4 task valid, tanpa error.')

console.log('--- TEST 3: dependsOn Round-Trip (panah dependensi di /app) ---')
const umkmRows = parseRawText(buildUmkmPreset(REF))
const depCount = umkmRows.filter(r => r.dependsOn && r.dependsOn.trim().length > 0).length
if (depCount !== 3) {
  console.error('FAIL: Expected 3 dependsOn relations in UMKM preset, got:', depCount)
  process.exit(1)
}
console.log('✓ 3 relasi dependsOn terbawa untuk panah dependensi & critical path.')

console.log('--- TEST 4: Verifikasi dependsOn pada TimelineTask[] ---')
const parsedWithDeps = parseRows(umkmRows, REF)
const taskDeps = parsedWithDeps.tasks.filter(t => t.dependsOn && t.dependsOn.trim().length > 0)
if (taskDeps.length !== 3) {
  console.error('FAIL: Expected 3 tasks with dependsOn in parsed tasks, got:', taskDeps.length)
  process.exit(1)
}
console.log('✓ TimelineTask[] mempertahankan data dependsOn untuk rendering panah Gantt.')
console.log('All hero playground tests passed!')
