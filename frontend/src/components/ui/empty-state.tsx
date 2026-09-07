'use client'

import type { LucideIcon } from 'lucide-react'

interface EmptyAction {
  label: string
  onClick: () => void
  primary?: boolean
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actions?: EmptyAction[]
}

/**
 * Action-oriented empty state: every empty view explains what is empty,
 * why, and offers the next step — never a bare "No data found."
 */
export function EmptyState({ icon: Icon, title, description, actions = [] }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4">
          <Icon size={20} className="text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-text-primary text-[15px] font-semibold mb-2">{title}</h3>
        <p className="text-muted text-[13px] leading-relaxed mb-4">{description}</p>
        {actions.length > 0 && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {actions.map(a => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={a.primary ? 'btn-primary text-[12px]' : 'btn-secondary text-[12px]'}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
