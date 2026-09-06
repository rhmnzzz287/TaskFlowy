// Unit check: 1-click chat summary generator (Slack/WhatsApp/Markdown)
import { generateChatSummary } from '../src/lib/format/text-summary'
import { TimelineTask } from '../src/lib/schema'

const dummyTasks: TimelineTask[] = [
  { id: '1', name: 'UI Design', assignee: 'Andi', start: '2026-09-10', end: '2026-09-12', durationDays: 3, progress: 100, isCritical: false, isMilestone: false, ambiguities: [] },
  { id: '2', name: 'API Development', assignee: 'Budi', start: '2026-09-13', end: '2026-09-19', durationDays: 7, progress: 30, isCritical: true, isMilestone: false, ambiguities: [] },
  { id: '3', name: 'Go-Live', assignee: null, start: '2026-09-20', end: '2026-09-20', durationDays: 0, progress: 0, isCritical: false, isMilestone: true, ambiguities: [] },
]

const summary = generateChatSummary(dummyTasks, 'Proyek TaskFlowy')
console.log('Generated Output:\n', summary)

if (!summary.includes('UI Design') || !summary.includes('API Development')) {
  console.error('Summary test failed: missing tasks!')
  process.exit(1)
}
if (!summary.includes('🚩 *[Milestone]*')) {
  console.error('Summary test failed: milestone badge missing!')
  process.exit(1)
}
console.log('Summary test passed.')
