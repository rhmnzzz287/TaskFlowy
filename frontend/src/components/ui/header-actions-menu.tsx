'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MoreHorizontal, Image as ImageIcon, ImageDown, FileSpreadsheet, Printer, FileText,
  Copy, Check, Trash2, CalendarClock, Share2,
} from 'lucide-react'
import { exportGanttPNG, exportGanttSVG } from '@/lib/visual-exporter'
import { tasksToCSV, downloadCSV } from '@/lib/csv-export'
import { generateChatSummary } from '@/lib/format/text-summary'
import { encodeRowsToHash, pushHash } from '@/lib/url-state'
import { todayRef } from '@/lib/schema'
import type { TimelineTask, ParseRowState } from '@/lib/schema'
import type { DraftMeta } from '@/hooks/use-drafts'
import { useTranslation } from '@/lib/i18n/context'

interface HeaderActionsMenuProps {
  hasGenerated: boolean
  view: string
  tasks: TimelineTask[]
  inputRows: ParseRowState[]
  drafts: DraftMeta[]
  currentDraftId: string | null
  onRestoreDraft: (id: string) => void
  onDeleteDraft: (id: string) => void
  onShift: (delta: number) => void
  /** Called when the menu transitions closed → open (e.g. refresh draft list). */
  onMenuOpen?: () => void
  /** Surface non-blocking feedback (clipboard/export failures) in the shell toast. */
  onNotify?: (message: string) => void
}

const SHIFT_OPTIONS: Array<{ label: string; delta: number }> = [
  { label: '+1 hari', delta: 1 },
  { label: '+3 hari', delta: 3 },
  { label: '+1 mgg', delta: 7 },
  { label: '-1 hari', delta: -1 },
  { label: '-3 hari', delta: -3 },
  { label: '-1 mgg', delta: -7 },
]

