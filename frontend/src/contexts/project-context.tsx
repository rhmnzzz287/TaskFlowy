'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Project, ProjectMember, CreateProjectDTO, JoinCodeDTO, InviteDTO } from '@/types/project'
import type { ChatMessage } from '@/types/chat'
import { projectService, chatService } from '@/lib/services'
import { useAuth } from './auth-context'

interface ProjectContextType {
  projects: Project[]
  activeProject: Project | null
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  setActiveProject: (id: string | null) => void
  createProject: (dto: CreateProjectDTO) => Promise<Project>
  joinProject: (dto: JoinCodeDTO) => Promise<void>
  inviteMember: (dto: InviteDTO) => Promise<ProjectMember>
  sendMessage: (text: string) => Promise<void>
  refreshProjects: () => Promise<Project[]>
}

const ProjectContext = createContext<ProjectContextType | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshProjects = useCallback(async () => {
    try {
      const list = await projectService.getProjects()
      setProjects(list)
      return list
    } catch (e: any) {
      setError(e.message)
      return []
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setProjects([])
      setActiveProjectState(null)
      setMessages([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    refreshProjects().finally(() => setIsLoading(false))
  }, [user, refreshProjects])

  const setActiveProject = useCallback(async (id: string | null) => {
    if (!id) { setActiveProjectState(null); setMessages([]); return }
    try {
      const p = await projectService.getProjectById(id)
      setActiveProjectState(p)
      const msgs = await chatService.getMessages(id)
      setMessages(msgs)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const createProject = useCallback(async (dto: CreateProjectDTO) => {
    const p = await projectService.createProject(dto)
    await refreshProjects()
    return p
  }, [refreshProjects])

  const joinProject = useCallback(async (dto: JoinCodeDTO) => {
    const p = await projectService.joinByCode(dto)
    await refreshProjects()
    setActiveProject(p.id)
  }, [refreshProjects, setActiveProject])

  const inviteMember = useCallback(async (dto: InviteDTO) => {
    const m = await projectService.inviteMember(dto)
    return m
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!activeProject || !user) return
    const msg = await chatService.sendMessage(activeProject.id, text, user.name)
    setMessages(prev => [...prev, msg])
  }, [activeProject, user])

  // Cross-tab realtime subscription
  useEffect(() => {
    if (!activeProject) return
    const unsub = chatService.subscribe(activeProject.id, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })
    return unsub
  }, [activeProject])

  return (
    <ProjectContext.Provider value={{
      projects, activeProject, messages, isLoading, error,
      setActiveProject, createProject, joinProject, inviteMember, sendMessage, refreshProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjectWorkspace(): ProjectContextType {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjectWorkspace must be used within ProjectProvider')
  return ctx
}