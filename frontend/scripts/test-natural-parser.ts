import { parseRawText } from '../src/lib/format/raw-text';
import { createSuite } from './_suite';

interface NaturalCase {
  desc: string;
  input: string;
  rowIndex?: number;
  field: 'name' | 'assignee' | 'start' | 'duration';
  expected: string;
  trim?: boolean;
}

const CASES: NaturalCase[] = [
  // Backward-compatible piped row.
  { desc: 'piped name', input: 'Sprint Planning | Andi | 10 Sep 2026 | 2 hari', field: 'name', expected: 'Sprint Planning' },
  { desc: 'piped assignee', input: 'Sprint Planning | Andi | 10 Sep 2026 | 2 hari', field: 'assignee', expected: 'Andi' },
  { desc: 'piped start', input: 'Sprint Planning | Andi | 10 Sep 2026 | 2 hari', field: 'start', expected: '10 Sep 2026' },
  { desc: 'piped duration', input: 'Sprint Planning | Andi | 10 Sep 2026 | 2 hari', field: 'duration', expected: '2 hari' },
  // Freeform with "oleh" + duration.
  {
    desc: 'freeform name strips metadata',
    input: 'Riset pasar dan kompetitor besok selama 3 hari oleh Tini',
    field: 'name',
    expected: 'Riset pasar dan kompetitor',
    trim: true,
  },
  { desc: 'freeform "oleh" assignee', input: 'Riset pasar dan kompetitor besok selama 3 hari oleh Tini', field: 'assignee', expected: 'Tini' },
  { desc: 'freeform relative start', input: 'Riset pasar dan kompetitor besok selama 3 hari oleh Tini', field: 'start', expected: 'besok' },
  { desc: 'freeform duration', input: 'Riset pasar dan kompetitor besok selama 3 hari oleh Tini', field: 'duration', expected: '3 hari' },
  // Freeform with @mention + week duration.
  {
    desc: '@mention name',
    input: 'Desain UI/UX wireframe 2 minggu @Budi',
    field: 'name',
    expected: 'Desain UI/UX wireframe',
    trim: true,
  },
  { desc: '@mention assignee', input: 'Desain UI/UX wireframe 2 minggu @Budi', field: 'assignee', expected: 'Budi' },
  { desc: 'week duration', input: 'Desain UI/UX wireframe 2 minggu @Budi', field: 'duration', expected: '2 minggu' },
  // Freeform with explicit date + shorthand duration.
  {
    desc: 'shorthand name',
    input: 'Testing regression 15 Sep 4d lead: Siti',
    field: 'name',
    expected: 'Testing regression',
    trim: true,
  },
  { desc: 'lead: assignee', input: 'Testing regression 15 Sep 4d lead: Siti', field: 'assignee', expected: 'Siti' },
  { desc: 'explicit start', input: 'Testing regression 15 Sep 4d lead: Siti', field: 'start', expected: '15 Sep' },
  { desc: 'shorthand duration', input: 'Testing regression 15 Sep 4d lead: Siti', field: 'duration', expected: '4d' },
];

const suite = createSuite('test-natural-parser');

suite.section('single-line parsing');
for (const c of CASES) {
  const rows = parseRawText(c.input);
  const value = rows[0]?.[c.field] ?? '';
  suite.check(c.desc, c.trim ? value.trim() === c.expected : value === c.expected, { value, expected: c.expected });
}

suite.section('multi-line mixed pipe + freeform');
const mixed = parseRawText('API Dev | Rudi | 10 Sep | 5 hari\nDeploy ke staging besok 2 hari oleh Dewi');
suite.check('mixed row count', mixed.length === 2);
suite.check('mixed pipe name', mixed[0]?.name === 'API Dev');
suite.check('mixed freeform name', (mixed[1]?.name ?? '').trim() === 'Deploy ke staging');
suite.check('mixed freeform assignee', mixed[1]?.assignee === 'Dewi');

suite.finish('natural language parsing holds.');
