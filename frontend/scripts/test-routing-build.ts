import fs from 'fs'
import path from 'path'
import { encodeRowsToHash, decodeHashToRows } from '../src/lib/url-state'
import type { ParseRowState } from '../src/lib/schema'

console.log('--- TEST 1: Verifikasi File Route /app/page.tsx ---')
const appPagePath = path.join(__dirname, '../src/app/app/page.tsx')
if (!fs.existsSync(appPagePath)) {
  console.error('FAIL: File frontend/src/app/app/page.tsx belum dibuat!')
  process.exit(1)
}
const appPageSrc = fs.readFileSync(appPagePath, 'utf8')
if (!appPageSrc.includes('href="/"') || !appPageSrc.includes('Kembali ke Beranda')) {
  console.error('FAIL: Route /app/page.tsx belum punya navigasi kembali ke landing (href="/").')
  process.exit(1)
}
console.log('✓ File route /app/page.tsx terverifikasi (+ back-link ke /).')

console.log('--- TEST 2: Verifikasi URL Hash Handoff ---')
const sampleRows: ParseRowState[] = [
  { id: '1', name: 'Produksi Roti', assignee: 'Bu Siti', start: '2026-09-07', duration: '3 hari', end: '2026-09-09', dependsOn: '' },
  { id: '2', name: 'Packaging', assignee: 'Doni', start: '2026-09-10', duration: '2 hari', end: '2026-09-11', dependsOn: '' },
]

const hash = encodeRowsToHash(sampleRows)
if (!hash.startsWith('#data=')) {
  console.error('FAIL: Hash tidak berformat #data=... :', hash.slice(0, 20))
  process.exit(1)
}
const decoded = decodeHashToRows(hash)

if (!decoded || decoded.length !== 2 || decoded[0].name !== 'Produksi Roti') {
  console.error('FAIL: Hash handoff gagal mendekode data:', decoded)
  process.exit(1)
}

// Tanpa argumen di Node (tanpa window) harus aman → null, bukan throw.
const noArg = decodeHashToRows()
if (noArg !== null) {
  console.error('FAIL: decodeHashToRows() tanpa hash di Node harus null, got:', noArg)
  process.exit(1)
}
console.log('✓ Hash serialization & handoff berjalan sempurna.')
console.log('All routing tests passed!')
