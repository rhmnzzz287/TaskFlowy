'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { loginSchema } from '@/lib/validation/client-schemas'
import { LogIn, UserCheck } from 'lucide-react'
import Link from 'next/link'

export function LoginForm() {
  const { login, loginAsDemo, demoUsers, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      parsed.error.errors.forEach(err => { errs[err.path[0] as string] = err.message })
      setFieldErrors(errs)
      return
    }
    try { await login(parsed.data) } catch {}
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="login-email">Email</label>
          <input id="login-email" type="email" className={`cell-input ${fieldErrors.email ? 'ring-1 ring-error' : ''}`}
            placeholder="owner@taskflowy.dev" value={email} onChange={e => setEmail(e.target.value)} />
          {fieldErrors.email && <span className="text-error text-[11px]">{fieldErrors.email}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="login-password">Password</label>
          <input id="login-password" type="password" className={`cell-input ${fieldErrors.password ? 'ring-1 ring-error' : ''}`}
            placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
          {fieldErrors.password && <span className="text-error text-[11px]">{fieldErrors.password}</span>}
        </div>
        {error && <div className="bg-error/10 border border-error/30 rounded px-3 py-2 text-error text-[12px]">{error}</div>}
        <button type="submit" disabled={isLoading}
          className="btn-primary justify-center text-[14px] py-2">
          {isLoading ? 'Memproses…' : <><LogIn size={15} /> Masuk</>}
        </button>
      </form>

      <div className="mt-6">
        <p className="text-muted text-[12px] text-center mb-3">— atau masuk sebagai demo —</p>
        <div className="flex flex-col gap-2">
          {demoUsers.map(u => (
            <button key={u.id} onClick={() => loginAsDemo(u.email)}
              className="btn-secondary justify-center text-[13px] py-2">
              <UserCheck size={14} /> {u.name}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-muted text-[12px] mt-6">
        Belum punya akun?{' '}
        <Link href="/register" className="text-primary hover:text-primary-hover font-medium">Daftar</Link>
      </p>
    </div>
  )
}