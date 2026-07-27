import { useQuery } from '@tanstack/react-query'
import { FileText, Download, ExternalLink } from 'lucide-react'
import { supabase, getSignedUrl } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Report } from '@/lib/types'

interface ReportWithDetails extends Report {
  employee_name: string
  employee_email: string
  company_name: string | null
}

export default function ReportsPage() {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async (): Promise<ReportWithDetails[]> => {
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
      if (reportError) throw reportError

      const employeeIds = [...new Set((reportData ?? []).map(r => r.employee_id))]
      const empMap = new Map<string, { full_name: string; email: string; hr_id: string }>()
      const profMap = new Map<string, { company_name: string | null }>()

      if (employeeIds.length > 0) {
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id, full_name, email, hr_id')
          .in('id', employeeIds)
        if (empError) throw empError
        for (const e of employees ?? []) empMap.set(e.id, e)

        const hrIds = [...new Set((employees ?? []).map(e => e.hr_id))]
        if (hrIds.length > 0) {
          const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('id, company_name')
            .in('id', hrIds)
          if (profError) throw profError
          for (const p of profiles ?? []) profMap.set(p.id, p)
        }
      }

      return (reportData ?? []).map(r => {
        const emp = empMap.get(r.employee_id)
        const prof = emp ? profMap.get(emp.hr_id) : null
        return {
          id: r.id,
          employee_id: r.employee_id,
          report_url: r.report_url,
          generated_at: r.generated_at,
          sent_to_hr_at: r.sent_to_hr_at,
          sent_to_employee_at: r.sent_to_employee_at,
          created_at: r.created_at,
          employee_name: emp?.full_name ?? 'Unknown',
          employee_email: emp?.email ?? '',
          company_name: prof?.company_name ?? null,
        }
      })
    },
  })

  return (
    <PageWrapper title="Reports">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">All Reports</h2>
            <div className="text-sm text-muted-foreground">
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </div>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Sent to HR</TableHead>
                  <TableHead>Sent to Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{report.employee_name}</div>
                          <div className="text-xs text-muted-foreground">{report.employee_email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{report.company_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {report.generated_at ? formatDate(report.generated_at) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {report.sent_to_hr_at ? formatDate(report.sent_to_hr_at) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {report.sent_to_employee_at ? formatDate(report.sent_to_employee_at) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.generated_at ? 'default' : 'secondary'}>
                        {report.generated_at ? 'Generated' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {report.report_url ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const reportUrl = report.report_url!
                                const url = await getSignedUrl('reports', reportUrl)
                                if (url) window.open(url, '_blank')
                              }}
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const reportUrl = report.report_url!
                                const url = await getSignedUrl('reports', reportUrl)
                                if (url) window.open(url, '_blank')
                              }}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not available</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No reports generated yet
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
