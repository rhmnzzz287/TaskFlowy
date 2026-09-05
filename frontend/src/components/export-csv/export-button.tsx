import { Download } from 'lucide-react'
import { TimelineTask } from '@/lib/schema'
import { downloadCSV } from '@/lib/csv-export'

interface ExportButtonProps {
  tasks: TimelineTask[]
}

export function ExportButton({ tasks }: ExportButtonProps) {
  const handleClick = () => {
    if (tasks.length === 0) return
    downloadCSV(tasks)
  }

  return (
    <button
      className="btn-secondary"
      onClick={handleClick}
      disabled={tasks.length === 0}
    >
      <Download size={14} />
      <span>Export CSV</span>
    </button>
  )
}