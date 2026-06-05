import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Search, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { Employee, Verification, Profile } from '@/lib/types'

type QueueEmployee = Employee & { progress: number; verifications: Verification[] }

export default function ReviewQueue() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['bgv-queue'],
    queryFn: async (): Promise<QueueEmployee[]> => {
      const { data: emps, error } = await supabase
        .from('employees')
        .select('*')
        .in('status', ['docs_submitted', 'under_review', 'completed', 'failed'])
        .order('submitted_at', { ascending: true })

      if (error) throw error
      if (!emps?.length) return []

      const { data: verifs } = await supabase
        .from('verifications')
        .select('*')
        .in('employee_id', emps.map(e => e.id))

      return emps.map(emp => {
        const empVerifs = (verifs ?? []).filter(v => v.employee_id === emp.id)
        const done = empVerifs.filter(v => v.status === 'verified' || v.status === 'failed').length
        return { ...emp, verifications: empVerifs, progress: Math.round((done / 5) * 100) }
      })
    },
    refetchInterval: 30000,
  })

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['bgv-orgs-seats'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'hr')
        .order('company_name', { ascending: true })
      
      if (error) throw error
      return data || []
    }
  })

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  )

  const pending = employees.filter(e => e.status === 'docs_submitted').length
  const inProgress = employees.filter(e => e.status === 'under_review').length
  const completed = employees.filter(e => e.status === 'completed' || e.status === 'failed').length

  return (
    <PageWrapper title="Review Queue">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard title="Pending Review" value={pending} icon={ClipboardCheck} color="yellow" loading={isLoading} />
          <StatsCard title="In Progress" value={inProgress} icon={Search} color="blue" loading={isLoading} />
          <StatsCard title="Completed" value={completed} icon={ClipboardCheck} color="green" loading={isLoading} />
        </div>

        <div className="bg-white rounded-xl border border-border">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Organization Seats Overview</h2>
          </div>
          <div className="p-5 overflow-x-auto">
            {orgsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : orgs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No organizations found</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 font-medium">Organization</th>
                    <th className="px-4 py-3 font-medium">Seats Used</th>
                    <th className="px-4 py-3 font-medium">Total Seats</th>
                    <th className="px-4 py-3 font-medium">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orgs.map(org => {
                    const total = org.bgv_seats_total || 0;
                    const used = org.bgv_seats_used || 0;
                    const utilization = total > 0 ? Math.round((used / total) * 100) : 0;
                    return (
                      <tr key={org.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{org.company_name || org.full_name}</td>
                        <td className="px-4 py-3">{used}</td>
                        <td className="px-4 py-3">{total}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={utilization} className="h-1.5 w-16" />
                            <span className="text-xs text-muted-foreground">{utilization}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Verification Queue</h2>
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-56 h-9"
            />
          </div>

          <div className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 m-4 rounded-lg" />)
              : filtered.length === 0
              ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No employees in the queue</p>
                </div>
              )
              : filtered.map(emp => (
                <button
                  key={emp.id}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => navigate(`/bgv/review/${emp.id}`)}
                >
                  <div className="w-10 h-10 bg-[#063840]/10 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-[#063840] font-bold text-sm">{emp.full_name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{emp.full_name}</span>
                      <StatusBadge status={emp.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{emp.email}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={emp.progress} className="h-1 w-28" />
                      <span className="text-xs text-muted-foreground">{emp.progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-xs text-muted-foreground">{formatDate(emp.submitted_at)}</div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))
            }
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
