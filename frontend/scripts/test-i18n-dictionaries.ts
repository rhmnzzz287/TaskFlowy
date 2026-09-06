import { idDict } from '../src/lib/i18n/id'
import { enDict } from '../src/lib/i18n/en'

console.log('--- TEST 1: Key Parity Verification (idDict vs enDict) ---')

function checkKeys(idObj: Record<string, any>, enObj: Record<string, any>, path = '') {
  const idKeys = Object.keys(idObj)
  const enKeys = Object.keys(enObj)

  for (const key of idKeys) {
    const currentPath = path ? `${path}.${key}` : key
    if (!(key in enObj)) {
      console.error(`FAIL: Key "${currentPath}" exists in ID but is missing in EN!`)
      process.exit(1)
    }
    if (typeof idObj[key] === 'object' && idObj[key] !== null && !Array.isArray(idObj[key])) {
      checkKeys(idObj[key], enObj[key], currentPath)
    }
  }

  for (const key of enKeys) {
    const currentPath = path ? `${path}.${key}` : key
    if (!(key in idObj)) {
      console.error(`FAIL: Key "${currentPath}" exists in EN but is missing in ID!`)
      process.exit(1)
    }
  }
}

checkKeys(idDict, enDict)
console.log('✓ 100% key parity verified between id.ts and en.ts.')

console.log('--- TEST 2: Anti-Slop Check on Dictionaries (No Em Dashes) ---')
const idJson = JSON.stringify(idDict)
const enJson = JSON.stringify(enDict)

if (idJson.includes('\u2014') || idJson.includes('—')) {
  console.error('FAIL: idDict contains forbidden em dash (—)!')
  process.exit(1)
}
if (enJson.includes('\u2014') || enJson.includes('—')) {
  console.error('FAIL: enDict contains forbidden em dash (—)!')
  process.exit(1)
}
console.log('✓ Zero em dashes found in both dictionaries.')

console.log('All i18n dictionary tests passed!')
