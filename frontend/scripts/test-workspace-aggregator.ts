import { aggregateUserTasks } from '../src/lib/workspace-aggregator';
import type { ParseRowState } from '../src/lib/schema';
import { createSuite } from './_suite';

const REF_DATE = '2026-09-06'; // Tasks ending 2026-09-09 land within 3 days -> urgent.
const TARGET_ASSIGNEE = 'Budi';

function makeRow(over: Partial<ParseRowState> & { id: string; name: string }): ParseRowState {
  return {
    assignee: '',
    start: '',
    duration: '',
    end: '',
    dependsOn: '',
    ...over,
  };
}

const PROJECT_META = [
  { id: 'proj-1', name: 'Mobile App Redesign' },
  { id: 'proj-2', name: 'Cloud Migration' },
];

const ALL_ROWS: Record<string, ParseRowState[]> = {
  'proj-1': [
    makeRow({ id: 'r1', name: 'UI Mockups', assignee: 'Budi', start: '2026-09-07', duration: '3 hari', end: '2026-09-09' }),
    makeRow({ id: 'r2', name: 'API Design', assignee: 'Siti', start: '2026-09-10', duration: '4 hari', end: '2026-09-13' }),
  ],
  'proj-2': [
    makeRow({ id: 'r3', name: 'Database Setup', assignee: 'Budi', start: '2026-09-08', duration: '2 hari', end: '2026-09-09' }),
  ],
};

const suite = createSuite('test-workspace-aggregator');
const result = aggregateUserTasks(ALL_ROWS, PROJECT_META, TARGET_ASSIGNEE, REF_DATE);

suite.check(`finds 2 tasks for ${TARGET_ASSIGNEE}`, result.myTasks.length === 2, {
  found: result.myTasks.length,
});
suite.checkEqual('counts 2 projects', result.metrics.totalProjects, 2);
suite.checkEqual('counts 2 urgent tasks', result.metrics.urgentTasksCount, 2);

suite.finish('workspace aggregation holds.');
