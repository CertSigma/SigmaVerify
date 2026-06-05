import { Badge } from '@/components/ui/badge'
import { EMPLOYEE_STATUS_LABELS } from '@/lib/utils'
import type { EmployeeStatus, VerificationStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: EmployeeStatus
}

const variantMap: Record<EmployeeStatus, 'secondary' | 'warning' | 'info' | 'purple' | 'success' | 'destructive'> = {
  pending_initiation: 'secondary',
  invited: 'warning',
  docs_submitted: 'info',
  under_review: 'purple',
  completed: 'success',
  failed: 'destructive',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={variantMap[status]}>
      {EMPLOYEE_STATUS_LABELS[status]}
    </Badge>
  )
}

const verificationVariantMap: Record<VerificationStatus, 'secondary' | 'info' | 'success' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'info',
  verified: 'success',
  failed: 'destructive',
}

const verificationLabels: Record<VerificationStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  verified: 'Verified',
  failed: 'Failed',
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <Badge variant={verificationVariantMap[status]}>
      {verificationLabels[status]}
    </Badge>
  )
}
