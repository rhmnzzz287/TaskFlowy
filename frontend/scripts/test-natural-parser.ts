import { parseRawText } from '../src/lib/format/raw-text'

let failures = 0
function check(desc: string, cond: boolean) {
  if (!cond) {
    failures++
    console.error(`FAIL: ${desc}`)
  } else {
    console.log(`ok: ${desc}`)
  }
}

// Test 1: Piped lines still parse correctly (backward compatibility)
const piped = parseRawText('Sprint Planning | Andi | 10 Sep 2026 | 2 hari')
check('piped row count', piped.length === 1)
check('piped name', piped[0].name === 'Sprint Planning')
check('piped assignee', piped[0].assignee === 'Andi')
check('piped start', piped[0].start === '10 Sep 2026')
check('piped duration', piped[0].duration === '2 hari')

// Test 2: Natural language with "oleh" and duration
const freeform1 = parseRawText('Riset pasar dan kompetitor besok selama 3 hari oleh Tini')
check('freeform1 row count', freeform1.length === 1)
check('freeform1 name', freeform1[0].name.trim() === 'Riset pasar dan kompetitor')
check('freeform1 assignee', freeform1[0].assignee === 'Tini')
check('freeform1 start', freeform1[0].start === 'besok')
check('freeform1 duration', freeform1[0].duration === '3 hari')

// Test 3: Natural language with @mention and week duration
const freeform2 = parseRawText('Desain UI/UX wireframe 2 minggu @Budi')
check('freeform2 name', freeform2[0].name.trim() === 'Desain UI/UX wireframe')
check('freeform2 assignee', freeform2[0].assignee === 'Budi')
check('freeform2 duration', freeform2[0].duration === '2 minggu')

// Test 4: Natural language with explicit date and shorthand duration
const freeform3 = parseRawText('Testing regression 15 Sep 4d lead: Siti')
check('freeform3 name', freeform3[0].name.trim() === 'Testing regression')
check('freeform3 assignee', freeform3[0].assignee === 'Siti')
check('freeform3 start', freeform3[0].start === '15 Sep')
check('freeform3 duration', freeform3[0].duration === '4d')

// Test 5: Multi-line mixed — pipe + freeform
const mixed = parseRawText('API Dev | Rudi | 10 Sep | 5 hari\nDeploy ke staging besok 2 hari oleh Dewi')
check('mixed row count', mixed.length === 2)
check('mixed pipe name', mixed[0].name === 'API Dev')
check('mixed freeform name', mixed[1].name.trim() === 'Deploy ke staging')
check('mixed freeform assignee', mixed[1].assignee === 'Dewi')

if (failures > 0) {
  console.error(`\n${failures} tests failed!`)
  process.exit(1)
} else {
  console.log(`\nAll natural language parser tests passed!`)
  process.exit(0)
}
