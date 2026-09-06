import type { IAuthService } from './types'
import type { User, LoginDTO, RegisterDTO } from '@/types/auth'
import { getUsers, saveUser } from './mock-storage'
import { demoUsers } from './seed-data'

const SESSION_KEY = 'taskflowy_session'

function setSession(user: User) {
  const session = { user, token: crypto.randomUUID(), expiresAt: Date.now() + 86400000 }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
  return session
}

export const authService: IAuthService = {
  async login(dto: LoginDTO) {
    await new Promise(r => setTimeout(r, 200))
    const users = getUsers()
    const user = users.find(u => u.email === dto.email)
    if (!user) throw new Error('Email atau password salah')
    setSession(user)
    return user
  },

  async register(dto: RegisterDTO) {
    await new Promise(r => setTimeout(r, 200))
    const existing = getUsers().find(u => u.email === dto.email)
    if (existing) throw new Error('Email sudah terdaftar')
    const user: User = {
      id: `u-${crypto.randomUUID().slice(0, 8)}`,
      email: dto.email,
      name: dto.name,
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    }
    saveUser(user)
    setSession(user)
    return user
  },

  async logout() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY)
    }
  },

  async getCurrentUser() {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const { user } = JSON.parse(raw)
      return user as User
    } catch {
      return null
    }
  },
}

export function getDemoUsers(): User[] {
  return demoUsers
}