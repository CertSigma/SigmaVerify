import { useQuery } from '@tanstack/react-query'
import { Building2, Users, ClipboardCheck, FileText, TrendingUp, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/lib/types'

export default function AdminDashboard() {
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'hr').order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [completedRes, reportsRes, progressRes, invitedRes] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).not('report_url', 'is', null),
        supabase.from('employees').select('*', { count: 'exact', head: true }).in('status', ['docs_submitted', 'under_review']),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'invited'),
      ])
      return {
        completed: completedRes.count ?? 0,
        reports: reportsRes.count ?? 0,
        inProgress: progressRes.count ?? 0,
        invited: invitedRes.count ?? 0,
      }
    },
  })

  const totalOrgs = profiles.length
  const activeOrgs = profiles.filter(p => p.subscription_status === 'active').length

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="Organizations" value={totalOrgs} icon={Building2} color="teal" loading={profilesLoading} />
          <StatsCard title="Active Orgs" value={activeOrgs} icon={Users} color="green" loading={profilesLoading} />
          <StatsCard title="BGVs Completed" value={stats?.completed ?? 0} icon={ClipboardCheck} color="green" loading={statsLoading} />
          <StatsCard title="Total Reports" value={stats?.reports ?? 0} icon={FileText} color="purple" loading={statsLoading} />
          <StatsCard title="BGVs in Progress" value={stats?.inProgress ?? 0} icon={TrendingUp} color="blue" loading={statsLoading} />
          <StatsCard title="Initiated" value={stats?.invited ?? 0} icon={Send} color="yellow" loading={statsLoading} />
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
              {!profilesLoading && profiles.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">No HR users registered yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
