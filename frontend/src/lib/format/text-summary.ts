import { TimelineTask } from '../schema'
import { formatDateDisplay } from '../parser/date-grammar'

export function generateChatSummary(tasks: TimelineTask[], title = 'Jadwal Proyek'): string {
  if (!tasks || tasks.length === 0) return 'Belum ada task dalam timeline.'

  const startDates = tasks.map(t => t.start).sort()
  const endDates = tasks.map(t => t.end).sort()
  const earliest = formatDateDisplay(startDates[0])
  const latest = formatDateDisplay(endDates[endDates.length - 1])
  const totalDays = tasks.reduce((sum, t) => sum + (t.durationDays || 0), 0)

  const lines: string[] = [
    `📅 *${title}* (${earliest} - ${latest})`,
    `Total: ${tasks.length} task | Estimasi: ${totalDays} hari kerja`,
    '',
  ]

  tasks.forEach(t => {
    const startStr = formatDateDisplay(t.start)
    const endStr = formatDateDisplay(t.end)
    const pic = t.assignee ? ` — @${t.assignee}` : ''
    const crit = t.isCritical ? ' 🔥 *[Critical Path]*' : ''
    const badge = t.isMilestone ? ' 🚩 *[Milestone]*' : ` (${t.durationDays} hari)`
    const prog = (t.progress ?? 0) >= 100 ? ' ✅' : ''

    lines.push(`• [${startStr} - ${endStr}] ${t.name}${pic}${badge}${crit}${prog}`)
  })

  lines.push('')
  lines.push('Dibuat via TaskFlowy (Text-to-Gantt)')
  return lines.join('\n')
}
