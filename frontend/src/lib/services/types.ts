import type { User, LoginDTO, RegisterDTO } from '@/types/auth'
import type { Project, ProjectMember, CreateProjectDTO, InviteDTO, JoinCodeDTO, ProjectRole } from '@/types/project'
import type { ChatMessage } from '@/types/chat'

export interface IAuthService {
  login(dto: LoginDTO): Promise<User>
  register(dto: RegisterDTO): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
}

export interface IProjectService {
  getProjects(): Promise<Project[]>
  createProject(dto: CreateProjectDTO): Promise<Project>
  joinByCode(dto: JoinCodeDTO): Promise<Project>
  getProjectById(id: string): Promise<Project | null>
  inviteMember(dto: InviteDTO): Promise<ProjectMember>
  getMembers(projectId: string): Promise<ProjectMember[]>
  updateMemberRole(projectId: string, memberId: string, role: ProjectRole): Promise<ProjectMember>
}

export interface IChatService {
  getMessages(projectId: string): Promise<ChatMessage[]>
  sendMessage(projectId: string, message: string, senderName?: string): Promise<ChatMessage>
  subscribe(projectId: string, onMessage: (msg: ChatMessage) => void): () => void
  broadcastPresence(projectId: string): void
}