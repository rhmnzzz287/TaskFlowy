'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { registerSchema } from '@/lib/validation/client-schemas'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'

export function RegisterForm() {
  const { register, isLoading, error } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const parsed = registerSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      parsed.error.errors.forEach(err => { errs[err.path[0] as string] = err.message })
      setFieldErrors(errs)
      return
    }
    try { await register(parsed.data) } catch {}
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="reg-name">Nama</label>
          <input id="reg-name" className={`cell-input ${fieldErrors.name ? 'ring-1 ring-error' : ''}`}
            placeholder="Nama lengkap" value={name} onChange={e => setName(e.target.value)} />
          {fieldErrors.name && <span className="text-error text-[11px]">{fieldErrors.name}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" className={`cell-input ${fieldErrors.email ? 'ring-1 ring-error' : ''}`}
            placeholder="email@domain.com" value={email} onChange={e => setEmail(e.target.value)} />
          {fieldErrors.email && <span className="text-error text-[11px]">{fieldErrors.email}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="reg-password">Password (min. 6)</label>
          <input id="reg-password" type="password" className={`cell-input ${fieldErrors.password ? 'ring-1 ring-error' : ''}`}
            placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
          {fieldErrors.password && <span className="text-error text-[11px]">{fieldErrors.password}</span>}
        </div>
        {error && <div className="bg-error/10 border border-error/30 rounded px-3 py-2 text-error text-[12px]">{error}</div>}
        <button type="submit" disabled={isLoading}
          className="btn-primary justify-center text-[14px] py-2">
          {isLoading ? 'Memproses…' : <><UserPlus size={15} /> Daftar</>}
        </button>
      </form>
      <p className="text-center text-muted text-[12px] mt-6">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-primary hover:text-primary-hover font-medium">Masuk</Link>
      </p>
    </div>
  )
}