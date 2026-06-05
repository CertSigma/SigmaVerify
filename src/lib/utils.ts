import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { EmployeeStatus, VerificationStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  pending_initiation: 'Pending Initiation',
  invited: 'Invited',
  docs_submitted: 'Docs Submitted',
  under_review: 'Under Review',
  completed: 'Completed',
  failed: 'Failed',
}

export const EMPLOYEE_STATUS_COLORS: Record<EmployeeStatus, string> = {
  pending_initiation: 'bg-gray-100 text-gray-800 border-gray-200',
  invited: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  docs_submitted: 'bg-blue-100 text-blue-800 border-blue-200',
  under_review: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
}

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  verified: 'Verified',
  failed: 'Failed',
}

export const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  verified: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export function getVerificationProgress(verifications: { status: VerificationStatus }[]): number {
  if (!verifications.length) return 0
  const done = verifications.filter(v => v.status === 'verified' || v.status === 'failed').length
  return Math.round((done / 5) * 100)
}

export function isValidFileType(file: File, accept: string[]): boolean {
  return accept.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type)
    }
    return file.type === type || file.type.startsWith(type.replace('*', ''))
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
