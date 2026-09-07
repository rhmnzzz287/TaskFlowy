/**
 * Workbench route loading skeleton (Next.js App Router convention).
 * Shown during /app navigation instead of a blank white screen.
 */
export default function AppLoading() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background" aria-hidden="true">
      <div className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-surface-hi animate-pulse" />
          <div className="w-32 h-4 rounded bg-surface-hi animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-28 h-7 rounded bg-surface-hi animate-pulse" />
          <div className="w-8 h-7 rounded bg-surface-hi animate-pulse" />
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-12 bg-surface border-r border-border shrink-0" />
        <div className="flex-1 flex flex-col min-w-0 p-3 gap-2">
          <div className="h-24 rounded-lg bg-surface-dim border border-border animate-pulse" />
          <div className="flex-1 flex gap-3 min-h-0">
            <div className="w-[390px] shrink-0 rounded-lg bg-surface/60 border border-border animate-pulse hidden md:block" />
            <div className="flex-1 rounded-lg bg-surface-dim border border-border animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
