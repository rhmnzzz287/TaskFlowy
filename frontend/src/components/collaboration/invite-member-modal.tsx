'use client'

import { useState, useEffect } from 'react'
import { useProjectWorkspace } from '@/contexts/project-context'
import { useAuth } from '@/contexts/auth-context'
import { inviteEmailSchema } from '@/lib/validation/client-schemas'
import { X, Copy, UserPlus, Check } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function InviteMemberModal({ open, onClose }: Props) {
  const { activeProject, inviteMember } = useProjectWorkspace()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) { window.addEventListener('keydown', onKey); setError(''); setSuccess(''); setCopied(false) }
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !activeProject) return null

  const inviteLink = `${window.location.origin}/join/${activeProject.inviteCode.replace('-', '').toLowerCase()}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    const parsed = inviteEmailSchema.safeParse({ email })
    if (!parsed.success) { setError(parsed.error.errors[0]?.message || 'Email tidak valid'); return }
    setSubmitting(true)
    try {
      await inviteMember({ email: parsed.data.email, projectId: activeProject.id })
      setSuccess(`${parsed.data.email} berhasil diundang`)
      setEmail('')
    } catch (err: any) {
      setError(err.message || 'Gagal mengundang')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-primary text-[16px] font-semibold">Undang Anggota — {activeProject.name}</h3>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-text-primary hover:bg-surface-hi/40" aria-label="Tutup"><X size={16} /></button>
        </div>

        {/* Shareable link */}
        <div className="mb-5">
          <p className="label mb-2">Link Undangan</p>
          <div className="flex items-center gap-2">
            <input readOnly value={inviteLink} className="cell-input flex-1 text-[12px] font-mono" onFocus={e => e.target.select()} />
            <button onClick={copyLink} className="btn-secondary shrink-0" title="Salin link">
              {copied ? <Check size={14} className="text-completed" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="mt-2 text-muted text-[12px]">Kode: <span className="font-mono text-text-primary">{activeProject.inviteCode}</span></p>
        </div>

        {/* Invite by email */}
        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="label">Undang berdasarkan Email</label>
            <input type="email" className={`cell-input ${error ? 'ring-1 ring-error' : ''}`} placeholder="rekan@domain.com"
              value={email} onChange={e => setEmail(e.target.value)} />
            {error && <span className="text-error text-[11px]">{error}</span>}
            {success && <span className="text-completed text-[11px]">{success}</span>}
          </div>
          <button type="submit" disabled={submitting} className="btn-primary justify-center">
            <UserPlus size={14} /> {submitting ? 'Mengundang…' : 'Kirim Undangan'}
          </button>
        </form>
      </div>
    </div>
  )
}