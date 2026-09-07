/**
 * Same-origin API client with a centralized HTTP catch-all.
 *
 * ALL client-side `/api/*` calls should go through `apiFetch` so status
 * codes map to consistent UX instead of failing silently:
 * - 401 → session is stale: hard-redirect to sign-in with ?expired=1
 * - 403 → access-denied notice (no redirect; the user is authenticated)
 * - 429 → rate-limit notice including the server's Retry-After when present
 * - 5xx → friendly non-technical notice
 * - network failure → offline/connection notice
 *
 * Notices are emitted to a subscriber (the workbench wires them to toasts)
 * so this module stays UI-framework agnostic.
 */

export class ApiError extends Error {
  status: number
  retryAfterSec: number | null
  constructor(status: number, message: string, retryAfterSec: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfterSec = retryAfterSec
  }
}

export type ApiNoticeKind = 'forbidden' | 'rate-limited' | 'server-error' | 'connection'

export interface ApiNotice {
  kind: ApiNoticeKind
  message: string
  retryAfterSec?: number | null
}

type NoticeHandler = (notice: ApiNotice) => void

let noticeHandler: NoticeHandler | null = null

/** Workbench (or any shell) subscribes once to surface notices as toasts. */
export function onApiNotice(handler: NoticeHandler | null) {
  noticeHandler = handler
}

function emit(notice: ApiNotice) {
  try { noticeHandler?.(notice) } catch { /* never let UX feedback throw */ }
}

function retryAfter(res: Response): number | null {
  const raw = res.headers.get('retry-after')
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(input, { credentials: 'include', ...init })
  } catch {
    emit({ kind: 'connection', message: 'Cannot reach the server. Check your connection and retry.' })
    throw new ApiError(0, 'Network request failed')
  }

  if (res.ok) return res

  if (res.status === 401) {
    // Stale/expired session — full navigation (not router.push) so every
    // in-memory auth cache is dropped and no redirect loop can form.
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/sign-in')) {
      window.location.href = '/sign-in?expired=1'
    }
    throw new ApiError(401, 'Session expired')
  }
  if (res.status === 403) {
    emit({ kind: 'forbidden', message: 'Insufficient permissions for that action.' })
    throw new ApiError(403, 'Forbidden')
  }
  if (res.status === 429) {
    const secs = retryAfter(res)
    emit({
      kind: 'rate-limited',
      message: secs !== null
        ? `Too many requests — please retry in ${secs}s.`
        : 'Too many requests — please slow down and retry shortly.',
      retryAfterSec: secs,
    })
    throw new ApiError(429, 'Too many requests', secs)
  }
  if (res.status >= 500) {
    emit({ kind: 'server-error', message: 'Our servers are having a moment. Please retry.' })
    throw new ApiError(res.status, 'Server error')
  }
  throw new ApiError(res.status, `Request failed (${res.status})`)
}
