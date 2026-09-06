export type ProjectRole = 'owner' | 'member'

export interface ProjectMember {
  id: string
  userId: string
  projectId: string
  role: ProjectRole
  joinedAt: string
  name?: string
  email?: string
}

export interface Project {
  id: string
  name: string
  description: string
  inviteCode: string
  ownerId: string
  createdAt: string
  updatedAt: string
  members: ProjectMember[]
}

export interface CreateProjectDTO {
  name: string
  description?: string
}

export interface InviteDTO {
  email: string
  projectId: string
}

export interface JoinCodeDTO {
  code: string
}