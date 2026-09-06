import type { Project, ProjectMember } from '@/types/project'
import type { User } from '@/types/auth'
import type { ChatMessage } from '@/types/chat'
import { buildSeedState } from './seed-data'

const STORAGE_KEY = 'taskflowy_mock_state_v1'

interface MockState {
  users: User[]
  projects: Project[]
  members: ProjectMember[]
  messages: ChatMessage[]
}

function getState(): MockState {
  if (typeof window === 'undefined') return buildSeedState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockState
      if (parsed && parsed.users && parsed.projects) return parsed
    }
  } catch { /* fall through to seed */ }
  return buildSeedState()
}

function saveState(state: MockState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* quota exceeded, ignore */ }
}

export function getUsers(): User[] {
  return getState().users
}

export function saveUser(user: User) {
  const state = getState()
  const idx = state.users.findIndex(u => u.id === user.id)
  if (idx >= 0) state.users[idx] = user
  else state.users.push(user)
  saveState(state)
}

export function getProjects(): Project[] {
  return getState().projects
}

export function saveProject(project: Project) {
  const state = getState()
  const idx = state.projects.findIndex(p => p.id === project.id)
  if (idx >= 0) state.projects[idx] = project
  else state.projects.push(project)
  saveState(state)
}

export function getMembers(projectId?: string): ProjectMember[] {
  const all = getState().members
  return projectId ? all.filter(m => m.projectId === projectId) : all
}

export function saveMember(member: ProjectMember) {
  const state = getState()
  state.members.push(member)
  saveState(state)
}

export function getMessages(projectId: string): ChatMessage[] {
  return getState().messages.filter(m => m.projectId === projectId)
}

export function saveMessage(msg: ChatMessage) {
  const state = getState()
  state.messages.push(msg)
  saveState(state)
}