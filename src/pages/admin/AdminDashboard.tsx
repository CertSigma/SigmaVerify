import { useQuery } from '@tanstack/react-query'
import { Building2, Users, ClipboardCheck, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/lib/types'

export default function AdminDashboard() {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'hr').order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const { data: employeeCount = 0 } = useQuery({
    queryKey: ['admin-employee-count'],
    queryFn: async () => {
      const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true })
      return count ?? 0
    },
  })

  const { data: monthlyBgvCount = 0 } = useQuery({
    queryKey: ['admin-monthly-bgv'],
    queryFn: async () => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
      return count ?? 0
    },
  })

  const totalOrgs = profiles.length
  const activeOrgs = profiles.filter(p => p.subscription_status === 'active').length

  return (
    <PageWrapper title="Admin Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Orgs" value={totalOrgs} icon={Building2} color="teal" loading={isLoading} />
          <StatsCard title="Active Orgs" value={activeOrgs} icon={Users} color="green" loading={isLoading} />
          <StatsCard title="Total Employees" value={employeeCount} icon={ClipboardCheck} color="blue" />
          <StatsCard title="BGVs This Month" value={monthlyBgvCount} icon={TrendingUp} color="purple" />
        </div>

        {/* Recent registrations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent HR Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {profiles.slice(0, 10).map(p => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">{p.company_name} · {formatDate(p.created_at)}</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.subscription_status === 'active' ? 'bg-green-100 text-green-700'
                    : p.subscription_status === 'suspended' ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.subscription_status}
                  </span>
                </div>
              ))}
              {!isLoading && profiles.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">No HR users registered yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
