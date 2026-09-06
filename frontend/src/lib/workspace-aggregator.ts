import type { ParseRowState } from './schema'
import { parseRows } from './parser/row-parser'

export interface AggregatedTask {
  projectId: string
  projectName: string
  rowId: string
  taskName: string
  assignee: string
  startDate: string
  endDate: string
  durationDays: number
  progress: number
  isUrgent: boolean
  isOverdue: boolean
}

export interface WorkspaceMetrics {
  totalProjects: number
  myActiveTasksCount: number
  urgentTasksCount: number
}

export function aggregateUserTasks(
  allProjectsRows: Record<string, ParseRowState[]>,
  projectMetaList: Array<{ id: string; name: string }>,
  targetAssignee: string,
  referenceDateStr: string
): { myTasks: AggregatedTask[]; metrics: WorkspaceMetrics } {
  const normTarget = targetAssignee.trim().toLowerCase()
  const refTime = new Date(referenceDateStr).getTime()
  const myTasks: AggregatedTask[] = []

  for (const meta of projectMetaList) {
    const rows = allProjectsRows[meta.id]
    if (!rows || rows.length === 0) continue

    const parsed = parseRows(
      rows.map(r => ({
        name: r.name,
        assignee: r.assignee || null,
        start: r.start,
        duration: r.duration || null,
        end: r.end || null,
      })),
      referenceDateStr
    )

    parsed.tasks.forEach((task, idx) => {
      const taskAssignee = task.assignee?.trim().toLowerCase() || ''
      const isAssigned = normTarget !== '' && (taskAssignee === normTarget || taskAssignee.includes(normTarget))

      if (isAssigned) {
        const endTime = new Date(task.end).getTime()
        const diffDays = Math.ceil((endTime - refTime) / (1000 * 60 * 60 * 24))
        const isOverdue = diffDays < 0
        const isUrgent = diffDays >= 0 && diffDays <= 3

        myTasks.push({
          projectId: meta.id,
          projectName: meta.name,
          rowId: rows[idx]?.id || task.id,
          taskName: task.name,
          assignee: task.assignee || '',
          startDate: task.start,
          endDate: task.end,
          durationDays: task.durationDays,
          progress: parseInt(rows[idx]?.progress || '0', 10),
          isUrgent,
          isOverdue,
        })
      }
    })
  }

  // Urutkan task berdasarkan tanggal selesai terdekat
  myTasks.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())

  const metrics: WorkspaceMetrics = {
    totalProjects: projectMetaList.length,
    myActiveTasksCount: myTasks.filter(t => t.progress < 100).length,
    urgentTasksCount: myTasks.filter(t => t.isUrgent && t.progress < 100).length,
  }

  return { myTasks, metrics }
}