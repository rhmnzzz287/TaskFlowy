'use client'

import React, { useState, useRef } from 'react'
import { UserProfile, AVATAR_PRESETS, generateBackupData, validateAndRestoreBackup } from '@/lib/profile-store'
import type { WorkspaceMetrics } from '@/lib/workspace-aggregator'
import { Download, Upload, Check, AlertCircle, Edit2, ShieldCheck, FolderKanban, CheckSquare, Clock } from 'lucide-react'

interface ProfileCardProps {
  profile: UserProfile
  metrics: WorkspaceMetrics
  onProfileChange: (updates: Partial<UserProfile>) => void
  onDataRestored: () => void
}

export function ProfileCard({ profile, metrics, onProfileChange, onDataRestored }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [role, setRole] = useState(profile.role)
  const [defaultAssignee, setDefaultAssignee] = useState(profile.defaultAssignee)
  const [selectedEmoji, setSelectedEmoji] = useState(profile.avatarEmoji)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    onProfileChange({
      name: name.trim() || 'Pengguna TaskFlowy',
      role: role.trim() || 'Project Manager',
      defaultAssignee: defaultAssignee.trim() || name.trim(),
      avatarEmoji: selectedEmoji,
    })
    setIsEditing(false)
    setFeedbackMsg({ type: 'success', text: 'Profil berhasil diperbarui!' })
    setTimeout(() => setFeedbackMsg(null), 3000)
  }

  const handleDownloadBackup = () => {
    const jsonStr = generateBackupData()
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `taskflowy-backup-${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
    setFeedbackMsg({ type: 'success', text: 'Pencadangan data JSON berhasil diunduh!' })
    setTimeout(() => setFeedbackMsg(null), 3000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const result = validateAndRestoreBackup(content)
      if (result.success) {
        setFeedbackMsg({ type: 'success', text: 'Data berhasil dipulihkan dari backup!' })
        onDataRestored()
      } else {
        setFeedbackMsg({ type: 'error', text: result.error || 'Gagal memulihkan backup.' })
      }
      setTimeout(() => setFeedbackMsg(null), 4000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-5 p-5 bg-surface border border-border rounded-xl shadow-sm text-text-primary">
      {/* Header Info */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-surface-hi border-2 border-primary/40 flex items-center justify-center text-2xl shadow-inner select-none">
            {profile.avatarEmoji}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate leading-tight">{profile.name}</h2>
          <p className="text-xs text-muted truncate mt-0.5">{profile.role}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
              PIC: {profile.defaultAssignee}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(v => !v)}
          className="p-1.5 rounded-lg border border-border hover:bg-surface-hi text-muted hover:text-text-primary transition-colors"
          title="Edit Profil"
        >
          <Edit2 size={13} />
        </button>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 p-3.5 bg-surface-hi/50 rounded-lg border border-border/80 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Avatar Preset</label>
            <div className="flex gap-1.5 flex-wrap">
              {AVATAR_PRESETS.map(emoji => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-transform ${
                    selectedEmoji === emoji ? 'bg-primary/20 border border-primary scale-110' : 'hover:bg-surface-hi'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-0.5">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-surface border border-border text-xs focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-0.5">Role / Jabatan</label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-surface border border-border text-xs focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-0.5">
              Nama di Kolom Assignee (PIC)
              <span className="block text-[10px] text-muted font-normal">Digunakan untuk auto-filter tugas Anda di seluruh linimasa.</span>
            </label>
            <input
              type="text"
              value={defaultAssignee}
              onChange={e => setDefaultAssignee(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-surface border border-border text-xs focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 rounded border border-border text-muted hover:text-text-primary"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary text-xs px-3 py-1"
            >
              Simpan
            </button>
          </div>
        </form>
      )}

      {/* 3 Live Metric Badges */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-surface-hi/40 rounded-lg border border-border flex flex-col items-center justify-center text-center">
          <FolderKanban size={15} className="text-primary mb-1" />
          <span className="text-lg font-bold leading-tight">{metrics.totalProjects}</span>
          <span className="text-[10px] text-muted leading-tight mt-0.5">Proyek</span>
        </div>

        <div className="p-3 bg-surface-hi/40 rounded-lg border border-border flex flex-col items-center justify-center text-center">
          <CheckSquare size={15} className="text-emerald-500 mb-1" />
          <span className="text-lg font-bold leading-tight">{metrics.myActiveTasksCount}</span>
          <span className="text-[10px] text-muted leading-tight mt-0.5">Tugas Saya</span>
        </div>

        <div className="p-3 bg-surface-hi/40 rounded-lg border border-border flex flex-col items-center justify-center text-center">
          <Clock size={15} className={`mb-1 ${metrics.urgentTasksCount > 0 ? 'text-amber-500' : 'text-muted'}`} />
          <span className={`text-lg font-bold leading-tight ${metrics.urgentTasksCount > 0 ? 'text-amber-500' : ''}`}>
            {metrics.urgentTasksCount}
          </span>
          <span className="text-[10px] text-muted leading-tight mt-0.5">Mendesak (&le;3h)</span>
        </div>
      </div>

      {/* Safety & Backup Controls */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-2 font-medium">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Keamanan Data Browser</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="btn-secondary text-xs py-1.5 px-2 flex items-center justify-center gap-1.5"
            title="Download cadangan semua proyek dan profil"
          >
            <Download size={12} />
            <span>Backup JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-xs py-1.5 px-2 flex items-center justify-center gap-1.5"
            title="Pulihkan data dari file cadangan JSON"
          >
            <Upload size={12} />
            <span>Restore JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-2 p-2.5 rounded-lg text-xs transition-opacity ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}
        >
          {feedbackMsg.type === 'success' ? <Check size={13} /> : <AlertCircle size={13} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}
    </div>
  )
}