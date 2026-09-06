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

  // "3 hari" or "3 day" or "3 days" or "3 hr" or "3 hour" or "3 hours"
  const days = /^(\d+)\s*(hari|hrs?|hours?|days?)$/.exec(s)
  if (days) {
    const n = parseInt(days[1], 10)
    if (n >= 1) return { ok: true, days: n }
    return { ok: false, error: `Duration must be >= 1 day, got ${n}` }
  }

  // "1 minggu" / "1 week" / "2 weeks"
  const weeks = /^(\d+)\s*(minggu|week|weeks)$/.exec(s)
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