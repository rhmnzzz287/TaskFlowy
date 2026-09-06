'use client'

import React from 'react'
import { FolderKanban, ArrowRight, Trash2, Calendar, CheckCircle2 } from 'lucide-react'
import type { DraftMeta } from '@/hooks/use-drafts'

interface ProjectsTabProps {
  drafts: DraftMeta[]
  currentDraftId: string | null
  onOpenProject: (id: string) => void
  onDeleteProject: (id: string) => void
}

export function ProjectsTab({ drafts, currentDraftId, onOpenProject, onDeleteProject }: ProjectsTabProps) {
  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl bg-surface-hi/20">
        <FolderKanban size={36} className="text-muted/60 mb-2.5" />
        <h3 className="text-sm font-medium text-text-primary">Belum ada linimasa tersimpan</h3>
        <p className="text-xs text-muted max-w-sm mt-1">
          Buat linimasa di workbench dan simpan draf agar otomatis muncul di sini.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft) => {
        const isCurrent = draft.id === currentDraftId
        const savedDate = new Date(draft.savedAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <div
            key={draft.id}
            className={`flex items-center justify-between p-3.5 bg-surface border rounded-xl transition-all ${
              isCurrent ? 'border-primary/50 shadow-sm bg-primary/5' : 'border-border hover:border-border/80'
            }`}
          >
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-text-primary truncate">{draft.name}</h4>
                {isCurrent && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium flex items-center gap-1">
                    <CheckCircle2 size={10} /> Aktif di Editor
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted mt-1">
                <span>{draft.taskCount} tugas</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> {savedDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenProject(draft.id)}
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                <span>Buka</span>
                <ArrowRight size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Hapus linimasa "${draft.name}"?`)) {
                    onDeleteProject(draft.id)
                  }
                }}
                className="p-1.5 rounded-lg border border-border text-muted hover:text-rose-500 hover:border-rose-500/30 transition-colors"
                title="Hapus Proyek"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}