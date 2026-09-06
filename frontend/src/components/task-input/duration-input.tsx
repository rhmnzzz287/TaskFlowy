'use client'

import React, { useState, useRef, useEffect } from 'react'
import { parseDuration } from '@/lib/parser/duration-grammar'

interface DurationInputProps {
  value: string
  onChange: (val: string) => void
  error?: boolean
  placeholder?: string
  className?: string
}

const PRESET_CHIPS = [
  { label: '1h', value: '1 hari' },
  { label: '2h', value: '2 hari' },
  { label: '3h', value: '3 hari' },
  { label: '5h', value: '5 hari' },
  { label: '1m', value: '1 minggu' },
  { label: '2m', value: '2 minggu' },
]

export function DurationInput({
  value,
  onChange,
  error = false,
  placeholder = '3 hari',
  className = '',
}: DurationInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Tutup popover jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation: ArrowUp/Down untuk menaikkan/menurunkan hari
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const parsed = parseDuration(value)
      const currentDays = parsed.ok ? parsed.days : 1
      const nextDays = e.key === 'ArrowUp' ? currentDays + 1 : Math.max(1, currentDays - 1)
      onChange(`${nextDays} hari`)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const selectPreset = (presetVal: string) => {
    onChange(presetVal)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        className={`cell-input ${error ? 'ring-1 ring-error' : ''} ${className}`}
        placeholder={placeholder}
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-surface border border-border rounded-md shadow-lg p-1.5 flex flex-wrap gap-1 min-w-[170px]">
          <span className="text-[10px] text-muted font-medium w-full px-1">Quick Select:</span>
          {PRESET_CHIPS.map(chip => (
            <button
              key={chip.label}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                selectPreset(chip.value)
              }}
              className="px-2 py-0.5 text-[11px] rounded bg-surface-hi hover:bg-primary hover:text-white text-text-dim font-medium transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
