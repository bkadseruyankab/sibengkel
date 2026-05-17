'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle, Clock, Filter, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string; accentColor: string }> = {
  INFO: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', borderColor: 'border-blue-200 dark:border-blue-800', accentColor: 'border-l-blue-500' },
  WARNING: { icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', borderColor: 'border-yellow-200 dark:border-yellow-800', accentColor: 'border-l-yellow-500' },
  ERROR: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', borderColor: 'border-red-200 dark:border-red-800', accentColor: 'border-l-red-500' },
  SUCCESS: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', borderColor: 'border-green-200 dark:border-green-800', accentColor: 'border-l-emerald-500' },
}

function getRelativeTime(date: string) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit yang lalu`
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  if (diffDays < 7) return `${diffDays} hari yang lalu`
  return past.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function NotifikasiPage() {
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ['notifikasi', filterType, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (filterType !== 'all') params.set('type', filterType)
      const res = await fetch(`/api/notifikasi?${params}`)
      return res.json()
    },
  })

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifikasi/${id}/read`, { method: 'PUT' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifikasi'] })
    },
  })

  // Mark all as read mutation
  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifikasi/read-all', { method: 'PUT' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifikasi'] })
      toast.success('Semua notifikasi telah ditandai dibaca')
    },
  })

  const handleNotificationClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
              <Bell className="h-5 w-5" />
            </div>
            Notifikasi
            {unreadCount > 0 && (
              <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 animate-bounce-in shadow-sm">{unreadCount} belum dibaca</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Pemberitahuan dan alert sistem</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
          className="gap-2 rounded-xl border-border/50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-all duration-200"
        >
          <CheckCheck className="h-4 w-4" />
          Tandai Semua Dibaca
        </Button>
      </div>

      {/* Filter */}
      <Card className="animate-slide-up animate-stagger-1 border border-border/50 shadow-sm card-hover">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1) }}>
              <SelectTrigger className="w-48 rounded-xl border-border/50">
                <SelectValue placeholder="Filter jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARNING">Peringatan</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="SUCCESS">Berhasil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification List */}
      <Card className="animate-slide-up animate-stagger-2 border border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/30 mb-4">
                <Bell className="h-10 w-10 opacity-30" />
              </div>
              <p className="text-lg font-medium">Tidak ada notifikasi</p>
              <p className="text-sm mt-1">Notifikasi akan muncul di sini</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px] thin-scrollbar">
              <div className="divide-y divide-border/50">
                {notifications.map((notif: any, index: number) => {
                  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.INFO
                  const Icon = config.icon
                  const staggerClass = index < 8 ? `animate-stagger-${index + 1}` : ''
                  return (
                    <div
                      key={notif.id}
                      className={`animate-slide-up ${staggerClass} flex gap-3 p-4 cursor-pointer transition-all duration-200 hover:bg-muted/40 border-l-[3px] ${config.accentColor} ${
                        !notif.isRead ? 'bg-primary/[0.03]' : ''
                      }`}
                      onClick={() => handleNotificationClick(notif.id, notif.isRead)}
                    >
                      {/* Unread indicator */}
                      <div className="flex flex-col items-center pt-1">
                        {!notif.isRead && (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 animate-pulse shadow-sm shadow-primary/30" />
                        )}
                      </div>
                      {/* Icon */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bgColor} ${config.borderColor} border transition-transform duration-200 group-hover:scale-105`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notif.isRead ? 'font-semibold' : 'font-medium'}`}>
                              {notif.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] shrink-0 rounded-lg ${config.color} ${config.borderColor}`}>
                            {notif.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{getRelativeTime(notif.createdAt)}</span>
                          {!notif.isRead && (
                            <button
                              className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors duration-150 rounded-md px-2 py-0.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead.mutate(notif.id)
                              }}
                            >
                              Tandai dibaca
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(data?.pagination?.totalPages || 0) > 1 && (
        <div className="animate-slide-up animate-stagger-3 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded-xl border-border/50"
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground px-3 py-1 rounded-lg bg-muted/40">
            Hal {page} dari {data?.pagination?.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (data?.pagination?.totalPages || 1)}
            onClick={() => setPage(p => p + 1)}
            className="rounded-xl border-border/50"
          >
            Selanjutnya
          </Button>
        </div>
      )}
    </div>
  )
}
