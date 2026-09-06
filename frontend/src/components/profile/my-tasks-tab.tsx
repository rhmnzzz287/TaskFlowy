'use client'

import React from 'react'
import { CheckSquare, Calendar, AlertTriangle, ArrowUpRight } from 'lucide-react'
import type { AggregatedTask } from '@/lib/workspace-aggregator'

interface MyTasksTabProps {
  tasks: AggregatedTask[]
  onSelectTask: (projectId: string, taskName: string) => void
}

export function MyTasksTab({ tasks, onSelectTask }: MyTasksTabProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl bg-surface-hi/20">
        <CheckSquare size={36} className="text-muted/60 mb-2.5" />
        <h3 className="text-sm font-medium text-text-primary">Tidak ada tugas aktif yang di-assign</h3>
        <p className="text-xs text-muted max-w-sm mt-1">
          Pastikan nama pada kolom Assignee di tabel linimasa cocok dengan nama profil atau PIC Anda.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {tasks.map((task) => (
        <div
          key={`${task.projectId}-${task.rowId}`}
          className={`flex items-center justify-between p-3 bg-surface border rounded-xl transition-all ${
            task.isUrgent
              ? 'border-amber-500/40 bg-amber-500/5'
              : task.isOverdue
              ? 'border-rose-500/40 bg-rose-500/5'
              : 'border-border hover:border-border/80'
          }`}
        >
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary truncate">{task.taskName}</span>
              {task.isOverdue ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 font-medium flex items-center gap-1">
                  <AlertTriangle size={10} /> Terlewat
                </span>
              ) : task.isUrgent ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium flex items-center gap-1">
                  <AlertTriangle size={10} /> Segera Selesai
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted mt-1 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-surface-hi text-text-primary font-medium text-[10px]">
                {task.projectName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {task.startDate} s/d {task.endDate} ({task.durationDays} hari)
              </span>
              <span>• Progres: {task.progress}%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTask(task.projectId, task.taskName)}
            className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
            title="Buka proyek dan lihat tugas ini di Gantt chart"
          >
            <span>Lihat</span>
            <ArrowUpRight size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}