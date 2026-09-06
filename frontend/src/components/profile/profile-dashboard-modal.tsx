'use client'

import React, { useState } from 'react'
import { X, FolderKanban, CheckSquare } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'
import { ProfileCard } from './profile-card'
import { ProjectsTab } from './projects-tab'
import { MyTasksTab } from './my-tasks-tab'

interface ProfileDashboardModalProps {
  isOpen: boolean
  currentDraftId: string | null
  onClose: () => void
  onOpenProject: (id: string) => void
  onSelectTask: (projectId: string, taskName: string) => void
  onDeleteProject: (id: string) => void
}

export function ProfileDashboardModal({
  isOpen,
  currentDraftId,
  onClose,
  onOpenProject,
  onSelectTask,
  onDeleteProject,
}: ProfileDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects')
  const { profile, updateProfile, drafts, myTasks, metrics, refreshData } = useWorkspace()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hi/20">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Workspace & Profil Pengguna</h2>
            <p className="text-xs text-muted">Pusat kendali linimasa pribadi dan pemantauan tugas aktif.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-hi text-muted hover:text-text-primary transition-colors"
            aria-label="Tutup Dashboard"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content: 2-Column Split Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Kolom Kiri: Profil & Kontrol (md: col-span-5) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <ProfileCard
              profile={profile}
              metrics={metrics}
              onProfileChange={updateProfile}
              onDataRestored={() => {
                refreshData()
              }}
            />
          </div>

          {/* Kolom Kanan: Tabbed Views (md: col-span-7) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {/* Tabs Header */}
            <div className="flex items-center gap-2 p-1 bg-surface-hi/40 border border-border rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'projects'
                    ? 'bg-surface text-primary shadow-sm border border-border/80'
                    : 'text-muted hover:text-text-primary'
                }`}
              >
                <FolderKanban size={14} />
                <span>Linimasa Saya ({drafts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-surface text-primary shadow-sm border border-border/80'
                    : 'text-muted hover:text-text-primary'
                }`}
              >
                <CheckSquare size={14} />
                <span>Tugas Saya ({myTasks.length})</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === 'projects' ? (
                <ProjectsTab
                  drafts={drafts}
                  currentDraftId={currentDraftId}
                  onOpenProject={(id) => {
                    onOpenProject(id)
                    onClose()
                  }}
                  onDeleteProject={(id) => {
                    onDeleteProject(id)
                    refreshData()
                  }}
                />
              ) : (
                <MyTasksTab
                  tasks={myTasks}
                  onSelectTask={(projectId, taskName) => {
                    onSelectTask(projectId, taskName)
                    onClose()
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}