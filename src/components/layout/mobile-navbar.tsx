'use client'

import { useEffect, useRef, useState } from 'react'
import { useNavigationStore, type PageKey } from '@/store/navigation'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { QrScanner } from '@/components/shared/qr-scanner'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetHeader,
} from '@/components/ui/sheet'
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
  Menu,
  UserCircle,
  ScanLine,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BottomNavItem {
  key: PageKey | 'more'
  label: string
  icon: React.ElementType
  filledIcon?: React.ElementType
  badgeKey?: 'service' | 'notifikasi'
}

interface MoreNavItem {
  key: PageKey
  label: string
  icon: React.ElementType
  filledIcon?: React.ElementType
  group: string
}

// ─── Role-based bottom nav configs ───────────────────────────────────────────

const bottomNavByRole: Record<string, BottomNavItem[]> = {
  SUPER_ADMIN: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'service', label: 'Service', icon: Wrench, badgeKey: 'service' },
    { key: 'kendaraan', label: 'Kendaraan', icon: Car },
    { key: 'notifikasi', label: 'Notifikasi', icon: Bell, badgeKey: 'notifikasi' },
    { key: 'more', label: 'Lainnya', icon: Menu },
  ],
  ADMIN: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'service', label: 'Service', icon: Wrench, badgeKey: 'service' },
    { key: 'kendaraan', label: 'Kendaraan', icon: Car },
    { key: 'notifikasi', label: 'Notifikasi', icon: Bell, badgeKey: 'notifikasi' },
    { key: 'more', label: 'Lainnya', icon: Menu },
  ],
  BENGKEL: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'service', label: 'Service', icon: Wrench, badgeKey: 'service' },
    { key: 'suku-cadang', label: 'Suku Cadang', icon: Package },
    { key: 'notifikasi', label: 'Notifikasi', icon: Bell, badgeKey: 'notifikasi' },
    { key: 'profil', label: 'Profil', icon: UserCircle },
  ],
  PIMPINAN: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'service', label: 'Service', icon: Wrench, badgeKey: 'service' },
    { key: 'anggaran', label: 'Anggaran', icon: Wallet },
    { key: 'notifikasi', label: 'Notifikasi', icon: Bell, badgeKey: 'notifikasi' },
    { key: 'more', label: 'Lainnya', icon: Menu },
  ],
}

