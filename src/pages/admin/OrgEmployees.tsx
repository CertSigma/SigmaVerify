import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Users, FileText } from 'lucide-react'
import { supabase, getSignedUrl } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { Employee, EmployeeStatus } from '@/lib/types'

const PROGRESS_LABELS: Record<EmployeeStatus, string> = {
  pending_initiation: 'Pending Initiation',
  invited: 'Awaiting Docs',
  docs_submitted: 'Doc Upload in Progress',
  under_review: 'BGV in Progress',
  completed: 'Completed',
  failed: 'Failed',
}

const PROGRESS_STYLES: Record<EmployeeStatus, string> = {
  pending_initiation: 'bg-gray-100 text-gray-800',
  invited: 'bg-yellow-100 text-yellow-800',
  docs_submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function OrgEmployees() {
  const { hrId } = useParams<{ hrId: string }>()
  const navigate = useNavigate()
  const [reportUrls, setReportUrls] = useState<Record<string, string>>({})

  const { data: org } = useQuery({
    queryKey: ['org-profile', hrId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', hrId!).single()
      if (error) throw error
      return data
    },
    enabled: !!hrId,
  })

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['org-employees', hrId],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('hr_id', hrId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!hrId,
  })

  const completedIds = employees.filter(e => e.status === 'completed' || e.status === 'failed').map(e => e.id)

  const { data: reports = [] } = useQuery({
    queryKey: ['org-employee-reports', hrId],
    queryFn: async () => {
      if (completedIds.length === 0) return []
      const { data, error } = await supabase
        .from('reports')
        .select('employee_id, report_url')
        .in('employee_id', completedIds)
        .not('report_url', 'is', null)
      if (error) throw error
      return data ?? []
    },
    enabled: completedIds.length > 0,
  })

  const reportMap = new Map(reports.map(r => [r.employee_id, r.report_url]))

  useEffect(() => {
    if (completedIds.length === 0) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        completedIds.map(async id => {
          const path = reportMap.get(id)
          if (!path) return ['', ''] as [string, string]
          const url = await getSignedUrl('reports', path, 86400)
          return [id, url ?? ''] as [string, string]
        })
      )
      if (!cancelled) setReportUrls(Object.fromEntries(entries.filter(([k]) => k)))
    })()
    return () => { cancelled = true }
  })

  return (
    <PageWrapper title={org?.company_name ?? 'Organization'}>
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/orgs')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Organizations
        </button>

        <div className="bg-white rounded-xl border border-border">
          {org && (
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#063840]/10 rounded-xl flex items-center justify-center">
                  <span className="text-[#063840] text-lg font-bold">{org.company_name?.charAt(0) ?? '?'}</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{org.company_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {org.full_name} · {employees.length} employee{employees.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(emp => {
                  const isFinal = emp.status === 'completed' || emp.status === 'failed'
                  const reportUrl = reportUrls[emp.id]
                  return (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{emp.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{emp.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{emp.phone ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PROGRESS_STYLES[emp.status]}`}>
                        {PROGRESS_LABELS[emp.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {emp.submitted_at ? formatDate(emp.submitted_at) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {emp.completed_at ? formatDate(emp.completed_at) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isFinal && reportUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(reportUrl, '_blank')}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Report
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  )
                })}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No employees found for this organization
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
