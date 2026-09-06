import { aggregateUserTasks } from '../src/lib/workspace-aggregator'
import type { ParseRowState } from '../src/lib/schema'

console.log('--- TEST 1: Cross-Project Task Aggregation ---')

const projectMeta = [
  { id: 'proj-1', name: 'Mobile App Redesign' },
  { id: 'proj-2', name: 'Cloud Migration' },
]

const rowsProj1: ParseRowState[] = [
  { id: 'r1', name: 'UI Mockups', assignee: 'Budi', start: '2026-09-07', duration: '3 hari', end: '2026-09-09', dependsOn: '' },
  { id: 'r2', name: 'API Design', assignee: 'Siti', start: '2026-09-10', duration: '4 hari', end: '2026-09-13', dependsOn: '' },
]

const rowsProj2: ParseRowState[] = [
  { id: 'r3', name: 'Database Setup', assignee: 'Budi', start: '2026-09-08', duration: '2 hari', end: '2026-09-09', dependsOn: '' },
]

const allRows: Record<string, ParseRowState[]> = {
  'proj-1': rowsProj1,
  'proj-2': rowsProj2,
}

const targetAssignee = 'Budi'
const refDate = '2026-09-06' // tasks ending on 2026-09-09 are within 3 days -> urgent!

const result = aggregateUserTasks(allRows, projectMeta, targetAssignee, refDate)

if (result.myTasks.length !== 2) {
  console.error(`FAIL: Expected 2 tasks for ${targetAssignee}, found: ${result.myTasks.length}`)
  process.exit(1)
}

if (result.metrics.totalProjects !== 2) {
  console.error(`FAIL: Expected 2 projects, found: ${result.metrics.totalProjects}`)
  process.exit(1)
}

if (result.metrics.urgentTasksCount !== 2) {
  console.error(`FAIL: Expected 2 urgent tasks, found: ${result.metrics.urgentTasksCount}`)
  process.exit(1)
}

console.log('✓ Aggregation correctly identified user tasks and urgency metrics.')
console.log('All workspace aggregator tests passed!')