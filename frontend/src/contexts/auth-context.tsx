'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User, LoginDTO, RegisterDTO } from '@/types/auth'
import { authService, getDemoUsers } from '@/lib/services'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (dto: LoginDTO) => Promise<void>
  register: (dto: RegisterDTO) => Promise<void>
  logout: () => Promise<void>
  loginAsDemo: (email: string) => Promise<void>
  demoUsers: User[]
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authService.getCurrentUser()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (dto: LoginDTO) => {
    setError(null)
    setIsLoading(true)
    try {
      const u = await authService.login(dto)
      setUser(u)
    } catch (e: any) {
      setError(e.message || 'Login gagal')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (dto: RegisterDTO) => {
    setError(null)
    setIsLoading(true)
    try {
      const u = await authService.register(dto)
      setUser(u)
    } catch (e: any) {
      setError(e.message || 'Registrasi gagal')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const loginAsDemo = useCallback(async (email: string) => {
    await login({ email, password: 'demo123' })
  }, [login])

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout, loginAsDemo, demoUsers: getDemoUsers() }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}