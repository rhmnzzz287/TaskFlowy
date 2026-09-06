'use client'

import type { ParseRowState } from '@/lib/schema'
import { parseRawText } from '@/lib/format/raw-text'

interface Template {
  name: string
  label: string
  rows: ParseRowState[]
}

const templates: Template[] = [
  {
    name: 'software-sprint',
    label: 'Software Sprint (2 Minggu)',
    rows: parseRawText(`Task | Lead | Start | Durasi | Ket
Sprint Planning | Scrum Master | besok | 1 hr | |
Desain UI | Andi | besok | 3 hr | |
Backend API | Budi | 10 Sep 2026 | 5 hr | |
Frontend Integration | Cici | 12 Sep 2026 | 4 hr | |
Testing | Andi | | 2 hr | 18 Sep 2026
Sprint Review | Semua | 18 Sep 2026 | 1 hr | |`),
  },
  {
    name: 'marketing',
    label: 'Marketing Campaign',
    rows: parseRawText(`Task | Lead | Start | Durasi
Brief & Riset | Tini | besok | 2 hr
Copywriting | Tini | 10 Sep | 3 hr
Desain Visual | Rudi | 10 Sep | 4 hr
Video Produksi | Rudi | 13 Sep | 3 hr
Review & Approval | Tini | 15 Sep | 1 hr
Launch | Semua | 16 Sep | 1 hr`),
  },
  {
    name: 'event',
    label: 'Event Organizer Timeline',
    rows: parseRawText(`Task | PIC | Start | Durasi
Cari Venue | Andi | besok | 3 hr
Daftar Sponsor | Budi | 10 Sep | 5 hr
Desain Booth | Cici | | 4 hr | 15 Sep
Promosi Tiket | Dina | 12 Sep | 7 hr
Hari-H Acara | Semua | 20 Sep | 1 hr
Evaluasi | Andi | 21 Sep | 1 hr`),
  },
]

interface Props {
  onSelect: (rows: ParseRowState[]) => void
}

export function TemplatePicker({ onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted text-[11px] whitespace-nowrap">Template:</span>
      {templates.map(t => (
        <button
          key={t.name}
          onClick={() => onSelect(t.rows)}
          className="btn-secondary text-[11px]"
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export { templates }