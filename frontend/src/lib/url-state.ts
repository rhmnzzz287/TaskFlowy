import LZString from 'lz-string'
import type { ParseRowState } from '@/lib/schema'

const KEY = 'data'

/** Compress serialised state into URL hash fragment. */
export function encodeRowsToHash(rows: ParseRowState[]): string {
  const json = JSON.stringify(rows.map(({ id, ...rest }) => rest))
  const compressed = LZString.compressToEncodedURIComponent(json)
  return `#${KEY}=${compressed}`
}

/** Read URL hash and decompress to rows. Returns null when no data present. */
export function decodeHashToRows(): Partial<ParseRowState>[] | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  if (!hash.startsWith(`#${KEY}=`)) return null
  try {
    const raw = hash.slice(`#${KEY}=`.length)
    const json = LZString.decompressFromEncodedURIComponent(raw)
    if (!json) return null
    return JSON.parse(json) as Partial<ParseRowState>[]
  } catch {
    return null
  }
}

/** Update URL hash without reloading the page. */
export function pushHash(hash: string) {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', hash || window.location.pathname)
  }
}