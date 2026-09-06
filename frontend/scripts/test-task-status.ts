// Self-check (no framework): canonical task-status priority.
// Done (100%) beats Critical/Milestone; nil progress renders Planned.
import { taskStatus, type TaskStatus } from '../src/lib/task-status';
import type { TimelineTask } from '../src/lib/schema';
import { createSuite } from './_suite';

function makeTask(over: Partial<TimelineTask> = {}): TimelineTask {
  return {
    id: 't1',
    name: 'T',
    assignee: null,
    start: '2026-09-01',
    end: '2026-09-01',
    durationDays: 1,
    dependsOn: null,
    isMilestone: false,
    isCritical: false,
    progress: 0,
    ambiguities: [],
    ...over,
  };
}

function statusOf(over: Partial<TimelineTask>): TaskStatus {
  return taskStatus(makeTask(over)).status;
}

const suite = createSuite('test-task-status');

suite.section('precedence');
suite.check('100% beats critical', statusOf({ progress: 100, isCritical: true }) === 'done');
suite.check('100% beats milestone', statusOf({ progress: 100, isMilestone: true }) === 'done');
suite.check('100% beats both', statusOf({ progress: 100, isCritical: true, isMilestone: true }) === 'done');
suite.check('milestone beats critical', statusOf({ isMilestone: true, isCritical: true }) === 'milestone');
suite.check('partial is in-progress', statusOf({ progress: 40 }) === 'in-progress');
suite.check('critical partial is critical', statusOf({ progress: 40, isCritical: true }) === 'critical');
suite.check('zero progress is planned', statusOf({}) === 'planned');

suite.section('label, class, and rank coherence');
suite.check('done label', taskStatus(makeTask({ progress: 100 })).label === 'Done');
suite.check('done class mentions completed', taskStatus(makeTask({ progress: 100 })).cls.includes('text-completed'));
suite.check('done rank is top', taskStatus(makeTask({ progress: 100 })).rank === 5);

const FIXTURE_FOR_STATUS: Record<TaskStatus, Partial<TimelineTask>> = {
  planned: {},
  critical: { isCritical: true },
  'in-progress': { progress: 50 },
  milestone: { isMilestone: true },
  done: { progress: 100 },
};
const ORDER: TaskStatus[] = ['planned', 'critical', 'in-progress', 'milestone', 'done'];
const ranks = ORDER.map((s) => taskStatus(makeTask(FIXTURE_FOR_STATUS[s])).rank);
suite.check('ranks strictly increasing', ranks.every((r, i) => i === 0 || r > ranks[i - 1]), { ranks });

suite.finish('task-status priority holds.');
