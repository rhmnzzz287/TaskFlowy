// Self-check (no framework): CSV escaping + shape contract.
import { tasksToCSV } from '../src/lib/csv-export';
import type { TimelineTask } from '../src/lib/schema';
import { createSuite } from './_suite';

const HEADER = 'name,assignee,start,end,durationDays,progress,dependsOn,isMilestone,isCritical';

function makeTask(over: Partial<TimelineTask> = {}): TimelineTask {
  return {
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
  };
}

const suite = createSuite('test-csv-export');

// Deterministic full-output equality: escaping + quoting + BOM in one shot.
const csv = tasksToCSV([makeTask({ name: 'Task, A' }), makeTask({ name: 'Say "hi"' }), makeTask({ name: 'Line\nbreak' })]);
const expected =
  '\uFEFF' +
  `${HEADER}\n` +
  '"Task, A",Andi,2026-09-07,2026-09-09,3,50,,false,false\n' +
  '"Say ""hi""",Andi,2026-09-07,2026-09-09,3,50,,false,false\n' +
  '"Line\nbreak",Andi,2026-09-07,2026-09-09,3,50,,false,false\n';
suite.check('full output exact (BOM, header, escaping, multiline)', csv === expected);

// Canonical-state roundtrip: milestone/critical/progress flags survive.
const single = tasksToCSV([makeTask({ progress: 100, isMilestone: true, isCritical: true })]);
suite.checkEqual(
  'flags roundtrip',
  single.trimEnd().split('\n')[1],
  'Desain UI,Andi,2026-09-07,2026-09-09,3,100,,true,true',
);

// Empty assignee/dependsOn stay empty (no 'null' leak).
suite.check(
  'empty fields stay empty',
  tasksToCSV([makeTask({ assignee: null })]).split('\n')[1].startsWith('Desain UI,,'),
);

// Empty task list renders header only (BOM included).
suite.checkEqual('empty list renders header only', tasksToCSV([]), `\uFEFF${HEADER}\n`);

suite.finish('CSV export contract holds.');
