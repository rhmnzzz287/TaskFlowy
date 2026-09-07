import { createSuite } from './_suite'
import { TimelineTask } from '../src/lib/schema'
import { computeProjectWorkload } from '../src/lib/resource/workload-engine'

const suite = createSuite('test-workload')

const sampleTasks: TimelineTask[] = [
  { id: 't1', name: 'DB Setup', assignee: 'Alex', start: '2026-10-01', end: '2026-10-08', durationDays: 8, ambiguities: [] },
  { id: 't2', name: 'API Endpoints', assignee: 'Alex', start: '2026-10-06', end: '2026-10-15', durationDays: 10, ambiguities: [] },
  { id: 't3', name: 'UI Components', assignee: 'Maya', start: '2026-10-05', end: '2026-10-12', durationDays: 8, ambiguities: [] },
  { id: 't4', name: 'Docs Review', assignee: null, start: '2026-10-10', end: '2026-10-12', durationDays: 3, ambiguities: [] },
]

const summary = computeProjectWorkload(sampleTasks, 1)

suite.section('Workload Range and Assignee Buckets')
suite.check('dateRange starts at 2026-10-01', summary.dateRange[0] === '2026-10-01')
suite.check('dateRange ends at 2026-10-15', summary.dateRange[summary.dateRange.length - 1] === '2026-10-15')
suite.checkEqual('total distinct assignees', summary.totalAssignees, 2)
suite.checkEqual('unassigned tasks detected', summary.unassignedTasksCount, 1)

suite.section('Over-Allocation Detection')
const alex = summary.assignees.find(a => a.assigneeName === 'Alex')
suite.check('Alex is found in assignees', !!alex)
suite.check('Alex has overallocated days', (alex?.overallocatedDaysCount || 0) > 0)

// On 2026-10-02, Alex has 1 task (t1)
const alexDay2 = alex?.allocations.find(d => d.date === '2026-10-02')
suite.checkEqual('Alex day 2 load factor', alexDay2?.loadFactor, 1)
suite.check('Alex day 2 not overallocated', alexDay2?.isOverallocated === false)

// On 2026-10-07, Alex has 2 overlapping tasks (t1 and t2)
const alexDay7 = alex?.allocations.find(d => d.date === '2026-10-07')
suite.checkEqual('Alex day 7 load factor', alexDay7?.loadFactor, 2)
suite.check('Alex day 7 overallocated', alexDay7?.isOverallocated === true)

suite.section('Unassigned Group')
const unassigned = summary.assignees.find(a => a.isUnassigned)
suite.check('Unassigned bucket exists', !!unassigned)
suite.checkEqual('Unassigned total tasks', unassigned?.totalTasks, 1)

suite.finish('Workload engine invariants hold.')
