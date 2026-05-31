import { statusBadgeClass } from '@/lib/ruja/calculos'
import type { Status } from '@/lib/ruja/types'

interface BadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(status)} ${className}`}>
      {status}
    </span>
  )
}
