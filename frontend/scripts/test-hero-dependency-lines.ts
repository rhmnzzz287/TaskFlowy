import { parseRawText } from '../src/lib/format/raw-text';
import { parseRows } from '../src/lib/parser/row-parser';
import {
  buildPmPreset,
  buildPmPresetEn,
  buildUmkmPreset,
  buildUmkmPresetEn,
} from '../src/lib/landing-presets';
import { layoutTaskBounds, resolveDependencyLinks } from './_gantt';
import { createSuite } from './_suite';

const REF = '2026-09-07';
const CONTAINER_WIDTH = 400; // Narrow on purpose: exercises the scroll path.
const EXPECTED_LINKS = 3;

const suite = createSuite('test-hero-dependency-lines');

interface PresetDef {
  label: string;
  build: (ref: string) => string;
}

const PRESETS: PresetDef[] = [
  { label: 'UMKM', build: buildUmkmPreset },
  { label: 'PM', build: buildPmPreset },
];

for (const { label, build } of PRESETS) {
  suite.section(`${label} dependency geometry`);
  const { tasks } = parseRows(parseRawText(build(REF)), REF);
  console.log(
    `${label} tasks:`,
    tasks.map((t) => ({ name: t.name, start: t.start, end: t.end, dur: t.durationDays, dep: t.dependsOn })),
  );

  const layout = layoutTaskBounds(tasks, CONTAINER_WIDTH);
  console.log(
    `${label} layout: totalDays=${layout.totalDays}, dayWidth=${layout.dayWidth}px, ` +
      `contentWidth=${layout.contentWidth}px, isScrollable=${layout.isScrollable}`,
  );
  for (const b of layout.bounds) {
    console.log(`  Task ${b.idx} (${b.displayName}): day ${b.startDay}, dur ${b.dur}d, [${b.xLeft.toFixed(1)} -> ${b.xRight.toFixed(1)}], y: ${b.yCenter}`);
  }

  const links = resolveDependencyLinks(tasks, layout.bounds);
  for (const link of links) {
    console.log(`\nLink: Task ${link.parentIdx} -> Task ${link.childIdx}\n  Path: ${link.path}`);
  }
  suite.check(`${label}: ${EXPECTED_LINKS} links resolved`, links.length === EXPECTED_LINKS, { found: links.length });
  suite.check(`${label}: zero NaN in paths`, links.every((l) => !l.path.includes('NaN')));
}

suite.section('English presets keep relations');
const EN_PRESETS: PresetDef[] = [
  { label: 'UMKM EN', build: buildUmkmPresetEn },
  { label: 'PM EN', build: buildPmPresetEn },
];
for (const { label, build } of EN_PRESETS) {
  const { tasks } = parseRows(parseRawText(build(REF)), REF);
  const depCount = tasks.filter((t) => t.dependsOn).length;
  suite.check(`${label}: ${EXPECTED_LINKS} dependsOn`, depCount === EXPECTED_LINKS, { found: depCount });
}

suite.finish('dependency lines compute with zero NaN.');
