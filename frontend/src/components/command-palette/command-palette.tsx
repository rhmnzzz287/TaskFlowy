'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search,
  BarChart3,
  Table2,
  GitBranch,
  Users,
  Grid,
  Columns2,
  Zap,
  SlidersHorizontal,
  CalendarPlus,
  CalendarMinus,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  CornerDownLeft,
} from 'lucide-react'
import { TimelineTask } from '@/lib/schema'
import { useTranslation } from '@/lib/i18n/context'

type ViewMode = 'gantt' | 'table' | 'dependency' | 'workload' | 'matrix' | 'split'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  tasks: TimelineTask[]
  onSelectTask: (taskId: string) => void
  onSelectView: (view: ViewMode) => void
  onToggleCriticalPath: () => void
  onToggleSimulation: () => void
  onShiftDates: (delta: number) => void
  onExportCSV: () => void
  onExportPNG: () => void
}

interface CommandItem {
  id: string
  title: string
  category: 'Views' | 'Actions' | 'Tasks'
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

export function CommandPalette({
  isOpen,
  onClose,
  tasks,
  onSelectTask,
  onSelectView,
  onToggleCriticalPath,
  onToggleSimulation,
  onShiftDates,
  onExportCSV,
  onExportPNG,
}: CommandPaletteProps) {
  const { locale } = useTranslation()
  const isId = locale === 'id'

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Build commands catalog
  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Views
      {
        id: 'view-gantt',
        title: isId ? 'Tampilan Gantt Timeline' : 'Switch to Gantt Timeline',
        category: 'Views',
        icon: <BarChart3 className="w-4 h-4 text-primary" />,
        action: () => onSelectView('gantt'),
      },
      {
        id: 'view-split',
        title: isId ? 'Mode Layar Pisah (Tabel + Gantt)' : 'Switch to Split Mode (Table + Gantt)',
        category: 'Views',
        icon: <Columns2 className="w-4 h-4 text-primary" />,
        shortcut: 'Split',
        action: () => onSelectView('split'),
      },
      {
        id: 'view-table',
        title: isId ? 'Tampilan Tabel Data' : 'Switch to Data Grid Table',
        category: 'Views',
        icon: <Table2 className="w-4 h-4 text-primary" />,
        action: () => onSelectView('table'),
      },
      {
        id: 'view-dependency',
        title: isId ? 'Tampilan Graf Ketergantungan (DAG)' : 'Switch to Dependency DAG Graph',
        category: 'Views',
        icon: <GitBranch className="w-4 h-4 text-primary" />,
        action: () => onSelectView('dependency'),
      },
      {
        id: 'view-workload',
        title: isId ? 'Tampilan Kapasitas Tim (Workload)' : 'Switch to Resource Workload & Capacity',
        category: 'Views',
        icon: <Users className="w-4 h-4 text-primary" />,
        action: () => onSelectView('workload'),
      },
      {
        id: 'view-matrix',
        title: isId ? 'Tampilan Matriks Ketergantungan (DSM)' : 'Switch to Dependency Structure Matrix (DSM)',
        category: 'Views',
        icon: <Grid className="w-4 h-4 text-primary" />,
        action: () => onSelectView('matrix'),
      },

      // Quick Actions
      {
        id: 'action-critical',
        title: isId ? 'Sorot Jalur Kritis (Critical Path)' : 'Toggle Critical Path Highlighting',
        category: 'Actions',
        icon: <Zap className="w-4 h-4 text-status-critical" />,
        action: onToggleCriticalPath,
      },
      {
        id: 'action-simulation',
        title: isId ? 'Mulai Simulasi What-If Risiko Keterlambatan' : 'Toggle What-If Slippage Simulation',
        category: 'Actions',
        icon: <SlidersHorizontal className="w-4 h-4 text-amber-400" />,
        action: onToggleSimulation,
      },
      {
        id: 'action-shift-plus',
        title: isId ? 'Geser Semua Tanggal +1 Hari' : 'Shift All Tasks +1 Day',
        category: 'Actions',
        icon: <CalendarPlus className="w-4 h-4 text-emerald-400" />,
        action: () => onShiftDates(1),
      },
      {
        id: 'action-shift-minus',
        title: isId ? 'Geser Semua Tanggal -1 Hari' : 'Shift All Tasks -1 Day',
        category: 'Actions',
        icon: <CalendarMinus className="w-4 h-4 text-on-surface-variant" />,
        action: () => onShiftDates(-1),
      },
      {
        id: 'action-export-csv',
        title: isId ? 'Ekspor Timeline ke CSV' : 'Export Timeline as CSV',
        category: 'Actions',
        icon: <FileSpreadsheet className="w-4 h-4 text-primary" />,
        action: onExportCSV,
      },
      {
        id: 'action-export-png',
        title: isId ? 'Unduh Gambar Gantt (PNG)' : 'Download Gantt as PNG Image',
        category: 'Actions',
        icon: <Download className="w-4 h-4 text-primary" />,
        action: onExportPNG,
      },
    ]

    // Tasks search entries
    tasks.forEach(t => {
      list.push({
        id: `task-${t.id}`,
        title: `${t.name} (${t.durationDays}d · ${t.assignee || (isId ? 'Tanpa PIC' : 'Unassigned')})`,
        category: 'Tasks',
        icon: (
          <span className="text-xs font-mono text-primary font-bold">
            {t.isMilestone ? '◆' : t.isCritical ? '⚡' : '#'}
          </span>
        ),
        shortcut: t.start,
        action: () => onSelectTask(t.id),
      })
    })

    return list
  }, [
    isId,
    tasks,
    onSelectView,
    onToggleCriticalPath,
    onToggleSimulation,
    onShiftDates,
    onExportCSV,
    onExportPNG,
    onSelectTask,
  ])

  // Filter items by search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      item => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    )
  }, [items, query])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1 < filtered.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action()
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-container-low border border-border-dark rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-dark bg-surface-container-lowest">
          <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isId
                ? 'Ketik perintah atau cari tugas... (Gunakan ↑ ↓ dan Enter)'
                : 'Type a command or search tasks... (Use ↑ ↓ and Enter)'
            }
            className="flex-1 bg-transparent text-sm text-on-surface placeholder-on-surface-variant/60 outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-container border border-border-dark text-on-surface-variant">
            Esc
          </kbd>
        </div>

        {/* Filtered List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">
              {isId ? 'Tidak ada perintah atau tugas yang cocok' : 'No matching commands or tasks found'}
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5" role="listbox">
              {filtered.map((item, idx) => {
                const isSelected = idx === selectedIndex

                return (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      item.action()
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0 flex items-center justify-center">
                        {item.icon}
                      </div>
                      <span className="truncate">{item.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-mono tracking-wider opacity-60 text-on-surface-variant">
                        {item.category}
                      </span>
                      {item.shortcut && (
                        <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-surface-container text-on-surface-variant">
                          {item.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <CornerDownLeft className="w-3 h-3 text-primary shrink-0 opacity-80" />
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-surface-container-lowest border-t border-border-dark text-[11px] text-on-surface-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>↑↓ {isId ? 'Navigasi' : 'Navigate'}</span>
            <span>↵ {isId ? 'Pilih' : 'Select'}</span>
            <span>Esc {isId ? 'Tutup' : 'Close'}</span>
          </div>
          <span className="font-mono text-[10px]">Cmd+K / Ctrl+K</span>
        </div>
      </div>
    </div>
  )
}
