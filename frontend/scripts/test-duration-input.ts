// Unit check: duration preset values must parse with the deterministic grammar
import { parseDuration } from '../src/lib/parser/duration-grammar'

const presets = ['1 hari', '2 hari', '3 hari', '5 hari', '1 minggu', '2 minggu']

for (const p of presets) {
  const res = parseDuration(p)
  if (!res.ok) {
    console.error(`Preset "${p}" failed to parse!`)
    process.exit(1)
  }
}
console.log('✓ Seluruh preset durasi terbukti valid.')
