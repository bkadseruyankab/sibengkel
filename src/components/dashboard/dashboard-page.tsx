'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import {
  Bike, Car, Wrench, CheckCircle2, Wallet, TrendingUp, PiggyBank,
  AlertTriangle, Clock, Bell, ArrowUpRight, ArrowDownRight,
  RefreshCw, Activity, Building2, Eye, FileCheck, FileX,
  Sun, Moon, CloudSun, Sparkles, ScanLine
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4']

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 11) return { text: 'Selamat Pagi', icon: Sun, iconColor: 'text-amber-500' }
  if (hour < 15) return { text: 'Selamat Siang', icon: CloudSun, iconColor: 'text-orange-500' }
  if (hour < 18) return { text: 'Selamat Sore', icon: CloudSun, iconColor: 'text-rose-500' }
  return { text: 'Selamat Malam', icon: Moon, iconColor: 'text-indigo-400' }
}

function StatCard({ title, value, icon: Icon, gradient, subtitle, trend }: {
  title: string; value: string | number; icon: React.ElementType
  gradient: string; subtitle?: string; trend?: 'up' | 'down'
}) {
  return (
    <Card className="group relative overflow-hidden border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      <div className={`absolute inset-0 ${gradient} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-300`} />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
                {trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                {subtitle}
              </p>
            )}
          </div>
          <div className={`rounded-2xl p-3.5 ${gradient} text-white shadow-lg shrink-0`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md px-4 py-3 shadow-xl">
      {label && <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const userRole = user?.role || 'ADMIN'
  const bengkelId = user?.bengkelId
  const userId = user?.id

  const [tahun, setTahun] = useState(new Date().getFullYear().toString())
  const [bulan, setBulan] = useState('all')
  const [jenisKendaraan, setJenisKendaraan] = useState('all')

  const isBengkel = userRole === 'BENGKEL'
  const isPimpinan = userRole === 'PIMPINAN'
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole)

  const greeting = useMemo(() => getGreeting(), [])
  const GreetingIcon = greeting.icon

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', tahun, bulan, jenisKendaraan, userRole, bengkelId, userId],
    queryFn: async () => {
      const params = new URLSearchParams({ tahun, role: userRole })
      if (bulan !== 'all') params.set('bulan', bulan)
      if (jenisKendaraan !== 'all') params.set('jenisKendaraan', jenisKendaraan)
      if (bengkelId) params.set('bengkelId', bengkelId)
      if (userId) params.set('userId', userId)
      const res = await fetch(`/api/dashboard?${params}`)
      return res.json()
    },
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-2xl" />
          <Skeleton className="h-4 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  const stats = data || {}

  return (
    <div className="space-y-8">
      {/* Greeting & Header Section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <GreetingIcon className={`h-7 w-7 ${greeting.iconColor}`} />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting.text}, <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">{user?.name || 'Pengguna'}</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground pl-[38px]">
          {isBengkel
            ? 'Ringkasan service kendaraan di bengkel Anda'
            : isPimpinan
            ? 'Ringkasan keseluruhan service kendaraan operasional dinas'
            : 'Ringkasan data service kendaraan operasional dinas'}
        </p>
      </div>

      {/* Role Indicator Banner */}
      {isBengkel && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50/80 to-amber-100/60 dark:from-amber-950/20 dark:to-amber-900/10 border border-amber-200/60 dark:border-amber-800/40 backdrop-blur-sm p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">Mode Bengkel</h2>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Anda hanya dapat melihat data service yang ditugaskan ke bengkel Anda
              </p>
            </div>
          </div>
        </div>
      )}

      {isPimpinan && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50/80 to-emerald-100/60 dark:from-emerald-950/20 dark:to-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/40 backdrop-blur-sm p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Mode Pimpinan (Read Only)</h2>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Anda dapat melihat semua data dan laporan dalam mode hanya baca
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Quick Scan Card */}
          {(isAdmin || isBengkel) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-teal-200 dark:border-teal-800 text-xs gap-1.5 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 dark:hover:bg-teal-950/30 dark:hover:text-teal-400 dark:hover:border-teal-700 transition-colors"
              onClick={() => {
                // Trigger QR scanner via a custom event
                const event = new CustomEvent('open-qr-scanner')
                window.dispatchEvent(event)
              }}
            >
              <ScanLine className="h-3.5 w-3.5" />
              Scan QR
            </Button>
          )}
          <div className="flex items-center gap-1.5 bg-muted/60 backdrop-blur-sm rounded-xl p-1 border border-border/30">
            <Select value={tahun} onValueChange={setTahun}>
              <SelectTrigger className="w-[100px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0 px-3 hover:bg-background/80 rounded-lg">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-px h-4 bg-border/50" />
            <Select value={bulan} onValueChange={setBulan}>
              <SelectTrigger className="w-[130px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0 px-3 hover:bg-background/80 rounded-lg">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
                  .map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            {!isBengkel && (
              <>
                <div className="w-px h-4 bg-border/50" />
                <Select value={jenisKendaraan} onValueChange={setJenisKendaraan}>
                  <SelectTrigger className="w-[130px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0 px-3 hover:bg-background/80 rounded-lg">
                    <SelectValue placeholder="Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    <SelectItem value="RODA_2">Roda 2</SelectItem>
                    <SelectItem value="RODA_4">Roda 4</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-xl border-border/50 text-xs hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 dark:hover:bg-teal-950/30 dark:hover:text-teal-400 dark:hover:border-teal-800 transition-colors"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isBengkel ? (
          <>
            <StatCard
              title="Perlu Ditindaklanjuti"
              value={(stats.statusCounts?.diajukan || 0) + (stats.statusCounts?.ditolak || 0)}
              icon={Wrench}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
              subtitle="Diajukan / Ditolak - Perlu pengajuan"
            />
            <StatCard
              title="Menunggu Persetujuan"
              value={(stats.statusCounts?.pengajuan || 0) + (stats.statusCounts?.menungguPersetujuan || 0)}
              icon={FileCheck}
              gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
              subtitle="Menunggu approval admin"
            />
            <StatCard
              title="Sedang Dikerjakan"
              value={(stats.statusCounts?.disetujui || 0) + (stats.statusCounts?.diproses || 0)}
              icon={Activity}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
              subtitle="Siap dikerjakan / Dalam proses"
              trend="up"
            />
            <StatCard
              title="Selesai"
              value={stats.statusCounts?.selesai || 0}
              icon={CheckCircle2}
              gradient="bg-gradient-to-br from-purple-500 to-pink-600"
              subtitle="Perbaikan selesai"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Kendaraan Roda 2"
              value={stats.totalKendaraanRoda2 || 0}
              icon={Bike}
              gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
              subtitle="Motor / Sepeda"
            />
            <StatCard
              title="Kendaraan Roda 4"
              value={stats.totalKendaraanRoda4 || 0}
              icon={Car}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
              subtitle="Mobil / Pick Up"
            />
            <StatCard
              title="Aktif Service"
              value={stats.kendaraanAktifService || 0}
              icon={Wrench}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
              subtitle="Sedang diproses"
            />
            <StatCard
              title="Selesai Service"
              value={stats.kendaraanSelesaiService || 0}
              icon={CheckCircle2}
              gradient="bg-gradient-to-br from-purple-500 to-pink-600"
              subtitle="Perbaikan selesai"
              trend="up"
            />
          </>
        )}
      </div>

      {/* Budget Cards - Not shown for BENGKEL */}
      {!isBengkel && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="relative overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700/5 to-slate-900/5 group-hover:from-slate-700/10 group-hover:to-slate-900/10 transition-colors" />
            <CardContent className="relative p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl p-3.5 bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg">
                  <Wallet className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Total Anggaran {tahun}</p>
                  <p className="text-xl font-bold tracking-tight mt-0.5">{formatCurrency(stats.totalAnggaranTahun || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 group-hover:from-orange-500/10 group-hover:to-red-500/10 transition-colors" />
            <CardContent className="relative p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl p-3.5 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shrink-0">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Anggaran Terpakai</p>
                    {(stats.totalAnggaranTahun > 0) && (
                      <Badge
                        variant={((stats.totalAnggaranTerpakai / stats.totalAnggaranTahun) * 100) > 80 ? 'destructive' : 'default'}
                        className={`text-xs font-bold px-2.5 py-0.5 shrink-0 ${
                          ((stats.totalAnggaranTerpakai / stats.totalAnggaranTahun) * 100) > 80
                            ? ''
                            : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0'
                        }`}
                      >
                        {Math.round((stats.totalAnggaranTerpakai / stats.totalAnggaranTahun) * 100)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl font-bold tracking-tight mt-0.5">{formatCurrency(stats.totalAnggaranTerpakai || 0)}</p>
                </div>
              </div>
              {(stats.totalAnggaranTahun > 0) && (
                <div className="mt-4 relative">
                  <Progress
                    value={(stats.totalAnggaranTerpakai / stats.totalAnggaranTahun) * 100}
                    className="h-2 rounded-full"
                  />
                  <div
                    className="absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                    style={{ width: `${Math.min((stats.totalAnggaranTerpakai / stats.totalAnggaranTahun) * 100, 100)}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 group-hover:from-teal-500/10 group-hover:to-emerald-500/10 transition-colors" />
            <CardContent className="relative p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl p-3.5 bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shrink-0">
                  <PiggyBank className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Sisa Anggaran</p>
                  <p className="text-xl font-bold tracking-tight mt-0.5 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                    {formatCurrency(stats.sisaAnggaran || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts - Only for Admin/SuperAdmin/Pimpinan */}
      {!isBengkel && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/20 dark:to-emerald-950/10 px-6 py-4 border-b border-border/30">
              <CardTitle className="text-sm font-semibold text-teal-800 dark:text-teal-300">Pengeluaran Service Bulanan</CardTitle>
              <CardDescription className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-0.5">12 bulan terakhir</CardDescription>
            </div>
            <CardContent className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.pengeluaranBulanan || []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                    <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} name="Pengeluaran" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/20 dark:to-emerald-950/10 px-6 py-4 border-b border-border/30">
              <CardTitle className="text-sm font-semibold text-teal-800 dark:text-teal-300">Kendaraan Paling Sering Service</CardTitle>
              <CardDescription className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-0.5">Top 5 kendaraan</CardDescription>
            </div>
            <CardContent className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.kendaraanSeringService || []} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="nomorPolisi" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total" fill="#0d9488" radius={[0, 6, 6, 0]} name="Jumlah Service" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Section: Notifications + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <Card className="border border-border/50 shadow-sm overflow-hidden bg-background/80 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/20 dark:to-emerald-950/10 px-6 py-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-1.5 bg-teal-100 dark:bg-teal-900/40">
                <Bell className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <CardTitle className="text-sm font-semibold text-teal-800 dark:text-teal-300">Notifikasi Terbaru</CardTitle>
              {stats.notifikasiCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-2 py-0.5 ml-auto rounded-full">{stats.notifikasiCount}</Badge>
              )}
            </div>
          </div>
          <CardContent className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {(stats.notifikasiTerbaru?.length > 0) ? stats.notifikasiTerbaru.map((n: any) => (
              <div
                key={n.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-background/60 hover:bg-muted/40 transition-colors duration-200 border-l-[3px] ${
                  n.type === 'ERROR' ? 'border-l-red-500' :
                  n.type === 'WARNING' ? 'border-l-amber-500' :
                  n.type === 'SUCCESS' ? 'border-l-emerald-500' :
                  'border-l-blue-500'
                }"
              >
                <div className={`rounded-xl p-2 shrink-0 ${
                  n.type === 'ERROR' ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
                  n.type === 'WARNING' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' :
                  n.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' :
                  'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                }`}>
                  {n.type === 'ERROR' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                   n.type === 'WARNING' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                   n.type === 'SUCCESS' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   <Bell className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="rounded-2xl p-4 bg-muted/30 mb-3">
                  <Bell className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Tidak ada notifikasi baru</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Semua notifikasi sudah terbaca</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card className="border border-border/50 shadow-sm overflow-hidden bg-background/80 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/10 px-6 py-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-1.5 bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300">Alert & Peringatan</CardTitle>
            </div>
          </div>
          <CardContent className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {/* Over Budget Alerts */}
            {(stats.alertOverBudget?.length > 0) && stats.alertOverBudget.map((a: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-red-50/80 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 border-l-[3px] border-l-red-500"
              >
                <div className="rounded-xl p-2 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 shrink-0">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">
                    {a.nomorPolisi} - Anggaran {a.persen}% terpakai
                  </p>
                  <p className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-0.5">
                    Terpakai {formatCurrency(a.total)} dari {formatCurrency(a.anggaran)}
                  </p>
                </div>
                <Badge variant="destructive" className="text-[10px] shrink-0 rounded-full font-bold px-2">{a.persen}%</Badge>
              </div>
            ))}

            {/* Late Service Alerts */}
            {(stats.alertTerlambat?.length > 0) && stats.alertTerlambat.map((a: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 border-l-[3px] border-l-amber-500"
              >
                <div className="rounded-xl p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {a.nomorPolisi} - Terlambat {a.hariTerlambat} hari
                  </p>
                  <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                    Estimasi: {a.estimasi}
                  </p>
                </div>
                <Badge className="bg-amber-500 text-white text-[10px] shrink-0 rounded-full font-bold px-2">Terlambat</Badge>
              </div>
            ))}

            {(stats.alertOverBudget?.length === 0 && stats.alertTerlambat?.length === 0) && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="rounded-2xl p-4 bg-emerald-50 dark:bg-emerald-950/20 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Tidak ada peringatan saat ini</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Semua berjalan normal</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Perbaikan */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/20 dark:to-emerald-950/10 px-6 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="rounded-lg p-1.5 bg-teal-100 dark:bg-teal-900/40">
              <Activity className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-teal-800 dark:text-teal-300">
                {isBengkel ? 'Progress Perbaikan di Bengkel Anda' : 'Progress Perbaikan Kendaraan'}
              </CardTitle>
              <CardDescription className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-0.5">
                {isBengkel ? 'Kendaraan yang sedang dalam proses perbaikan di bengkel Anda' : 'Kendaraan yang sedang dalam proses perbaikan'}
              </CardDescription>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          {(stats.progressPerbaikan?.length > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.progressPerbaikan.map((p: any) => (
                <div
                  key={p.id}
                  className="group relative p-5 rounded-2xl bg-background border border-border/50 hover:shadow-md hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg p-1.5 bg-teal-50 dark:bg-teal-900/20">
                        <Car className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <span className="text-sm font-bold text-primary">{p.nomorPolisi}</span>
                    </div>
                    <Badge
                      variant={p.statusService === 'DIPROSES' ? 'default' : 'secondary'}
                      className={`text-[10px] font-semibold ${
                        p.statusService === 'DIPROSES'
                          ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0'
                          : ''
                      }`}
                    >
                      {p.statusService}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-0.5">{p.merk} • {p.bengkel}</p>
                  <p className="text-[11px] text-muted-foreground/70 mb-4">{p.nomorService}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Progress</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{p.progress}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={p.progress} className="h-2.5 rounded-full" />
                      <div
                        className="absolute top-0 left-0 h-2.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(p.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  {p.estimasiLamaPerbaikan && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
                      <Clock className="h-3 w-3 text-muted-foreground/60" />
                      <p className="text-[11px] text-muted-foreground/70">
                        Estimasi: {p.estimasiLamaPerbaikan} hari
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-2xl p-5 bg-muted/20 mb-3">
                <Wrench className="h-10 w-10 text-muted-foreground/25" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {isBengkel ? 'Tidak ada kendaraan dalam proses perbaikan di bengkel Anda' : 'Tidak ada kendaraan dalam proses perbaikan'}
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">Data akan muncul ketika ada service aktif</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bengkel Statistics - Only for Admin */}
      {isAdmin && (
        <Card className="border border-border/50 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/20 dark:to-emerald-950/10 px-6 py-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-1.5 bg-teal-100 dark:bg-teal-900/40">
                <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <CardTitle className="text-sm font-semibold text-teal-800 dark:text-teal-300">Statistik Bengkel</CardTitle>
            </div>
          </div>
          <CardContent className="p-6">
            {(stats.statistikBengkel?.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.statistikBengkel.map((b: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-5 rounded-2xl bg-background border border-border/50 hover:shadow-md hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-300 group"
                  >
                    <div className="rounded-2xl p-3 bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{b.nama}</p>
                      <p className="text-2xl font-bold tracking-tight">{b.total} <span className="text-xs font-normal text-muted-foreground">service</span></p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="rounded-2xl p-4 bg-muted/20 mb-3">
                  <Building2 className="h-8 w-8 text-muted-foreground/25" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Tidak ada data bengkel</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
