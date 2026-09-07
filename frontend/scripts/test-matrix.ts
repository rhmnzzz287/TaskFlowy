import { createSuite } from './_suite'
import { TimelineTask, TimelineDependency, findCyclicEdgeIds, detectCycles } from '../src/lib/schema'

const suite = createSuite('test-matrix')

const tasks: TimelineTask[] = [
  { id: 't1', name: 'Planning', assignee: 'Maya', start: '2026-10-01', end: '2026-10-05', durationDays: 5, ambiguities: [] },
  { id: 't2', name: 'Design', assignee: 'Alex', start: '2026-10-06', end: '2026-10-10', durationDays: 5, ambiguities: [] },
  { id: 't3', name: 'Develop', assignee: 'Sarah', start: '2026-10-11', end: '2026-10-15', durationDays: 5, ambiguities: [] },
]

// 1. Acyclic graph: t1 -> t2 -> t3
const depsAcyclic: TimelineDependency[] = [
  { id: 'd1', sourceId: 't1', targetId: 't2', type: 'FS' },
  { id: 'd2', sourceId: 't2', targetId: 't3', type: 'FS' },
]

suite.section('Acyclic Graph Verification')
suite.checkEqual('no cycles detected in acyclic graph', detectCycles(tasks, depsAcyclic).length, 0)
suite.checkEqual('cyclicEdgeIds is empty', findCyclicEdgeIds(tasks, depsAcyclic).size, 0)

// 2. Introduce a cycle: t3 -> t1 (so t1 -> t2 -> t3 -> t1)
const depsCyclic: TimelineDependency[] = [
  ...depsAcyclic,
  { id: 'd3', sourceId: 't3', targetId: 't1', type: 'FS' },
]

suite.section('Cycle Detection in Matrix')
const cycles = detectCycles(tasks, depsCyclic)
suite.check('cycle detected', cycles.length > 0)

const cyclicEdges = findCyclicEdgeIds(tasks, depsCyclic)
suite.check('cyclic edges identified', cyclicEdges.size > 0)
suite.check('d3 is identified as cyclic', cyclicEdges.has('d3'))
suite.check('d1 is on the cycle loop', cyclicEdges.has('d1'))
suite.check('d2 is on the cycle loop', cyclicEdges.has('d2'))

// 3. Sever d3 (break cycle)
const depsSevered = depsCyclic.filter(d => d.id !== 'd3')
suite.section('Sever Loop / Break Cycle')
suite.checkEqual('graph is acyclic after severance', findCyclicEdgeIds(tasks, depsSevered).size, 0)

suite.finish('Matrix & cycle breaker invariants hold.')
