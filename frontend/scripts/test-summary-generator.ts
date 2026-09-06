// Unit check: 1-click chat summary generator (Slack/WhatsApp/Markdown).
import { generateChatSummary } from '../src/lib/format/text-summary';
import type { TimelineTask } from '../src/lib/schema';
import { createSuite } from './_suite';

function makeTask(over: Partial<TimelineTask>): TimelineTask {
  return {
    id: 'x',
    name: 'Untitled',
    assignee: null,
    start: '2026-09-10',
    end: '2026-09-10',
    durationDays: 1,
    progress: 0,
    isCritical: false,
    isMilestone: false,
    ambiguities: [],
    ...over,
  } as TimelineTask;
}

const TASKS: TimelineTask[] = [
  makeTask({ id: '1', name: 'UI Design', assignee: 'Andi', start: '2026-09-10', end: '2026-09-12', durationDays: 3, progress: 100 }),
  makeTask({ id: '2', name: 'API Development', assignee: 'Budi', start: '2026-09-13', end: '2026-09-19', durationDays: 7, progress: 30, isCritical: true }),
  makeTask({ id: '3', name: 'Go-Live', start: '2026-09-20', end: '2026-09-20', durationDays: 0, isMilestone: true }),
];

const suite = createSuite('test-summary-generator');
const summary = generateChatSummary(TASKS, 'Proyek TaskFlowy');
console.log('Generated output:\n', summary);

suite.check('summary lists UI Design', summary.includes('UI Design'));
suite.check('summary lists API Development', summary.includes('API Development'));
suite.check('summary marks the milestone', summary.includes('[Milestone]'));

suite.finish('chat summary renders.');
