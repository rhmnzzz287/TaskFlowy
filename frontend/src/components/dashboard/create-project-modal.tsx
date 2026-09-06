'use client'

import { useState, useEffect } from 'react'
import { useProjectWorkspace } from '@/contexts/project-context'
import { createProjectSchema } from '@/lib/validation/client-schemas'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateProjectModal({ open, onClose }: Props) {
  const { createProject } = useProjectWorkspace()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) {
      window.addEventListener('keydown', onKey)
      setName(''); setDescription(''); setFieldError(''); setServerError('')
    }
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(''); setServerError('')
    const parsed = createProjectSchema.safeParse({ name, description })
    if (!parsed.success) { setFieldError(parsed.error.errors[0]?.message || 'Input tidak valid'); return }
    setSubmitting(true)
    try {
      await createProject(parsed.data)
      onClose()
    } catch (err: any) {
      setServerError(err.message || 'Gagal membuat proyek')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-primary text-[16px] font-semibold">Buat Proyek Baru</h3>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-text-primary hover:bg-surface-hi/40" aria-label="Tutup"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="label">Nama Proyek</label>
            <input className={`cell-input ${fieldError ? 'ring-1 ring-error' : ''}`} placeholder="Mis. MVP Launch"
              value={name} onChange={e => setName(e.target.value)} />
            {fieldError && <span className="text-error text-[11px]">{fieldError}</span>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Deskripsi (opsional)</label>
            <textarea className="cell-input resize-none" rows={3} placeholder="Apa tujuan proyek ini?"
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {serverError && <div className="bg-error/10 border border-error/30 rounded px-3 py-2 text-error text-[12px]">{serverError}</div>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Membuat…' : 'Buat Proyek'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}