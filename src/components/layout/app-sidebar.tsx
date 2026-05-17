'use client'

import { useEffect, useState } from 'react'
import { useNavigationStore, type PageKey } from '@/store/navigation'
import { useAuthStore } from '@/store/auth'
import { useIsMobile } from '@/hooks/use-mobile'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Car,
  Wrench,
  Wallet,
  Building2,
  Package,
  History,
  FileBarChart,
  Settings,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  Eye,
  UserCircle,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'

interface NavItem {
  key: PageKey
  label: string
  icon: React.ReactNode
  group: string
  roles: string[]
  badgeKey?: string
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" />, group: 'Utama', roles: ['SUPER_ADMIN', 'ADMIN', 'BENGKEL', 'PIMPINAN'] },
  { key: 'kendaraan', label: 'Kendaraan', icon: <Car className="h-[18px] w-[18px]" />, group: 'Utama', roles: ['SUPER_ADMIN', 'ADMIN', 'PIMPINAN'] },
  { key: 'service', label: 'Service', icon: <Wrench className="h-[18px] w-[18px]" />, group: 'Utama', roles: ['SUPER_ADMIN', 'ADMIN', 'BENGKEL', 'PIMPINAN'], badgeKey: 'service' },
  { key: 'anggaran', label: 'Anggaran', icon: <Wallet className="h-[18px] w-[18px]" />, group: 'Utama', roles: ['SUPER_ADMIN', 'ADMIN', 'PIMPINAN'] },
  { key: 'bengkel', label: 'Bengkel', icon: <Building2 className="h-[18px] w-[18px]" />, group: 'Manajemen', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { key: 'suku-cadang', label: 'Suku Cadang', icon: <Package className="h-[18px] w-[18px]" />, group: 'Manajemen', roles: ['SUPER_ADMIN', 'ADMIN', 'BENGKEL'] },
  { key: 'riwayat', label: 'Riwayat', icon: <History className="h-[18px] w-[18px]" />, group: 'Laporan', roles: ['SUPER_ADMIN', 'ADMIN', 'PIMPINAN'] },
  { key: 'laporan', label: 'Laporan', icon: <FileBarChart className="h-[18px] w-[18px]" />, group: 'Laporan', roles: ['SUPER_ADMIN', 'ADMIN', 'PIMPINAN'] },
  { key: 'notifikasi', label: 'Notifikasi', icon: <Bell className="h-[18px] w-[18px]" />, group: 'Sistem', roles: ['SUPER_ADMIN', 'ADMIN', 'BENGKEL', 'PIMPINAN'], badgeKey: 'notifikasi' },
  { key: 'profil', label: 'Profil', icon: <UserCircle className="h-[18px] w-[18px]" />, group: 'Sistem', roles: ['BENGKEL'] },
  { key: 'pengaturan', label: 'Pengaturan', icon: <Settings className="h-[18px] w-[18px]" />, group: 'Sistem', roles: ['SUPER_ADMIN', 'ADMIN'] },
]

const roleBadgeStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  SUPER_ADMIN: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800/50', dot: 'bg-red-500' },
  ADMIN: { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800/50', dot: 'bg-sky-500' },
  BENGKEL: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-500' },
  PIMPINAN: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  BENGKEL: 'Bengkel',
  PIMPINAN: 'Pimpinan',
}

const roleIcons: Record<string, React.ReactNode> = {
  BENGKEL: <Building2 className="h-3.5 w-3.5" />,
  PIMPINAN: <Eye className="h-3.5 w-3.5" />,
  SUPER_ADMIN: <Shield className="h-3.5 w-3.5" />,
}

// --- Sidebar Content ---
function SidebarContent({
  sidebarOpen,
  onNavigate,
}: {
  sidebarOpen: boolean
  onNavigate?: () => void
}) {
  const { currentPage, setCurrentPage } = useNavigationStore()
  const { user, logout } = useAuthStore()
  const userRole = user?.role || 'ADMIN'
  const [serviceBadgeCount, setServiceBadgeCount] = useState(0)
  const [notifBadgeCount, setNotifBadgeCount] = useState(0)

  const { data: appSettings, dataUpdatedAt } = useQuery({
    queryKey: ['app-settings-sidebar'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan')
      return res.json()
    },
    staleTime: 30000, // Refresh every 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
  })

  // Add cache-busting to logo URL so it refreshes after upload
  const rawLogo = appSettings?.app_logo || null
  const appLogo = rawLogo
    ? (rawLogo.includes('?') ? rawLogo : rawLogo + '?t=' + dataUpdatedAt)
    : null
  const appShortName = appSettings?.app_short_name || 'BKAD'
  const appDesc = appSettings?.app_description || 'Service Kendaraan'

  useEffect(() => {
    const fetchBadgeCounts = async () => {
      try {
        const serviceParams = new URLSearchParams({ role: userRole })
        if (user?.bengkelId) serviceParams.set('bengkelId', user.bengkelId)
        const serviceRes = await fetch(`/api/service/badge-count?${serviceParams}`)
        if (serviceRes.ok) {
          const data = await serviceRes.json()
          setServiceBadgeCount(data.count || 0)
        }
      } catch { /* ignore */ }
      try {
        if (user?.id) {
          const notifRes = await fetch(`/api/notifikasi?userId=${user.id}&limit=1`)
          if (notifRes.ok) {
            const data = await notifRes.json()
            setNotifBadgeCount(data.unreadCount || 0)
          }
        }
      } catch { /* ignore */ }
    }
    fetchBadgeCounts()
    const interval = setInterval(fetchBadgeCounts, 30000)
    return () => clearInterval(interval)
  }, [userRole, user?.bengkelId, user?.id])

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole))
  const groups = [...new Set(filteredNavItems.map(item => item.group))]

  const getBadgeCount = (item: NavItem): number => {
    if (item.badgeKey === 'service') return serviceBadgeCount
    if (item.badgeKey === 'notifikasi') return notifBadgeCount
    return 0
  }

  function handleNavClick(key: PageKey) {
    setCurrentPage(key)
    onNavigate?.()
  }

  const roleStyle = roleBadgeStyles[userRole] || roleBadgeStyles.ADMIN

  return (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className={cn(
        'flex items-center gap-3 px-4 relative overflow-hidden shrink-0',
        'border-b border-border/30',
        sidebarOpen ? 'h-[68px]' : 'h-[64px] justify-center px-0'
      )}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-transparent" />
        {appLogo ? (
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden z-[1]">
            <img
              key={appLogo}
              src={appLogo}
              alt="Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                // Fallback to default icon if logo fails to load
                e.currentTarget.style.display = 'none'
                const parent = e.currentTarget.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-md"><svg class="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>'
                }
              }}
            />
          </div>
        ) : (
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-md z-[1]">
            <Shield className="h-5 w-5 text-white" />
          </div>
        )}
        {sidebarOpen && (
          <div className="flex flex-col overflow-hidden relative z-[1]">
            <span className="text-[13px] font-bold text-sidebar-foreground tracking-tight">{appShortName}</span>
            <span className="text-[11px] text-muted-foreground leading-tight truncate">{appDesc}</span>
          </div>
        )}
      </div>

      {/* Role Badge */}
      {sidebarOpen && (
        <div className="px-3 py-2 shrink-0">
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-1.5 border',
            roleStyle.bg, roleStyle.border
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0 animate-pulse', roleStyle.dot)} />
            <span className={cn('text-[11px] font-semibold', roleStyle.text)}>
              {roleLabels[userRole] || userRole}
            </span>
            {roleIcons[userRole] && (
              <span className={cn('ml-auto', roleStyle.text)}>{roleIcons[userRole]}</span>
            )}
          </div>
        </div>
      )}

      {/* Navigation - Scrollable with custom scrollbar */}
      <ScrollArea className="flex-1 sidebar-scrollbar">
        <div className="px-3 py-1">
          <nav className="space-y-0.5">
            {groups.map((group, groupIdx) => (
              <div key={group} className="animate-fade-in" style={{ animationDelay: `${groupIdx * 60}ms` }}>
                {/* Group Header */}
                {sidebarOpen && (
                  <div className="flex items-center gap-2 px-2 pt-3 pb-1.5">
                    {groupIdx > 0 && <div className="flex-1 h-px bg-border/40" />}
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50 whitespace-nowrap">
                      {group}
                    </span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                )}
                {!sidebarOpen && groupIdx > 0 && (
                  <div className="flex items-center px-2 py-2">
                    <Separator className="flex-1 opacity-40" />
                  </div>
                )}

                {/* Nav Items */}
                <div className="space-y-0.5">
                  {filteredNavItems
                    .filter(item => item.group === group)
                    .map((item, itemIdx) => {
                      const isActive = currentPage === item.key
                      const badgeCount = getBadgeCount(item)

                      const navButton = (
                        <Button
                          key={item.key}
                          variant="ghost"
                          className={cn(
                            'w-full gap-3 h-9 transition-all duration-200 relative rounded-lg group',
                            isActive
                              ? 'bg-primary/[0.08] text-primary font-semibold shadow-sm hover:bg-primary/[0.12]'
                              : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/90',
                            sidebarOpen ? 'justify-start pl-3' : 'justify-center px-0'
                          )}
                          onClick={() => handleNavClick(item.key)}
                          style={{ animationDelay: `${(groupIdx * 60) + (itemIdx * 40)}ms` }}
                        >
                          {/* Active left accent */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary transition-all duration-300" />
                          )}
                          <span className={cn(
                            'shrink-0 transition-all duration-200',
                            isActive
                              ? 'text-primary scale-110'
                              : 'text-sidebar-foreground/35 group-hover:text-sidebar-foreground/60 group-hover:scale-105'
                          )}>
                            {item.icon}
                          </span>
                          {sidebarOpen && (
                            <span className="truncate text-[13px] text-left">{item.label}</span>
                          )}
                          {/* Badge */}
                          {badgeCount > 0 && (
                            sidebarOpen ? (
                              <Badge className={cn(
                                'ml-auto h-[18px] min-w-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1 border-0',
                                badgeCount > 5 ? 'bg-red-500 animate-pulse' : 'bg-red-500/90'
                              )}>
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </Badge>
                            ) : (
                              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold px-0.5 ring-2 ring-sidebar">
                                {badgeCount > 9 ? '9+' : badgeCount}
                              </span>
                            )
                          )}
                        </Button>
                      )

                      if (!sidebarOpen) {
                        return (
                          <Tooltip key={item.key}>
                            <TooltipTrigger asChild>
                              <div className="flex justify-center">{navButton}</div>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8} className="font-medium flex items-center gap-2">
                              {item.label}
                              {badgeCount > 0 && (
                                <Badge className="h-4 min-w-[14px] flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold px-1 border-0">
                                  {badgeCount > 9 ? '9+' : badgeCount}
                                </Badge>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )
                      }

                      return navButton
                    })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </ScrollArea>

      {/* User Info at Bottom - only when sidebar is open */}
      {sidebarOpen && (
        <div className="shrink-0 border-t border-border/30 px-3 py-2.5">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent/60 transition-colors cursor-pointer group"
            onClick={async () => { await logout() }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white text-xs font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
            <LogOut className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-red-500 transition-colors shrink-0" />
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main Sidebar Component ---
export function AppSidebar() {
  const { sidebarOpen, setSidebarOpen } = useNavigationStore()
  const isMobile = useIsMobile()

  // Mobile: render sidebar as a Sheet (drawer)
  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-r-border/30 shadow-2xl">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          <SidebarContent
            sidebarOpen={true}
            onNavigate={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: render sidebar as fixed aside
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-border/20 bg-sidebar transition-all duration-300 ease-in-out flex flex-col',
          sidebarOpen ? 'w-64' : 'w-[68px]'
        )}
      >
        <SidebarContent sidebarOpen={sidebarOpen} />

        {/* Collapse Button */}
        <div className="shrink-0 border-t border-border/20 p-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-center h-8 rounded-lg transition-all duration-200',
              'text-muted-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
            )}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <ChevronsLeft className="h-4 w-4" />
            ) : (
              <ChevronsRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
