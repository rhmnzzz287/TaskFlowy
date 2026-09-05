'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface AmbiguityAlertProps {
  warnings: string[]
}

export function AmbiguityAlert({ warnings }: AmbiguityAlertProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle size={15} className="text-warning shrink-0" />
        <p className="text-[13px] text-text-primary truncate">
          <span className="font-semibold text-warning">{warnings.length} Warning{warnings.length > 1 ? 's' : ''}:</span>{' '}
          {warnings[0]}
        </p>
      </div>
      <button className="p-1 text-muted hover:text-text-primary rounded transition-colors shrink-0" onClick={() => setDismissed(true)}>
        <X size={14} />
      </button>
    </div>
  )
}