// Self-check (no framework) — CSV escaping + shape contract
import { tasksToCSV } from '../src/lib/csv-export'
import type { TimelineTask } from '../src/lib/schema'

let failures = 0
function check(desc: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${desc}`) } else { console.log(`ok: ${desc}`) }
}

const task = (over: Partial<TimelineTask> = {}): TimelineTask => ({
  id: 't1',
  name: 'Desain UI',
  assignee: 'Andi',
  start: '2026-09-07',
  end: '2026-09-09',
  durationDays: 3,
  dependsOn: null,
  isMilestone: false,
  isCritical: false,
  progress: 50,
  ambiguities: [],
  ...over,
})

// Deterministic full-output equality: escaping + quoting + BOM in one shot
const csv = tasksToCSV([
  task({ name: 'Task, A' }),
  task({ name: 'Say "hi"' }),
  task({ name: 'Line\nbreak' }),
])
const expected =
`\uFEFFname,assignee,start,end,durationDays,progress,dependsOn,isMilestone,isCritical
"Task, A",Andi,2026-09-07,2026-09-09,3,50,,false,false
"Say ""hi""",Andi,2026-09-07,2026-09-09,3,50,,false,false
"Line
break",Andi,2026-09-07,2026-09-09,3,50,,false,false
`
check('full output exact (BOM, header, escaping, multiline)', csv === expected)

// Canonical-state roundtrip: milestone/critical/progress booleans
const single = tasksToCSV([task({ progress: 100, isMilestone: true, isCritical: true })])
check('flags roundtrip', single.trimEnd().split('\n')[1] === 'Desain UI,Andi,2026-09-07,2026-09-09,3,100,,true,true')

// Empty assignee/dependsOn stay empty (no 'null' leak)
check('empty fields empty', tasksToCSV([task({ assignee: null })]).split('\n')[1].startsWith('Desain UI,,'))

// Empty task list → header only (BOM included)
check('empty list header only', tasksToCSV([]) === '\uFEFFname,assignee,start,end,durationDays,progress,dependsOn,isMilestone,isCritical\n')

if (failures > 0) { console.error(`\n${failures} FAILED`); process.exit(1) }
console.log('\nAll CSV export checks passed.')