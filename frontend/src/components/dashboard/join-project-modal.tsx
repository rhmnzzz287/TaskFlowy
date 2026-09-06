'use client'

import { useState, useEffect } from 'react'
import { useProjectWorkspace } from '@/contexts/project-context'
import { joinCodeSchema } from '@/lib/validation/client-schemas'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function JoinProjectModal({ open, onClose }: Props) {
  const { joinProject } = useProjectWorkspace()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) { window.addEventListener('keydown', onKey); setCode(''); setError('') }
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const parsed = joinCodeSchema.safeParse({ code })
    if (!parsed.success) { setError(parsed.error.errors[0]?.message || 'Kode tidak valid'); return }
    setSubmitting(true)
    try {
      await joinProject(parsed.data)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Gagal bergabung')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-primary text-[16px] font-semibold">Gabung Proyek</h3>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-text-primary hover:bg-surface-hi/40" aria-label="Tutup"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="label">Kode Undangan</label>
            <input className={`cell-input font-mono tracking-widest text-center ${error ? 'ring-1 ring-error' : ''}`}
              placeholder="ABCD-1234" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={9} />
            {error && <span className="text-error text-[11px] text-center">{error}</span>}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Memproses…' : 'Gabung'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}