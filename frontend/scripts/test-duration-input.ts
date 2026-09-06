// Unit check: duration preset values must parse with the deterministic grammar.
import { parseDuration } from '../src/lib/parser/duration-grammar';
import { createSuite } from './_suite';

const PRESETS = ['1 hari', '2 hari', '3 hari', '5 hari', '1 minggu', '2 minggu'];

const suite = createSuite('test-duration-input');
for (const preset of PRESETS) {
  suite.check(`preset "${preset}" parses`, parseDuration(preset).ok);
}
suite.finish('all duration presets are valid.');
