import { Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

interface NavbarProps {
  title: string
  onMenuClick?: () => void
}

export function Navbar({ title, onMenuClick }: NavbarProps) {
  const { profile } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-8 h-8 bg-[#063840]/10 rounded-full flex items-center justify-center">
            <span className="text-[#063840] text-xs font-bold uppercase">
              {profile?.full_name?.charAt(0) ?? '?'}
            </span>
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-medium text-foreground leading-none">{profile?.full_name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{profile?.company_name}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
