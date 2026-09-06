'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useProjectWorkspace } from '@/contexts/project-context'
import { UserMenu } from './user-menu'
import { CreateProjectModal } from '../dashboard/create-project-modal'
import { JoinProjectModal } from '../dashboard/join-project-modal'
import { Plus, LogIn, LayoutDashboard, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  onToggleChat?: () => void
}

export function WorkspaceHeader({ onToggleChat }: Props) {
  const { user } = useAuth()
  const { activeProject } = useProjectWorkspace()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  return (
    <>
      <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-text-primary no-underline">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-white font-bold text-xs">TF</div>
            <span className="font-semibold text-[15px]">TaskFlowy</span>
          </Link>
          <span className="text-muted">/</span>
          {activeProject ? (
            <span className="text-text-primary text-[14px] font-medium truncate max-w-[200px]">{activeProject.name}</span>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-1 text-muted hover:text-text-primary text-[13px]">
              <LayoutDashboard size={14} /> Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button className="btn-secondary text-[12px]" onClick={() => setShowCreate(true)}>
                <Plus size={13} /> Proyek Baru
              </button>
              <button className="btn-secondary text-[12px]" onClick={() => setShowJoin(true)}>
                <LogIn size={13} /> Gabung
              </button>
              {onToggleChat && (
                <button className="p-1.5 rounded text-muted hover:text-text-primary hover:bg-surface-hi/40" onClick={onToggleChat} title="Chat">
                  <MessageCircle size={16} />
                </button>
              )}
              <UserMenu />
            </>
          ) : (
            <Link href="/login" className="btn-primary text-[12px]">
              <LogIn size={13} /> Masuk
            </Link>
          )}
        </div>
      </header>
      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
      <JoinProjectModal open={showJoin} onClose={() => setShowJoin(false)} />
    </>
  )
}