'use client'

import React, { useState } from 'react'
import { CalendarClock, ChevronDown } from 'lucide-react'

interface BulkShiftPopoverProps {
  onShift: (deltaDays: number) => void
}

export function BulkShiftPopover({ onShift }: BulkShiftPopoverProps) {
  const [open, setOpen] = useState(false)

  const handleShift = (days: number) => {
    onShift(days)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary text-[12px] h-7 gap-1"
        title="Geser seluruh tanggal jadwal proyek"
      >
        <CalendarClock size={13} />
        <span>Shift Dates</span>
        <ChevronDown size={11} className="opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded shadow-xl p-2 w-48 flex flex-col gap-1.5 text-[12px]">
          <span className="text-muted font-medium text-[11px] px-1">Undur Proyek:</span>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => handleShift(1)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">+1 hari</button>
            <button onClick={() => handleShift(3)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">+3 hari</button>
            <button onClick={() => handleShift(7)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">+1 mgg</button>
          </div>
          <span className="text-muted font-medium text-[11px] px-1 mt-1">Majukan Proyek:</span>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => handleShift(-1)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">-1 hari</button>
            <button onClick={() => handleShift(-3)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">-3 hari</button>
            <button onClick={() => handleShift(-7)} className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center font-medium">-1 mgg</button>
          </div>
        </div>
      )}
    </div>
  )
}
