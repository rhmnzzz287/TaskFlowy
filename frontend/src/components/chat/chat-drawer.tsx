'use client'

import { useState, useEffect } from 'react'
import { useProjectWorkspace } from '@/contexts/project-context'
import { ChatMessageList } from './chat-message-list'
import { ChatInput } from './chat-input'
import { InviteMemberModal } from '../collaboration/invite-member-modal'
import { X, MessageCircle, UserPlus, Users } from 'lucide-react'

export function ChatDrawer() {
  const { activeProject, messages, sendMessage } = useProjectWorkspace()
  const [open, setOpen] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Auto-open when project selected
  useEffect(() => { if (activeProject) setOpen(true); else setOpen(false) }, [activeProject])

  if (!activeProject) return null

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-4 right-4 z-40 w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          open ? 'bg-surface border border-border' : 'bg-primary text-white hover:bg-primary-hover'
        }`}
        title={open ? 'Tutup chat' : 'Buka chat'}
      >
        {open ? <X size={18} /> : <MessageCircle size={20} />}
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed bottom-16 right-4 z-30 w-[360px] h-[480px] bg-surface border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-11 shrink-0 bg-surface flex items-center justify-between px-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle size={15} className="text-primary" />
              <span className="text-text-primary text-[13px] font-semibold">Chat Tim</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowInvite(true)}
                className="p-1 rounded text-muted hover:text-text-primary hover:bg-surface-hi/40" title="Undang anggota">
                <UserPlus size={14} />
              </button>
              <span className="flex items-center gap-1 text-muted text-[11px]">
                <Users size={13} /> {activeProject.members.length}
              </span>
            </div>
          </div>

          {/* Messages */}
          <ChatMessageList messages={messages} />

          {/* Input */}
          <ChatInput onSend={sendMessage} />
        </div>
      )}

      <InviteMemberModal open={showInvite} onClose={() => setShowInvite(false)} />
    </>
  )
}