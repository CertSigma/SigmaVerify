import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { Employee, EmployeeStatus } from '@/lib/types'

interface EmployeeWithCompany extends Employee {
  company_name: string | null
  hr_name: string | null
}

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  pending_initiation: 'Pending Initiation',
  invited: 'Invited',
  docs_submitted: 'Docs Submitted',
  under_review: 'Under Review',
  completed: 'Completed',
  failed: 'Failed',
}

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  pending_initiation: 'bg-gray-100 text-gray-800',
  invited: 'bg-yellow-100 text-yellow-800',
  docs_submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function AllEmployees() {
  const [search, setSearch] = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['admin-all-employees'],
    queryFn: async (): Promise<EmployeeWithCompany[]> => {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })
      if (empError) throw empError

      const hrIds = [...new Set((empData ?? []).map(e => e.hr_id))]
      const profMap = new Map<string, { company_name: string | null; full_name: string }>()

      if (hrIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id, company_name, full_name')
          .in('id', hrIds)
        if (profError) throw profError
        for (const p of profiles ?? []) profMap.set(p.id, p)
      }

      return (empData ?? []).map(e => {
        const prof = profMap.get(e.hr_id)
        return {
          ...e,
          company_name: prof?.company_name ?? null,
          hr_name: prof?.full_name ?? null,
        }
      })
    },
  })

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.company_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageWrapper title="All Employees">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">All Employees</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, company..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
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
                  <TableHead>Company</TableHead>
                  <TableHead>HR Contact</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{emp.full_name}</div>
                          <div className="text-xs text-muted-foreground">{emp.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{emp.company_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{emp.hr_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(emp.created_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[emp.status]}`}>
                        {STATUS_LABELS[emp.status]}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No employees found
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
