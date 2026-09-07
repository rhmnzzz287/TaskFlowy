import { createSuite } from './_suite'
import { TimelineTask, TimelineDependency } from '../src/lib/schema'
import { computeDownstreamSlippage, addDaysISO } from '../src/lib/simulation/slippage-engine'
import { calculateScheduleRisk } from '../src/lib/simulation/monte-carlo'

const suite = createSuite('test-simulation')

suite.section('addDaysISO calculations')
suite.checkEqual('adds 1 day', addDaysISO('2026-10-01', 1), '2026-10-02')
suite.checkEqual('crosses month boundary', addDaysISO('2026-10-31', 1), '2026-11-01')
suite.checkEqual('crosses year boundary', addDaysISO('2026-12-31', 2), '2027-01-02')
suite.checkEqual('handles negative offset', addDaysISO('2026-10-05', -3), '2026-10-02')

suite.section('Downstream Slippage Cascade')
const tasks: TimelineTask[] = [
  { id: 't1', name: 'Design', assignee: 'Maya', start: '2026-10-01', end: '2026-10-05', durationDays: 5, ambiguities: [] },
  { id: 't2', name: 'Backend API', assignee: 'Alex', start: '2026-10-06', end: '2026-10-15', durationDays: 10, ambiguities: [] },
  { id: 't3', name: 'Frontend UI', assignee: 'Sarah', start: '2026-10-06', end: '2026-10-12', durationDays: 7, ambiguities: [] },
  { id: 't4', name: 'QA Testing', assignee: 'David', start: '2026-10-16', end: '2026-10-20', durationDays: 5, ambiguities: [] },
  { id: 'm1', name: 'Release', assignee: null, start: '2026-10-21', end: '2026-10-21', durationDays: 0, isMilestone: true, ambiguities: [] },
]

const deps: TimelineDependency[] = [
  { id: 'd1', sourceId: 't1', targetId: 't2', type: 'FS' },
  { id: 'd2', sourceId: 't1', targetId: 't3', type: 'FS' },
  { id: 'd3', sourceId: 't2', targetId: 't4', type: 'FS' },
  { id: 'd4', sourceId: 't4', targetId: 'm1', type: 'FS' },
]

// Simulate shifting Backend API (t2) by +3 days
const res = computeDownstreamSlippage(tasks, deps, 't2', 3)

suite.check('t2 is directly shifted', res.diffs.get('t2')?.isDirectlyShifted === true)
suite.checkEqual('t2 start shifts +3d', res.diffs.get('t2')?.simulatedStart, '2026-10-09')
suite.checkEqual('t2 end shifts +3d', res.diffs.get('t2')?.simulatedEnd, '2026-10-18')

// t3 (Frontend UI) depends on t1, NOT t2. It should NOT be shifted!
suite.check('t3 is NOT shifted', !res.diffs.has('t3'))

// t4 (QA Testing) depends on t2. It MUST be shifted downstream by +3 days!
suite.check('t4 is cascade shifted', res.diffs.has('t4') && !res.diffs.get('t4')?.isDirectlyShifted)
suite.checkEqual('t4 start shifts +3d', res.diffs.get('t4')?.simulatedStart, '2026-10-19')
suite.checkEqual('t4 end shifts +3d', res.diffs.get('t4')?.simulatedEnd, '2026-10-23')

// m1 (Release milestone) depends on t4. It MUST be shifted downstream!
suite.check('m1 milestone is shifted', res.diffs.has('m1'))
suite.checkEqual('m1 date shifts +3d', res.diffs.get('m1')?.simulatedStart, '2026-10-24')
suite.checkEqual('overall project delay is 3 days', res.projectDelayDays, 3)

suite.section('Monte Carlo & Schedule Risk')
const risk = calculateScheduleRisk(tasks, deps)
suite.check('baseline end calculated', risk.baselineEndDate === '2026-10-21')
suite.check('P80 buffer >= 1 day', risk.recommendedBufferDays >= 1)
suite.check('P80 end date extends past baseline', risk.p80EndDate > risk.baselineEndDate)
suite.check('critical path tasks identified', risk.criticalPathTaskCount > 0)

suite.finish('Simulation engine invariants hold.')
