import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color?: 'teal' | 'blue' | 'yellow' | 'green' | 'red' | 'purple'
  loading?: boolean
  subtitle?: string
}

const colorMap = {
  teal: { bg: 'bg-[#063840]/10', icon: 'text-[#063840]', accent: 'bg-[#063840]' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', accent: 'bg-blue-500' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', accent: 'bg-yellow-500' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', accent: 'bg-green-500' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', accent: 'bg-red-500' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', accent: 'bg-purple-500' },
}

export function StatsCard({ title, value, icon: Icon, color = 'teal', loading, subtitle }: StatsCardProps) {
  const colors = colorMap[color]

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-border p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  )
}
