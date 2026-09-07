/**
 * Lightweight client-side telemetry — dependency-free stand-in for a
 * Sentry/LogRocket-style reporter.
 *
 * - Captures `window.onerror` + `unhandledrejection` automatically once
 *   `initTelemetry()` runs (mounted via <TelemetryInit/> in root layout).
 * - `reportError()` is called by error boundaries and other catch sites.
 * - Attaches user context (profile name) so reports are attributable.
 * - If NEXT_PUBLIC_TELEMETRY_ENDPOINT is set, buffered envelopes are POSTed
 *   there (same-origin recommended, e.g. proxied to your observability
 *   stack). Otherwise reports are kept in a bounded in-memory ring buffer
 *   and mirrored to console in development only — never console noise in
 *   production builds.
 *
 * Upgrade path: replace `deliver()` with Sentry.captureException and keep
 * every call site unchanged.
 */

export interface TelemetryContext {
  userId?: string
  userName?: string
  route?: string
}

export interface TelemetryEvent {
  id: string
  at: string
  kind: 'error' | 'unhandledrejection'
  message: string
  stack?: string
  url?: string
  context: TelemetryContext
}

const MAX_BUFFER = 50

let initialized = false
let context: TelemetryContext = {}
let buffer: TelemetryEvent[] = []
let deliverTimer: ReturnType<typeof setTimeout> | null = null

function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().slice(0, 8)
    }
  } catch { /* fall through */ }
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(36)}`
}

/** Attach customer context (call after profile/session loads). */
export function setTelemetryContext(next: Partial<TelemetryContext>) {
  context = { ...context, ...next }
}

export function getTelemetryBuffer(): TelemetryEvent[] {
  return [...buffer]
}

function endpoint(): string | null {
  // NEXT_PUBLIC_ prefix is required for client exposure; absence means
  // "collect locally only" — never ship a hardcoded collector URL.
  return process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT || null
}

function scheduleDeliver() {
  const url = endpoint()
  if (!url || deliverTimer) return
  deliverTimer = setTimeout(async () => {
    deliverTimer = null
    const batch = buffer
    buffer = []
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      })
    } catch {
      // Collector unreachable — restore (bounded) so nothing is lost silently.
      buffer = [...batch, ...buffer].slice(-MAX_BUFFER)
    }
  }, 2000)
}

export function reportError(err: unknown, kind: TelemetryEvent['kind'] = 'error') {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  const event: TelemetryEvent = {
    id: `err-${uid()}`,
    at: new Date().toISOString(),
    kind,
    message: message || 'Unknown error',
    stack,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    context: {
      ...context,
      route: typeof window !== 'undefined' ? window.location.pathname : context.route,
    },
  }
  buffer = [...buffer, event].slice(-MAX_BUFFER)
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(`[telemetry:${event.id}]`, message, stack ?? '')
  }
  scheduleDeliver()
  return event.id
}

/** Idempotent: safe to call from multiple mount points. */
export function initTelemetry() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('error', e => {
    reportError(e.error ?? e.message, 'error')
  })
  window.addEventListener('unhandledrejection', e => {
    reportError(e.reason, 'unhandledrejection')
  })
}
