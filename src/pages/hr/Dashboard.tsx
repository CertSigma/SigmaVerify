import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Clock, Search, CheckCircle2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, invokeFunction } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { ProgressTable } from '@/components/dashboard/ProgressTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Employee, Verification } from '@/lib/types'

type EmployeeWithProgress = Employee & { progress: number; verifications: Verification[] }

export default function Dashboard() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', profile?.id],
    queryFn: async (): Promise<EmployeeWithProgress[]> => {
      const { data: emps, error } = await supabase
        .from('employees')
        .select('*')
        .eq('hr_id', profile!.id)
        .order('created_at', { ascending: false })

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
    enabled: !!profile?.id,
  })

  const { data: hrProfile } = useQuery({
    queryKey: ['profile', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('bgv_seats_used, bgv_seats_total')
        .eq('id', profile!.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
  })

  const resendMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      await invokeFunction('send-invite-email', {
        employeeEmail: employee.email,
        employeeName: employee.full_name,
        companyName: profile?.company_name ?? 'Your Company',
        inviteToken: employee.invite_token,
        appUrl: import.meta.env.VITE_APP_URL ?? window.location.origin,
      })
      await supabase.from('employees').update({ invite_sent_at: new Date().toISOString() }).eq('id', employee.id)
    },
    onSuccess: () => {
      toast.success('Invite email resent')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: () => toast.error('Failed to resend invite'),
  })

  const initiateBgvMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      // 1. Check seats
      const { data: currentProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('bgv_seats_used, bgv_seats_total')
        .eq('id', profile!.id)
        .single()
        
      if (profileErr) throw profileErr
      if (currentProfile.bgv_seats_used >= currentProfile.bgv_seats_total) {
        throw new Error('No seats remaining')
      }

      // 2. Increment seats used
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ bgv_seats_used: currentProfile.bgv_seats_used + 1 })
        .eq('id', profile!.id)
      
      if (updateErr) throw updateErr

      // 3. Send email
      await invokeFunction('send-invite-email', {
        employeeEmail: employee.email,
        employeeName: employee.full_name,
        companyName: profile?.company_name ?? 'Your Company',
        inviteToken: employee.invite_token,
        appUrl: import.meta.env.VITE_APP_URL ?? window.location.origin,
      })

      // 4. Update status
      await supabase
        .from('employees')
        .update({ status: 'invited', invite_sent_at: new Date().toISOString() })
        .eq('id', employee.id)
    },
    onSuccess: () => {
      toast.success('BGV Initiated and invite sent')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to initiate BGV'),
  })

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: employees.length,
    invited: employees.filter(e => e.status === 'invited').length,
    underReview: employees.filter(e => e.status === 'under_review' || e.status === 'docs_submitted').length,
    completed: employees.filter(e => e.status === 'completed').length,
  }

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-6">
        {/* Seats counter badge */}
        {hrProfile && (
          <div className="flex justify-end">
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              BGV Seats: {hrProfile.bgv_seats_used} used / {hrProfile.bgv_seats_total} total
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Employees" value={stats.total} icon={Users} color="teal" loading={isLoading} />
          <StatsCard title="Pending Invites" value={stats.invited} icon={Clock} color="yellow" loading={isLoading} />
          <StatsCard title="Under Review" value={stats.underReview} icon={Search} color="blue" loading={isLoading} />
          <StatsCard title="Completed" value={stats.completed} icon={CheckCircle2} color="green" loading={isLoading} />
        </div>

        {/* Employees table */}
        <div className="bg-white rounded-xl border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Employees</h2>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-56 h-9"
              />
              <Link to="/hr/employees/add">
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add Employee
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-5">
              <ProgressTable
                employees={filtered}
                loading={isLoading}
                onResendInvite={resendMutation.mutate}
                onInitiateBgv={initiateBgvMutation.mutate}
              />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
