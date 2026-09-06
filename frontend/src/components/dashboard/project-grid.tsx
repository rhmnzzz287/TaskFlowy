'use client'

import Link from 'next/link'
import type { Project } from '@/types/project'
import { FolderKanban, Users, Crown } from 'lucide-react'

interface Props {
  projects: Project[]
  currentUserId: string
}

export function ProjectGrid({ projects, currentUserId }: Props) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FolderKanban size={40} className="text-muted mb-4" />
        <p className="text-text-primary text-[15px] font-medium">Belum ada proyek</p>
        <p className="text-muted text-[13px] mt-1">Buat proyek baru atau gabung dengan kode undangan.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map(p => {
        const role = p.members.find(m => m.userId === currentUserId)?.role || 'member'
        return (
          <Link key={p.id} href={`/projects/${p.id}`}
            className="group bg-surface border border-border rounded-lg p-4 hover:border-primary/50 hover:bg-surface-hi/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded bg-primary/15 flex items-center justify-center">
                <FolderKanban size={18} className="text-primary" />
              </div>
              {role === 'owner' && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[11px] font-medium">
                  <Crown size={11} /> Owner
                </span>
              )}
            </div>
            <h3 className="text-text-primary text-[14px] font-semibold group-hover:text-primary transition-colors">{p.name}</h3>
            {p.description && <p className="text-muted text-[12px] mt-1 line-clamp-2">{p.description}</p>}
            <div className="flex items-center gap-3 mt-4 text-muted text-[12px]">
              <span className="flex items-center gap-1"><Users size={13} /> {p.members.length} member</span>
              <span className="font-mono text-[11px]">{p.inviteCode}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}