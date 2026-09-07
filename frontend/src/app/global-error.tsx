'use client'

import { AlertTriangle } from 'lucide-react'
import { reportError } from '@/lib/telemetry'
import { ClearCacheButton } from '@/components/ui/widget-error-boundary'

/**
 * Global fail-safe of last resort (Next.js App Router convention — must
 * render its own <html>/<body>). Only reached when even the root layout
 * fails; keeps a recovery path instead of a white blank page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Report synchronously during render: effects may never run if the tree
  // is too broken, and reportError is side-effect-safe (bounded buffer).
  try { reportError(error, 'error') } catch { /* last resort — stay silent */ }

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0F172A', color: '#F1F5F9' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="alert" style={{ maxWidth: 440, width: '100%', textAlign: 'center', background: '#141B2D', border: '1px solid #2D3A50', borderRadius: 16, padding: 32 }}>
            <div style={{ margin: '0 auto 16px', width: 44, height: 44, borderRadius: 12, background: 'rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} color="#FB7185" />
            </div>
            <h1 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Something went wrong</h1>
            <p style={{ fontSize: 13, color: '#B4C3D7', lineHeight: 1.6, margin: '0 0 4px' }}>
              TaskFlowy failed to start. Your local drafts are untouched.
            </p>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#B4C3D7', margin: '0 0 20px' }}>
              {error.digest ? `Error ref: ${error.digest}` : 'No error reference available'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={reset} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#818CF8', color: '#0F172A', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Try again
              </button>
              <button type="button" onClick={() => window.location.reload()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #2D3A50', background: 'transparent', color: '#F1F5F9', fontSize: 13, cursor: 'pointer' }}>
                Reload app
              </button>
              <ClearCacheButton />
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
