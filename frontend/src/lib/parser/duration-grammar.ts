// Duration grammar parser

export interface ParsedDuration {
  ok: true
  days: number
}

export interface DurationError {
  ok: false
  error: string
}

export type DurationResult = ParsedDuration | DurationError

export function parseDuration(raw: string | null | undefined): DurationResult {
  if (!raw || raw.trim() === '') {
    return { ok: false, error: 'Empty duration' }
  }
  const s = raw.trim().toLowerCase()

  // Milestone checkpoint: zero-duration keywords & aliases
  if (s === 'milestone' || s === '0' || s === '0 hari' || s === '0 days' || s === '0 d') {
    return { ok: true, days: 0 }
  }

  // "3 hari" / "3 hr" / "3 days" / shorthand "3d"
  const days = /^(\d+)\s*(hari|d|hr|hrs|hour|hours|day|days)$/.exec(s)
  if (days) {
    // n >= 0: 0 is a valid zero-duration milestone checkpoint
    return { ok: true, days: parseInt(days[1], 10) }
  }

  // "1 minggu" / "2 weeks" / shorthand "2w"
  const weeks = /^(\d+)\s*(minggu|w|wk|weeks?)$/.exec(s)
  if (weeks) {
    return { ok: true, days: parseInt(weeks[1], 10) * 7 }
  }

  // "sampai 15 Sep 2026" — this is actually an end date, not a duration
  // Handled in row-parser as end alternative
  if (/^sampai|until|to\b/.test(s)) {
    return { ok: false, error: 'Use End field instead of "sampai" in duration' }
  }

  // bare number = days
  const bare = /^(\d+)$/.exec(s)
  if (bare) {
    const n = parseInt(bare[1], 10)
    if (n >= 1) return { ok: true, days: n }
  }

  return { ok: false, error: `Unrecognized duration: "${raw}"` }
}