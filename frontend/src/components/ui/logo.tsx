'use client'

import React from 'react'

interface LogoProps {
  /** Pixel size of the square mark (default 28). */
  size?: number
  className?: string
}

/**
 * TaskFlowy brand mark — Gantt bars glyph from
 * stitch_design.md_refinement/text_to_gantt_logo/code.html.
 * Single source of truth: navbar, footer, and /app back-link all use this.
 */
export function LogoMark({ size = 28, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#4F46E5" />
      <rect x="8" y="12" width="14" height="4" rx="2" fill="#FFFFFF" />
      <rect x="18" y="19" width="14" height="4" rx="2" fill="#38BDF8" />
      <rect x="12" y="26" width="18" height="4" rx="2" fill="#818CF8" />
      <path d="M22 16L22 19M26 23L26 26" stroke="#C7D2FE" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

interface LogoPropsWithWordmark extends LogoProps {
  wordmarkClassName?: string
}

/** Brand mark + "TaskFlowy" wordmark lockup. */
export function Logo({ size = 28, className = '', wordmarkClassName = '' }: LogoPropsWithWordmark) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className={`font-bold text-text-primary tracking-tight ${wordmarkClassName}`}>
        TaskFlowy
      </span>
    </span>
  )
}