export function HeaderActionsMenu({
  hasGenerated, view, tasks, inputRows, drafts, currentDraftId,
  onRestoreDraft, onDeleteDraft, onShift, onMenuOpen, onNotify,
}: HeaderActionsMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [showDrafts, setShowDrafts] = useState(false)
  const [showShift, setShowShift] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Click outside closes the menu.
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [])

  const close = () => { setOpen(false); setShowDrafts(false); setShowShift(false) }

  // Clipboard API throws on insecure contexts / denied permissions — never
  // leave the promise unhandled (unhandledrejection) and always offer a
  // selectable fallback so the user can copy manually.
  const copyText = useCallback(async (text: string, onOk: () => void, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      onOk()
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        onOk()
      } catch {
        window.prompt(`Copy your ${what} manually:`, text)
        onNotify?.(`Couldn't access the clipboard — copy your ${what} from the dialog.`)
      }
    }
  }, [onNotify])

  const handleShareLink = useCallback(() => {
    const hash = encodeRowsToHash(inputRows)
    pushHash(hash)
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    void copyText(url, () => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }, 'share link')
  }, [inputRows, copyText])

  const handleCopySummary = useCallback(() => {
    if (tasks.length === 0) return
    const text = generateChatSummary(tasks, 'Timeline Proyek')
    void copyText(text, () => {
      setCopiedSummary(true)
      setTimeout(() => setCopiedSummary(false), 2000)
    }, 'summary')
  }, [tasks, copyText])

  const handleExportCSV = useCallback(() => {
    if (tasks.length === 0) return
    const csv = tasksToCSV(tasks)
    const stamp = todayRef().replace(/-/g, '')
    downloadCSV(`taskflowy-tasks-${stamp}.csv`, csv)
  }, [tasks])

  const runExport = (fn: () => Promise<void>) => {
    // Non-blocking toast instead of alert(): never trap the user in a modal
    // for a recoverable export failure.
    fn().catch(() => onNotify?.('Export gagal: chart belum siap. Tunggu chart selesai render lalu coba lagi.'))
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        className="btn-secondary text-[11px] h-7 gap-1 px-2"
        onClick={() => { if (!open) onMenuOpen?.(); setOpen(!open) }}
        title="Menu aksi (export, share, draf)"
        aria-label="Menu aksi"
      >
        <MoreHorizontal size={14} />
        <span className="hidden sm:inline">Menu</span>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-64 bg-surface border border-border rounded-lg shadow-xl py-1 max-h-[70vh] overflow-y-auto">
          {/* Draft history */}
          {hasGenerated && (
            <>
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-text-primary hover:bg-surface-hi/40"
                onClick={() => setShowDrafts(s => !s)}
              >
                <span className="flex items-center gap-2"><FileText size={13} /> Draft ({drafts.length})</span>
                <span className="text-muted text-[10px]">{showDrafts ? '▲' : '▼'}</span>
              </button>
              {showDrafts && (
                <div className="px-1 pb-1">
                  <p className="label px-2 py-1">5 draf terakhir (autosave)</p>
                  {drafts.length === 0 && <p className="text-muted text-[12px] px-2 py-1.5">Belum ada draf.</p>}
                  {drafts.map(d => (
                    <div key={d.id} className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-hi/40 ${d.id === currentDraftId ? 'bg-primary/10' : ''}`}>
                      <button className="flex-1 text-left min-w-0" onClick={() => { onRestoreDraft(d.id); close() }}>
                        <span className="block text-[12px] text-text-primary truncate">{d.name}</span>
                        <span className="block text-[10px] text-muted">{d.taskCount} task · {new Date(d.savedAt).toLocaleTimeString('id-ID', { hour12: false })}</span>
                      </button>
                      <button className="text-muted hover:text-error p-1" onClick={() => onDeleteDraft(d.id)} aria-label={`Hapus draf ${d.name}`}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border my-1" />
            </>
          )}

          {/* Export */}
          {hasGenerated && (
            <>
              {view === 'gantt' && (
                <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-hi/40"
                  onClick={() => { runExport(exportGanttPNG); close() }} title="Export PNG">
                  <ImageIcon size={13} /> {t.workbench.exportPng}
                </button>
              )}
              {view === 'gantt' && (
                <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-hi/40"
                  onClick={() => { runExport(exportGanttSVG); close() }} title="Export SVG">
                  <ImageDown size={13} /> {t.workbench.exportSvg}
                </button>
              )}
              <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-hi/40"
                onClick={() => { handleExportCSV(); close() }} title="Export CSV (Excel / Google Sheets)">
                <FileSpreadsheet size={13} /> {t.workbench.exportCsv}
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-hi/40"
                onClick={() => { window.print(); close() }} title="Print / PDF (A4 landscape)">
                <Printer size={13} /> {t.workbench.printPdf}
              </button>
              <div className="border-t border-border my-1" />
            </>
          )}

          {/* Shift dates */}
          {hasGenerated && (
            <>
              <button className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-text-primary hover:bg-surface-hi/40"
                onClick={() => setShowShift(s => !s)}>
                <span className="flex items-center gap-2"><CalendarClock size={13} /> {t.workbench.bulkShift}</span>
                <span className="text-muted text-[10px]">{showShift ? '▲' : '▼'}</span>
              </button>
              {showShift && (
                <div className="px-1 pb-1 grid grid-cols-3 gap-1">
                  {SHIFT_OPTIONS.map(o => (
                    <button key={o.label}
                      className="p-1 rounded bg-surface-hi hover:bg-surface-hi/80 text-center text-[11px] font-medium"
                      onClick={() => { onShift(o.delta); close() }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
              {hasGenerated && <div className="border-t border-border my-1" />}
            </>
          )}

          {/* Copy summary + share (always visible, enabled when generated) */}
          <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-hi/40 disabled:opacity-40"
            onClick={() => { handleCopySummary(); close() }} disabled={!hasGenerated || tasks.length === 0}>
            {copiedSummary ? <Check size={13} className="text-completed" /> : <FileText size={13} />}
            {copiedSummary ? t.workbench.copied : t.workbench.copySummary}
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-hi/40"
            onClick={() => { handleShareLink(); close() }}>
            {copiedLink ? <Check size={13} className="text-completed" /> : <Share2 size={13} />}
            {copiedLink ? t.workbench.sharedSuccess : t.workbench.shareLink}
          </button>
        </div>
      )}
    </div>
  )
}