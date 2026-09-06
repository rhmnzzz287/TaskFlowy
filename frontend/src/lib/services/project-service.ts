import type { IProjectService } from './types'
import type { Project, ProjectMember, CreateProjectDTO, InviteDTO, JoinCodeDTO, ProjectRole } from '@/types/project'
import { getProjects, saveProject, getMembers, saveMember } from './mock-storage'
import { getUsers } from './mock-storage'
import { cryptoRandomId } from './helpers'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const p1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${p1}-${p2}`
}

export const projectService: IProjectService = {
  async getProjects() {
    await new Promise(r => setTimeout(r, 100))
    return getProjects().map(p => ({
      ...p,
      members: getMembers(p.id),
    }))
  },

  async createProject(dto: CreateProjectDTO) {
    await new Promise(r => setTimeout(r, 200))
    const project: Project = {
      id: cryptoRandomId('p'),
      name: dto.name,
      description: dto.description || '',
      inviteCode: generateInviteCode(),
      ownerId: '', // set by caller
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [],
    }
    saveProject(project)
    return project
  },

  async joinByCode(dto: JoinCodeDTO) {
    await new Promise(r => setTimeout(r, 200))
    const project = getProjects().find(p => p.inviteCode === dto.code)
    if (!project) throw new Error('Kode undangan tidak valid atau sudah kedaluwarsa')
    return { ...project, members: getMembers(project.id) }
  },

  async getProjectById(id: string) {
    await new Promise(r => setTimeout(r, 100))
    const project = getProjects().find(p => p.id === id)
    if (!project) return null
    return { ...project, members: getMembers(id) }
  },

  async inviteMember(dto: InviteDTO) {
    await new Promise(r => setTimeout(r, 200))
    const users = getUsers()
    const target = users.find(u => u.email === dto.email)
    if (!target) throw new Error('Pengguna dengan email tersebut tidak ditemukan')
    const existing = getMembers(dto.projectId).find(m => m.userId === target.id)
    if (existing) throw new Error('Pengguna sudah menjadi anggota proyek')
    const member: ProjectMember = {
      id: cryptoRandomId('m'),
      userId: target.id,
      projectId: dto.projectId,
      role: 'member',
      joinedAt: new Date().toISOString(),
      name: target.name,
      email: target.email,
    }
    saveMember(member)
    return member
  },

  async getMembers(projectId: string) {
    await new Promise(r => setTimeout(r, 50))
    return getMembers(projectId).map(m => {
      const user = getUsers().find(u => u.id === m.userId)
      return { ...m, name: user?.name || 'Unknown', email: user?.email || '' }
    })
  },

  async updateMemberRole(projectId: string, memberId: string, role: ProjectRole) {
    await new Promise(r => setTimeout(r, 100))
    const members = getMembers(projectId)
    const member = members.find(m => m.id === memberId)
    if (!member) throw new Error('Anggota tidak ditemukan')
    const updated = { ...member, role }
    return updated
  },
}