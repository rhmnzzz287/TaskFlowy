'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { LogOut, User } from 'lucide-react'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[12px] font-semibold hover:bg-primary/30 transition-colors">
        {user.name.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-48 bg-surface border border-border rounded-lg shadow-xl z-50 py-1">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-text-primary text-[13px] font-medium truncate">{user.name}</p>
            <p className="text-muted text-[11px] truncate">{user.email}</p>
          </div>
          <button onClick={() => { logout(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-muted hover:text-error hover:bg-error/5 transition-colors">
            <LogOut size={14} /> Keluar
          </button>
        </div>
      )}
    </div>
  )
}