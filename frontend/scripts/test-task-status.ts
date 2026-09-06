// Self-check (no framework) — canonical task-status priority:
// Done (100%) beats Critical/Milestone; nil progress → Planned.
import { taskStatus, TaskStatus } from '../src/lib/task-status'
import type { TimelineTask } from '../src/lib/schema'

let failures = 0
function check(desc: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${desc}`) } else { console.log(`ok: ${desc}`) }
}

const t = (over: Partial<TimelineTask> = {}): TimelineTask => ({
  id: 't1', name: 'T', assignee: null, start: '2026-09-01', end: '2026-09-01',
  durationDays: 1, dependsOn: null, isMilestone: false, isCritical: false,
  progress: 0, ambiguities: [], ...over,
})

// Done wins over every other flag
check('100% beats critical', taskStatus(t({ progress: 100, isCritical: true })).status === 'done')
check('100% beats milestone', taskStatus(t({ progress: 100, isMilestone: true })).status === 'done')
check('100% beats both', taskStatus(t({ progress: 100, isCritical: true, isMilestone: true })).status === 'done')

// Precedence among incomplete
check('milestone beats critical', taskStatus(t({ isMilestone: true, isCritical: true })).status === 'milestone')
check('partial is in-progress', taskStatus(t({ progress: 40 })).status === 'in-progress')
check('critical partial is critical', taskStatus(t({ progress: 40, isCritical: true })).status === 'critical')
check('zero progress is planned', taskStatus(t({})).status === 'planned')

// Label + cls coherence
check('done label', taskStatus(t({ progress: 100 })).label === 'Done')
check('done cls has completed', taskStatus(t({ progress: 100 })).cls.includes('text-completed'))
check('rank done > all', taskStatus(t({ progress: 100 })).rank === 5)

// Sort ranks strictly ordered
const rankFor = (s: TaskStatus): number =>
  taskStatus(t(s === 'done' ? { progress: 100 } : s === 'in-progress' ? { progress: 50 } : s === 'critical' ? { isCritical: true } : s === 'milestone' ? { isMilestone: true } : {})).rank
const order: TaskStatus[] = ['planned', 'critical', 'in-progress', 'milestone', 'done']
const ranks = order.map(rankFor)
check('ranks strictly increasing', ranks.every((r, i) => i === 0 || r > ranks[i - 1]))

if (failures > 0) { console.error(`\n${failures} FAILED`); process.exit(1) }
console.log('\nAll task-status checks passed.')