// Items that appear in the "More" bottom sheet, by role
const moreNavByRole: Record<string, MoreNavItem[]> = {
  SUPER_ADMIN: [
    { key: 'anggaran', label: 'Anggaran', icon: Wallet, group: 'Utama' },
    { key: 'bengkel', label: 'Bengkel', icon: Building2, group: 'Manajemen' },
    { key: 'suku-cadang', label: 'Suku Cadang', icon: Package, group: 'Manajemen' },
    { key: 'riwayat', label: 'Riwayat', icon: History, group: 'Laporan' },
    { key: 'laporan', label: 'Laporan', icon: FileBarChart, group: 'Laporan' },
    { key: 'pengaturan', label: 'Pengaturan', icon: Settings, group: 'Sistem' },
  ],
  ADMIN: [
    { key: 'anggaran', label: 'Anggaran', icon: Wallet, group: 'Utama' },
    { key: 'bengkel', label: 'Bengkel', icon: Building2, group: 'Manajemen' },
    { key: 'suku-cadang', label: 'Suku Cadang', icon: Package, group: 'Manajemen' },
    { key: 'riwayat', label: 'Riwayat', icon: History, group: 'Laporan' },
    { key: 'laporan', label: 'Laporan', icon: FileBarChart, group: 'Laporan' },
    { key: 'pengaturan', label: 'Pengaturan', icon: Settings, group: 'Sistem' },
  ],
  BENGKEL: [
    { key: 'kendaraan' as PageKey, label: 'Kendaraan', icon: Car, group: 'Utama' },
    { key: 'riwayat' as PageKey, label: 'Riwayat', icon: History, group: 'Laporan' },
  ],
  PIMPINAN: [
    { key: 'kendaraan', label: 'Kendaraan', icon: Car, group: 'Utama' },
    { key: 'riwayat', label: 'Riwayat', icon: History, group: 'Laporan' },
    { key: 'laporan', label: 'Laporan', icon: FileBarChart, group: 'Laporan' },
  ],
  BENGKEL: [],
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MobileNavbar() {
  const { currentPage, setCurrentPage } = useNavigationStore()
  const { user } = useAuthStore()
  const userRole = user?.role || 'ADMIN'

  const [serviceBadgeCount, setServiceBadgeCount] = useState(0)
  const [notifBadgeCount, setNotifBadgeCount] = useState(0)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [showQrScanner, setShowQrScanner] = useState(false)

  const bottomItems = bottomNavByRole[userRole] || bottomNavByRole.ADMIN
  const moreItems = moreNavByRole[userRole] || []
  const moreGroups = [...new Set(moreItems.map(item => item.group))]

  // Determine if any "more" item is active
  const moreKeys = moreItems.map(item => item.key)
  const isMoreActive = moreKeys.includes(currentPage)

  // Use refs for stable access inside the interval callback
  const userRoleRef = useRef(userRole)
  const userIdRef = useRef(user?.id)
  const bengkelIdRef = useRef(user?.bengkelId)

  useEffect(() => {
    userRoleRef.current = userRole
    userIdRef.current = user?.id
    bengkelIdRef.current = user?.bengkelId
  }, [userRole, user?.id, user?.bengkelId])

  // Fetch badge counts periodically (same pattern as sidebar)
  useEffect(() => {
    function fetchBadgeCounts() {
      const role = userRoleRef.current
      const uid = userIdRef.current
      const bid = bengkelIdRef.current

      try {
        const serviceParams = new URLSearchParams({ role })
        if (bid) serviceParams.set('bengkelId', bid)
        fetch(`/api/service/badge-count?${serviceParams}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => { if (data) setServiceBadgeCount(data.count || 0) })
          .catch(() => {})
      } catch {
        // silently ignore
      }
      try {
        if (uid) {
          fetch(`/api/notifikasi?userId=${uid}&limit=1`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data) setNotifBadgeCount(data.unreadCount || 0) })
            .catch(() => {})
        }
      } catch {
        // silently ignore
      }
    }

    fetchBadgeCounts()
    const interval = setInterval(fetchBadgeCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  function getBadgeCount(badgeKey?: 'service' | 'notifikasi'): number {
    if (badgeKey === 'service') return serviceBadgeCount
    if (badgeKey === 'notifikasi') return notifBadgeCount
    return 0
  }

  function handleNavClick(key: PageKey | 'more') {
    if (key === 'more') {
      setMoreSheetOpen(true)
      return
    }
    setCurrentPage(key)
  }

  function handleMoreNavClick(key: PageKey) {
    setCurrentPage(key)
    setMoreSheetOpen(false)
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role="navigation"
        aria-label="Navigasi utama"
      >
        {/* Gradient top border */}
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

        {/* Frosted glass background */}
        <div className="bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
          <div className="flex items-center justify-around h-16 px-2">
            {bottomItems.map((item) => {
              const Icon = item.icon
              const isActive = item.key === 'more' ? isMoreActive : currentPage === item.key
              const badgeCount = getBadgeCount(item.badgeKey)

              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] min-w-[44px] relative',
                    'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                    'active:scale-90 active:duration-100',
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground/70 hover:text-foreground/80'
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Active dot indicator above icon */}
                  <div
                    className={cn(
                      'absolute -top-1 left-1/2 -translate-x-1/2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                      isActive
                        ? 'h-1 w-5 bg-emerald-500 opacity-100'
                        : 'h-0 w-0 bg-transparent opacity-0'
                    )}
                  />

                  {/* Icon container with active background pill */}
                  <div className="relative">
                    <div
                      className={cn(
                        'absolute inset-0 -m-2 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                        isActive
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15 scale-100'
                          : 'bg-transparent scale-75'
                      )}
                    />
                    <span className="relative z-10">
                      <Icon
                        className={cn(
                          'h-[22px] w-[22px] transition-all duration-300',
                          isActive
                            ? 'stroke-[2.5px] text-emerald-600 dark:text-emerald-400'
                            : 'stroke-[1.5px]'
                        )}
                      />
                      {badgeCount > 0 && (
                        <span className={cn(
                          'absolute -top-2 -right-3 flex h-[18px] min-w-[18px] items-center justify-center',
                          'rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white',
                          'text-[9px] font-bold px-1 ring-2 ring-background/80',
                          'animate-[badgePop_0.3s_ease-[cubic-bezier(0.34,1.56,0.64,1)]]'
                        )}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'text-[10px] leading-tight transition-all duration-300 relative z-10',
                      isActive
                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                        : 'font-medium'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* "Lainnya" Bottom Sheet */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] p-0 border-t-0">
          <SheetTitle className="sr-only">Menu Lainnya</SheetTitle>
          <SheetHeader className="px-6 pt-6 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                  <Menu className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Menu Lainnya</h2>
                  <p className="text-xs text-muted-foreground">{moreItems.length} menu tersedia</p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0"
              >
                {moreItems.length}
              </Badge>
            </div>
          </SheetHeader>
          {/* Gradient separator */}
          <div className="h-px mx-6 bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="overflow-y-auto max-h-[55vh] px-5 py-5 pb-10">
            <div className="space-y-6">
              {moreGroups.map((group, groupIdx) => (
                <div key={group}>
                  <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600/70 dark:text-emerald-400/70">
                    {group}
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {moreItems
                      .filter(item => item.group === group)
                      .map((item) => {
                        const Icon = item.icon
                        const isActive = currentPage === item.key

                        return (
                          <button
                            key={item.key}
                            onClick={() => handleMoreNavClick(item.key)}
                            className={cn(
                              'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                              'active:scale-95 active:duration-75 min-h-[80px]',
                              'border',
                              isActive
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5'
                                : 'bg-card border-border/50 text-muted-foreground hover:bg-accent hover:border-border hover:text-foreground'
                            )}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <div className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300',
                              isActive
                                ? 'bg-emerald-500/15'
                                : 'bg-muted/50'
                            )}>
                              <Icon
                                className={cn(
                                  'h-5 w-5 transition-all duration-300',
                                  isActive ? 'stroke-[2.5px] text-emerald-600 dark:text-emerald-400' : 'stroke-[1.5px]'
                                )}
                              />
                            </div>
                            <span
                              className={cn(
                                'text-[11px] leading-tight text-center',
                                isActive ? 'font-bold' : 'font-medium'
                              )}
                            >
                              {item.label}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* QR Scanner for mobile - available for BENGKEL and ADMIN roles */}
      {(userRole === 'BENGKEL' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
        <button
          onClick={() => setShowQrScanner(true)}
          className={cn(
            'fixed z-50 md:hidden',
            'bottom-[76px] right-4',
            'flex h-12 w-12 items-center justify-center',
            'rounded-full shadow-lg shadow-teal-500/30',
            'bg-gradient-to-br from-teal-500 to-emerald-600 text-white',
            'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            'active:scale-90 active:duration-100',
            'hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105'
          )}
          aria-label="Scan QR Kendaraan"
        >
          <ScanLine className="h-5 w-5 stroke-[2.5px]" />
        </button>
      )}

      <QrScanner open={showQrScanner} onOpenChange={setShowQrScanner} />

      {/* Custom keyframes for badge animation */}
      <style jsx global>{`
        @keyframes badgePop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  )
}
