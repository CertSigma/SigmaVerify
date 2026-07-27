import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Building2, Users, CheckCircle2, Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatDate } from '@/lib/utils'
import type { Profile, SubscriptionStatus } from '@/lib/types'

interface OrgProfile extends Profile {
  employee_count: number
}

export default function Organizations() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: async (): Promise<OrgProfile[]> => {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'hr')
        .order('created_at', { ascending: false })
      if (profileError) throw profileError

      const { data: counts, error: countError } = await supabase
        .from('employees')
        .select('hr_id')
      if (countError) throw countError

      const countMap: Record<string, number> = {}
      for (const emp of counts ?? []) {
        countMap[emp.hr_id] = (countMap[emp.hr_id] ?? 0) + 1
      }

      return (profiles ?? []).map(p => ({
        ...p,
        employee_count: countMap[p.id] ?? 0,
      }))
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubscriptionStatus }) => {
      const { error } = await supabase.from('profiles').update({ subscription_status: status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      toast.success(`Org ${status === 'active' ? 'approved' : 'suspended'}`)
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] })
    },
    onError: () => toast.error('Update failed'),
  })

  const filtered = orgs.filter(o =>
    o.company_name?.toLowerCase().includes(search.toLowerCase()) ??
    o.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageWrapper title="Organizations">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">All Organizations</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
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
                  <TableHead>Organization</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(org => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{org.company_name ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{org.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(org.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {org.employee_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {org.bgv_seats_used ?? 0} / {org.bgv_seats_total ?? 0}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.subscription_status === 'active' ? 'bg-green-100 text-green-800'
                        : org.subscription_status === 'suspended' ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {org.subscription_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {org.subscription_status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve organization?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will activate <strong>{org.company_name}</strong> and give them full access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => updateStatus.mutate({ id: org.id, status: 'active' })}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Approve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {org.subscription_status === 'active' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Suspend
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Suspend organization?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will revoke <strong>{org.company_name}'s</strong> access to the platform.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => updateStatus.mutate({ id: org.id, status: 'suspended' })}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Suspend
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {org.subscription_status === 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => updateStatus.mutate({ id: org.id, status: 'active' })}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No organizations found
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
