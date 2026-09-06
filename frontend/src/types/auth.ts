export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  createdAt: string
}

export interface Session {
  user: User
  token: string
  expiresAt: number
}

export interface LoginDTO {
  email: string
  password: string
}

export interface RegisterDTO {
  email: string
  password: string
  name: string
}

export interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
}