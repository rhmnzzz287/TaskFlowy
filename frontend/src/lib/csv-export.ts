import { TimelineTask } from './schema'

export function tasksToCSV(tasks: TimelineTask[]): string {
  const header = 'id,name,assignee,start,end,durationDays'
  const rows = tasks.map(t =>
    [
      t.id,
      escapeCSV(t.name),
      escapeCSV(t.assignee ?? ''),
      t.start,
      t.end,
      t.durationDays,
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export function downloadCSV(tasks: TimelineTask[], filename = 'timeline.csv') {
  const csv = tasksToCSV(tasks)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}