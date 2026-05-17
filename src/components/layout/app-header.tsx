'use client'

import { useNavigationStore, type PageKey } from '@/store/navigation'
import { useAuthStore } from '@/store/auth'
import { Bell, Moon, Sun, Search, Menu, LogOut, User, Settings, ChevronRight, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { QrScanner } from '@/components/shared/qr-scanner'

const pageLabels: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  kendaraan: 'Data Kendaraan',
  service: 'Service Kendaraan',
  anggaran: 'Anggaran',
  bengkel: 'Manajemen Bengkel',
  'suku-cadang': 'Suku Cadang',
  riwayat: 'Riwayat Perbaikan',
  laporan: 'Laporan',
  notifikasi: 'Notifikasi',
  pengaturan: 'Pengaturan',
  profil: 'Profil Bengkel',
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  ADMIN: 'Administrator',
  BENGKEL: 'Bengkel',
  PIMPINAN: 'Pimpinan',
}

const roleAvatarColors: Record<string, string> = {
  SUPER_ADMIN: 'from-red-500 to-rose-600',
  ADMIN: 'from-sky-500 to-cyan-600',
  BENGKEL: 'from-amber-500 to-orange-600',
  PIMPINAN: 'from-emerald-500 to-teal-600',
}

function HeaderNotifBadge() {
  const { user } = useAuthStore()
  const { data } = useQuery({
    queryKey: ['header-notif-count'],
    queryFn: async () => {
      if (!user?.id) return { unreadCount: 0 }
      const res = await fetch(`/api/notifikasi?userId=${user.id}&limit=1`)
      if (!res.ok) return { unreadCount: 0 }
      return res.json()
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
  const count = data?.unreadCount || 0
  if (count === 0) return null
  return (
    <span className={cn(
      'absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center',
      'rounded-full bg-destructive text-white text-[10px] font-bold px-1.5',
      'border-2 border-background shadow-sm',
      count > 5 && 'animate-pulse'
    )}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(p => p.length > 0)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export function AppHeader() {
  const { currentPage, setSidebarOpen } = useNavigationStore()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [showQrScanner, setShowQrScanner] = useState(false)

  // Listen for custom event to open QR scanner from dashboard
  useEffect(() => {
    function handleOpenQrScanner() {
      setShowQrScanner(true)
    }
    window.addEventListener('open-qr-scanner', handleOpenQrScanner)
    return () => window.removeEventListener('open-qr-scanner', handleOpenQrScanner)
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  const userName = user?.name || 'Pengguna'
  const userRole = user?.role || 'ADMIN'
  const userInitials = getInitials(userName)
  const avatarGradient = roleAvatarColors[userRole] || roleAvatarColors.ADMIN

  return (
    <header className={cn(
      'sticky top-0 z-30 flex h-16 items-center gap-4 px-4 md:px-6',
      'bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60',
      'shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] border-b-0'
    )}>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9 rounded-xl hover:bg-accent/80"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Cleaner Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <button
          onClick={() => useNavigationStore.getState().setCurrentPage('dashboard')}
          className="text-muted-foreground/70 hover:text-foreground transition-colors duration-200 font-medium"
        >
          BKAD
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
        <span className="font-semibold text-foreground">
          {pageLabels[currentPage]}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Search - Better styled */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            type="search"
            placeholder="Cari..."
            className={cn(
              'w-52 pl-9 h-9 rounded-xl',
              'bg-muted/40 border-0',
              'placeholder:text-muted-foreground/50',
              'focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:bg-muted/60',
              'transition-all duration-200'
            )}
          />
        </div>

        {/* QR Scanner Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-9 w-9 rounded-xl',
            'hover:bg-teal-600/10 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-200'
          )}
          onClick={() => setShowQrScanner(true)}
          title="Scan QR Kendaraan"
        >
          <ScanLine className="h-[18px] w-[18px] text-teal-600 dark:text-teal-400" />
        </Button>

        <QrScanner open={showQrScanner} onOpenChange={setShowQrScanner} />

        {/* Notifications - Better styled */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-9 w-9 rounded-xl',
            'hover:bg-accent/80 transition-all duration-200'
          )}
          onClick={() => useNavigationStore.getState().setCurrentPage('notifikasi')}
        >
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          <HeaderNotifBadge />
        </Button>

        {/* Theme Toggle - Better styled */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-9 w-9 rounded-xl',
            'hover:bg-accent/80 transition-all duration-200'
          )}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-sky-500" />
        </Button>

        {/* User Menu - Better styled with gradient avatar ring */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2.5 pl-1.5 pr-3 h-auto py-1.5 rounded-xl hover:bg-accent/80 transition-all duration-200">
              <div className={cn(
                'rounded-full p-[2px]',
                'bg-gradient-to-br',
                avatarGradient
              )}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-background text-foreground text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium leading-none">{userName}</span>
                <span className="text-[11px] text-muted-foreground/70 mt-0.5">{roleLabels[userRole] || userRole}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-border/50 p-1.5">
            <DropdownMenuLabel className="font-normal p-2 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'rounded-full p-[2px] bg-gradient-to-br shrink-0',
                  avatarGradient
                )}>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-background text-foreground text-sm font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold leading-none truncate">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="rounded-lg cursor-pointer py-2 px-2.5 transition-colors duration-150"
              onClick={() => {
                if (userRole === 'BENGKEL') {
                  useNavigationStore.getState().setCurrentPage('profil')
                }
              }}
            >
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              Profil
            </DropdownMenuItem>
            {userRole !== 'BENGKEL' && (
              <DropdownMenuItem
                className="rounded-lg cursor-pointer py-2 px-2.5 transition-colors duration-150"
                onClick={() => useNavigationStore.getState().setCurrentPage('pengaturan')}
              >
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                Pengaturan
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="rounded-lg cursor-pointer py-2 px-2.5 text-destructive focus:text-destructive focus:bg-destructive/5 transition-colors duration-150"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
