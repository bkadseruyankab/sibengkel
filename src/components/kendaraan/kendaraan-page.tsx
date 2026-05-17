'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus, Search, Filter, Edit2, Trash2, Eye, Download, Upload,
  X, FileText, Bike, Car, ChevronLeft, ChevronRight, MoreHorizontal,
  Wallet, DollarSign, TrendingUp, TrendingDown, AlertCircle, PackageOpen,
  Gauge, CheckCircle2, XCircle, AlertTriangle, Wrench, Hash, Palette, Clock,
  QrCode, Printer, Copy
} from 'lucide-react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useRef } from 'react'

const vehicleSchema = z.object({
  nomorPolisi: z.string().min(1, 'Nomor polisi wajib diisi'),
  namaPengguna: z.string().min(1, 'Nama pengguna wajib diisi'),
  skpdBidang: z.string().min(1, 'SKPD/Bidang wajib diisi'),
  jenisKendaraan: z.enum(['RODA_2', 'RODA_4']),
  merk: z.string().min(1, 'Merk wajib diisi'),
  type: z.string().min(1, 'Type wajib diisi'),
  tahun: z.coerce.number().min(2000, 'Tahun minimal 2000').max(2030, 'Tahun maksimal 2030'),
  nomorRangka: z.string().optional(),
  nomorMesin: z.string().optional(),
  warna: z.string().optional(),
  statusKendaraan: z.enum(['AKTIF', 'NONAKTIF', 'RUSAK']),
  kondisiKendaraan: z.enum(['BAIK', 'KURANG_BAIK', 'RUSAK']),
  kilometerTerakhir: z.coerce.number().min(0, 'Kilometer tidak boleh negatif'),
})

type VehicleForm = z.infer<typeof vehicleSchema>

const statusColors: Record<string, string> = {
  AKTIF: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  NONAKTIF: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  RUSAK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}
const kondisiColors: Record<string, string> = {
  BAIK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  KURANG_BAIK: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RUSAK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabels: Record<string, string> = {
  AKTIF: 'Aktif',
  NONAKTIF: 'Nonaktif',
  RUSAK: 'Rusak',
}

const kondisiLabels: Record<string, string> = {
  BAIK: 'Baik',
  KURANG_BAIK: 'Kurang Baik',
  RUSAK: 'Rusak',
}

export function KendaraanPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [jenisFilter, setJenisFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showQrCode, setShowQrCode] = useState(false)
  const [qrData, setQrData] = useState<{ hash: string; qrUrl: string } | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const qrCanvasRef = useRef<HTMLDivElement>(null)
  const limit = 10

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch vehicles
  const { data, isLoading } = useQuery({
    queryKey: ['kendaraan', page, debouncedSearch, jenisFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (jenisFilter !== 'all') params.set('jenisKendaraan', jenisFilter)
      if (statusFilter !== 'all') params.set('statusKendaraan', statusFilter)
      const res = await fetch(`/api/kendaraan?${params}`)
      return res.json()
    },
  })

  // Fetch vehicle detail
  const { data: detailData } = useQuery({
    queryKey: ['kendaraan-detail', selectedVehicle?.id],
    queryFn: async () => {
      const res = await fetch(`/api/kendaraan/${selectedVehicle.id}`)
      return res.json()
    },
    enabled: !!selectedVehicle && showDetail,
  })

  // Create vehicle
  const createMutation = useMutation({
    mutationFn: async (data: VehicleForm) => {
      const res = await fetch('/api/kendaraan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menambah kendaraan') }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Kendaraan berhasil ditambahkan')
      queryClient.invalidateQueries({ queryKey: ['kendaraan'] })
      setShowAdd(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Update vehicle
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleForm> }) => {
      const res = await fetch(`/api/kendaraan/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengubah kendaraan') }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Kendaraan berhasil diperbarui')
      queryClient.invalidateQueries({ queryKey: ['kendaraan'] })
      setShowEdit(false)
      setSelectedVehicle(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Delete vehicle
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/kendaraan/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus kendaraan')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Kendaraan berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['kendaraan'] })
    },
    onError: () => toast.error('Gagal menghapus kendaraan'),
  })

  // Form
  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      nomorPolisi: '', namaPengguna: '', skpdBidang: '', jenisKendaraan: 'RODA_4',
      merk: '', type: '', tahun: 2024, nomorRangka: '', nomorMesin: '', warna: '',
      statusKendaraan: 'AKTIF', kondisiKendaraan: 'BAIK', kilometerTerakhir: 0,
    },
  })

  const openEdit = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    form.reset({
      nomorPolisi: vehicle.nomorPolisi, namaPengguna: vehicle.namaPengguna,
      skpdBidang: vehicle.skpdBidang, jenisKendaraan: vehicle.jenisKendaraan,
      merk: vehicle.merk, type: vehicle.type, tahun: vehicle.tahun,
      nomorRangka: vehicle.nomorRangka || '', nomorMesin: vehicle.nomorMesin || '',
      warna: vehicle.warna || '', statusKendaraan: vehicle.statusKendaraan,
      kondisiKendaraan: vehicle.kondisiKendaraan, kilometerTerakhir: vehicle.kilometerTerakhir,
    })
    setShowEdit(true)
  }

  const openDetail = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setShowDetail(true)
  }

  const onSubmit = (data: VehicleForm) => {
    if (showEdit && selectedVehicle) {
      updateMutation.mutate({ id: selectedVehicle.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const vehicles = data?.data || []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  // Compute stat counts from data
  const statAktif = vehicles.filter((v: any) => v.statusKendaraan === 'AKTIF').length
  const statNonaktif = vehicles.filter((v: any) => v.statusKendaraan === 'NONAKTIF').length
  const statRusak = vehicles.filter((v: any) => v.statusKendaraan === 'RUSAK').length
  const statRoda4 = vehicles.filter((v: any) => v.jenisKendaraan === 'RODA_4').length
  const statRoda2 = vehicles.filter((v: any) => v.jenisKendaraan === 'RODA_2').length

  return (
    <div className="space-y-6">
      {/* Header - Animated */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 dark:bg-teal-400/10">
              <Car className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
            </div>
            Data Kendaraan
            <Badge variant="secondary" className="text-xs font-medium">{total} unit</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 ml-10">Kelola data kendaraan operasional dinas</p>
        </div>
        <Button onClick={() => { form.reset(); setShowAdd(true) }} className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" /> Tambah Kendaraan
        </Button>
      </div>

      {/* Stat Cards - Animated with stagger */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="rounded-2xl border border-border/50 shadow-sm card-hover animate-slide-up animate-stagger-1">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 dark:bg-teal-400/10 shrink-0">
                <Car className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Total</p>
                <p className="text-2xl font-bold leading-tight">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/50 shadow-sm card-hover animate-slide-up animate-stagger-2">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 dark:bg-emerald-400/10 shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Aktif</p>
                <p className="text-2xl font-bold leading-tight text-emerald-600 dark:text-emerald-400">{statAktif}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/50 shadow-sm card-hover animate-slide-up animate-stagger-3">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/10 dark:bg-amber-400/10 shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Nonaktif</p>
                <p className="text-2xl font-bold leading-tight text-amber-600 dark:text-amber-400">{statNonaktif}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/50 shadow-sm card-hover animate-slide-up animate-stagger-4">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 dark:bg-red-400/10 shrink-0">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Rusak</p>
                <p className="text-2xl font-bold leading-tight text-red-600 dark:text-red-400">{statRusak}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search/Filter Bar - Glassmorphism */}
      <div className="flex flex-col sm:flex-row gap-3 bg-muted/30 backdrop-blur-sm rounded-xl p-3 border border-border/30 animate-slide-up animate-stagger-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor polisi, nama, merk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg h-9 bg-background/60 border-border/40 focus:border-teal-500/50 focus:ring-teal-500/20"
          />
        </div>
        <Select value={jenisFilter} onValueChange={(v) => { setJenisFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[150px] rounded-lg h-9 bg-background/60 border-border/40">
            <SelectValue placeholder="Jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            <SelectItem value="RODA_2">Roda 2</SelectItem>
            <SelectItem value="RODA_4">Roda 4</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[150px] rounded-lg h-9 bg-background/60 border-border/40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="AKTIF">Aktif</SelectItem>
            <SelectItem value="NONAKTIF">Nonaktif</SelectItem>
            <SelectItem value="RUSAK">Rusak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table - Modernized */}
      <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden animate-slide-up animate-stagger-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border/40">
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">No</th>
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Nomor Polisi</th>
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Pengguna</th>
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider hidden md:table-cell">SKPD/Bidang</th>
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Jenis</th>
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Merk/Type</th>
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Tahun</th>
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Kondisi</th>
                <th className="text-left p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider hidden xl:table-cell">KM</th>
                <th className="text-right p-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30 even:bg-muted/10">
                    <td colSpan={11} className="p-3">
                      <div className="skeleton-shimmer h-8 w-full rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-0">
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40">
                        <PackageOpen className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Tidak ada data kendaraan</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Coba ubah filter atau tambahkan kendaraan baru</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                vehicles.map((v: any, i: number) => (
                  <tr
                    key={v.id}
                    className={`border-b border-border/30 hover:bg-muted/30 transition-colors duration-150 cursor-pointer even:bg-muted/10`}
                    onClick={() => openDetail(v)}
                  >
                    <td className="p-3 text-xs text-muted-foreground">{(page - 1) * limit + i + 1}</td>
                    <td className="p-3 font-semibold text-xs">{v.nomorPolisi}</td>
                    <td className="p-3 text-xs">{v.namaPengguna}</td>
                    <td className="p-3 text-xs hidden md:table-cell text-muted-foreground">{v.skpdBidang}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] gap-1 rounded-md">
                        {v.jenisKendaraan === 'RODA_2' ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                        {v.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs hidden lg:table-cell">{v.merk} {v.type}</td>
                    <td className="p-3 text-xs hidden lg:table-cell">{v.tahun}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusColors[v.statusKendaraan] || ''}`}>
                        {statusLabels[v.statusKendaraan] || v.statusKendaraan}
                      </span>
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold ${kondisiColors[v.kondisiKendaraan] || ''}`}>
                        {kondisiLabels[v.kondisiKendaraan] || v.kondisiKendaraan}
                      </span>
                    </td>
                    <td className="p-3 text-xs hidden xl:table-cell text-muted-foreground">{v.kilometerTerakhir?.toLocaleString()} km</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-teal-600/10 hover:text-teal-600 dark:hover:text-teal-400" onClick={() => openDetail(v)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-amber-600/10 hover:text-amber-600 dark:hover:text-amber-400" onClick={() => openEdit(v)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-xl animate-scale-in">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Kendaraan?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Kendaraan {v.nomorPolisi} akan dinonaktifkan. Data tidak akan dihapus permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(v.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border/30 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Menampilkan <span className="font-medium">{vehicles.length}</span> dari <span className="font-medium">{total}</span> data
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg h-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold px-2">{page} <span className="text-muted-foreground font-normal">/</span> {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg h-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || showEdit} onOpenChange={(open) => { if (!open) { setShowAdd(false); setShowEdit(false); setSelectedVehicle(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600/10 dark:bg-teal-400/10">
                {showEdit ? <Edit2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> : <Plus className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
              </div>
              {showEdit ? 'Edit Kendaraan' : 'Tambah Kendaraan'}
            </DialogTitle>
            <DialogDescription>
              {showEdit ? 'Perbarui informasi kendaraan' : 'Isi data kendaraan baru'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nomor Polisi *</Label>
                <Input {...form.register('nomorPolisi')} placeholder="D 1234 AB" className="h-9 rounded-lg" />
                {form.formState.errors.nomorPolisi && <p className="text-[10px] text-destructive">{form.formState.errors.nomorPolisi.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nama Pengguna *</Label>
                <Input {...form.register('namaPengguna')} placeholder="Nama pengguna" className="h-9 rounded-lg" />
                {form.formState.errors.namaPengguna && <p className="text-[10px] text-destructive">{form.formState.errors.namaPengguna.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">SKPD/Bidang *</Label>
                <Input {...form.register('skpdBidang')} placeholder="Bidang Keuangan" className="h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Jenis Kendaraan *</Label>
                <Select value={form.watch('jenisKendaraan')} onValueChange={(v) => form.setValue('jenisKendaraan', v as any)}>
                  <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RODA_2">Roda 2</SelectItem>
                    <SelectItem value="RODA_4">Roda 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Merk *</Label>
                <Input {...form.register('merk')} placeholder="Honda" className="h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Type *</Label>
                <Input {...form.register('type')} placeholder="Supra X 125" className="h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tahun *</Label>
                <Input {...form.register('tahun')} type="number" placeholder="2024" className="h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Warna</Label>
                <Input {...form.register('warna')} placeholder="Hitam" className="h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nomor Rangka</Label>
                <Input {...form.register('nomorRangka')} placeholder="MH1..." className="h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nomor Mesin</Label>
                <Input {...form.register('nomorMesin')} placeholder="NF..." className="h-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Status Kendaraan</Label>
                <Select value={form.watch('statusKendaraan')} onValueChange={(v) => form.setValue('statusKendaraan', v as any)}>
                  <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AKTIF">Aktif</SelectItem>
                    <SelectItem value="NONAKTIF">Nonaktif</SelectItem>
                    <SelectItem value="RUSAK">Rusak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Kondisi Kendaraan</Label>
                <Select value={form.watch('kondisiKendaraan')} onValueChange={(v) => form.setValue('kondisiKendaraan', v as any)}>
                  <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAIK">Baik</SelectItem>
                    <SelectItem value="KURANG_BAIK">Kurang Baik</SelectItem>
                    <SelectItem value="RUSAK">Rusak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium">Kilometer Terakhir</Label>
                <Input {...form.register('kilometerTerakhir')} type="number" placeholder="0" className="h-9 rounded-lg" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setShowEdit(false) }} className="rounded-lg">Batal</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-lg">
                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : showEdit ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet - Modernized */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetTitle className="sr-only">Detail Kendaraan</SheetTitle>
          {detailData ? (
            <div className="flex flex-col animate-fade-in">
              {/* Gradient Header - Better design */}
              <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-teal-900 px-6 py-6 text-white overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/10">
                      {detailData.jenisKendaraan === 'RODA_2' ? <Bike className="h-6 w-6" /> : <Car className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold">{detailData.nomorPolisi}</h2>
                      <p className="text-sm text-slate-300">{detailData.merk} {detailData.type} &bull; {detailData.tahun}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="outline" className="text-[10px] gap-1 bg-white/10 text-white border-white/20 rounded-lg">
                      {detailData.jenisKendaraan === 'RODA_2' ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                      {detailData.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}
                    </Badge>
                    <span className={'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ' + (statusColors[detailData.statusKendaraan] || '')}>
                      {statusLabels[detailData.statusKendaraan] || detailData.statusKendaraan}
                    </span>
                    <span className={'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ' + (kondisiColors[detailData.kondisiKendaraan] || '')}>
                      {kondisiLabels[detailData.kondisiKendaraan] || detailData.kondisiKendaraan}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Vehicle Info Card */}
                <Card className="rounded-2xl border border-border/50 shadow-sm bg-gradient-to-br from-card to-muted/20 animate-scale-in">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-5 rounded-full bg-teal-600 dark:bg-teal-400" />
                      <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Informasi Kendaraan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { icon: Car, label: 'Pengguna', value: detailData.namaPengguna },
                        { icon: FileText, label: 'SKPD/Bidang', value: detailData.skpdBidang },
                        { icon: Wrench, label: 'Merk / Tipe', value: `${detailData.merk} ${detailData.type}` },
                        { icon: Hash, label: 'Tahun', value: detailData.tahun },
                        { icon: Search, label: 'No. Rangka', value: detailData.nomorRangka || '-' },
                        { icon: Search, label: 'No. Mesin', value: detailData.nomorMesin || '-' },
                        { icon: Palette, label: 'Warna', value: detailData.warna || '-' },
                        { icon: Gauge, label: 'Kilometer', value: `${detailData.kilometerTerakhir?.toLocaleString()} km` },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 shrink-0 mt-0.5">
                            <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{item.label}</p>
                            <p className="font-semibold text-xs truncate">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Budget Info Section */}
                {detailData.budgets && detailData.budgets.length > 0 && (
                  <Card className="rounded-2xl border border-border/50 shadow-sm bg-gradient-to-br from-card to-emerald-50/20 dark:to-emerald-950/10 animate-scale-in">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                          <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Informasi Anggaran
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detailData.budgets.slice(0, 3).map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-border/30 hover:bg-muted/20 transition-colors text-sm">
                            <div>
                              <p className="font-medium text-xs">Tahun {b.tahun}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Realisasi: Rp {b.realisasi?.toLocaleString('id-ID')} / Rp {b.totalAnggaran?.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ' + (
                                b.statusAnggaran === 'AKTIF' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                b.statusAnggaran === 'HABIS' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              )}>
                                {b.statusAnggaran}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Documents Section */}
                <Card className="rounded-2xl border border-border/50 shadow-sm bg-gradient-to-br from-card to-muted/20 animate-scale-in">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-5 rounded-full bg-slate-600 dark:bg-slate-400" />
                      <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      Dokumen
                      {detailData.documents?.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] ml-auto rounded-lg">{detailData.documents.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailData.documents?.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.documents.map((doc: any) => {
                          const ext = doc.fileName?.split('.').pop()?.toLowerCase() || ''
                          const extColors: Record<string, string> = {
                            pdf: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                            doc: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            docx: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            jpg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                            jpeg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                            png: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                          }
                          return (
                            <div key={doc.id} className="flex items-center gap-3 text-sm p-2.5 rounded-xl border border-border/30 hover:bg-muted/30 transition-colors">
                              <Badge variant="outline" className={'text-[10px] font-bold rounded-md ' + (extColors[ext] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400')}>
                                .{ext.toUpperCase() || 'FILE'}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs truncate">{doc.fileName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {doc.jenisDokumen && (
                                    <span className="text-[10px] text-muted-foreground">{doc.jenisDokumen}</span>
                                  )}
                                  {doc.fileSize && (
                                    <span className="text-[10px] text-muted-foreground">{(doc.fileSize / 1024).toFixed(0)} KB</span>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
                          <FileText className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-xs text-muted-foreground">Belum ada dokumen</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Service History - Mini Timeline */}
                <Card className="rounded-2xl border border-border/50 shadow-sm bg-gradient-to-br from-card to-muted/20 animate-scale-in">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-5 rounded-full bg-teal-600 dark:bg-teal-400" />
                      <Wrench className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Riwayat Service
                      {detailData.services?.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] ml-auto rounded-lg">{detailData.services.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailData.services?.length > 0 ? (
                      <div className="relative pl-6">
                        {/* Timeline line */}
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-teal-500 to-slate-200 dark:from-teal-400 dark:to-slate-700" />
                        <div className="space-y-3">
                          {detailData.services.slice(0, 5).map((s: any, idx: number) => (
                            <div key={s.id} className="relative">
                              <div className={'absolute -left-4 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-800 z-10 ' + (idx === 0 ? 'bg-teal-600 dark:bg-teal-400' : 'bg-slate-300 dark:bg-slate-600')} />
                              <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 hover:bg-muted/20 transition-colors text-sm">
                                <div>
                                  <p className="font-medium text-xs">{s.nomorService}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(s.tanggalService).toLocaleDateString('id-ID')}
                                    {s.bengkel?.namaBengkel && (' \u2022 ' + s.bengkel.namaBengkel)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold">Rp {s.totalBiaya?.toLocaleString()}</span>
                                  <Badge variant="outline" className="text-[10px] rounded-md">{s.statusService}</Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {detailData.totalBiayaService > 0 && (
                          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/20 dark:to-emerald-950/10 border border-teal-200/30 dark:border-teal-800/30">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground font-medium">Total Biaya Service</span>
                              <span className="text-lg font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                                Rp {detailData.totalBiayaService?.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
                          <Wrench className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-xs text-muted-foreground">Belum ada riwayat service</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* QR Code Section */}
                <Card className="rounded-2xl border border-border/50 shadow-sm bg-gradient-to-br from-card to-muted/20 animate-scale-in">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-5 rounded-full bg-violet-600 dark:bg-violet-400" />
                      <QrCode className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      QR Code Kendaraan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center gap-3">
                      {detailData.qrCodeHash ? (
                        <>
                          <div className="p-3 bg-white rounded-xl border border-border/30 shadow-sm">
                            <QRCodeSVG
                              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/kendaraan/qr/${detailData.qrCodeHash}`}
                              size={160}
                              level="M"
                              includeMargin={false}
                              bgColor="#ffffff"
                              fgColor="#0f172a"
                            />
                          </div>
                          <div className="flex items-center gap-2 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 rounded-lg text-xs gap-1.5"
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/kendaraan/generate-qr', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ vehicleId: detailData.id }),
                                  })
                                  const data = await res.json()
                                  if (data.qrUrl) {
                                    setQrData({ hash: data.hash, qrUrl: data.qrUrl })
                                    setShowQrCode(true)
                                  }
                                } catch {
                                  toast.error('Gagal membuat QR code')
                                }
                              }}
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              Lihat QR
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 rounded-lg text-xs gap-1.5"
                              onClick={async () => {
                                try {
                                  setQrLoading(true)
                                  const res = await fetch('/api/kendaraan/generate-qr', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ vehicleId: detailData.id }),
                                  })
                                  const data = await res.json()
                                  if (data.qrUrl) {
                                    // Use canvas to generate downloadable PNG
                                    const canvas = document.createElement('canvas')
                                    const size = 400
                                    canvas.width = size + 80
                                    canvas.height = size + 120
                                    const ctx = canvas.getContext('2d')!
                                    // White background
                                    ctx.fillStyle = '#ffffff'
                                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                                    // Draw QR code using a temp element
                                    const tempDiv = document.createElement('div')
                                    document.body.appendChild(tempDiv)
                                    const root = await import('react-dom/client').then(m => m.createRoot(tempDiv))
                                    const React = await import('react')
                                    root.render(React.createElement(QRCodeCanvas, {
                                      value: `${window.location.origin}${data.qrUrl}`,
                                      size: size,
                                      level: 'M',
                                      bgColor: '#ffffff',
                                      fgColor: '#0f172a',
                                    }))
                                    await new Promise(r => setTimeout(r, 100))
                                    const qrCanvas = tempDiv.querySelector('canvas')
                                    if (qrCanvas) {
                                      ctx.drawImage(qrCanvas, 40, 20)
                                    }
                                    // Add text label below
                                    ctx.fillStyle = '#0f172a'
                                    ctx.font = 'bold 18px sans-serif'
                                    ctx.textAlign = 'center'
                                    ctx.fillText(detailData.nomorPolisi, canvas.width / 2, size + 50)
                                    ctx.font = '14px sans-serif'
                                    ctx.fillStyle = '#64748b'
                                    ctx.fillText(`${detailData.merk} ${detailData.type} | ${detailData.tahun}`, canvas.width / 2, size + 75)
                                    // Download
                                    const link = document.createElement('a')
                                    link.download = `QR-${detailData.nomorPolisi}.png`
                                    link.href = canvas.toDataURL('image/png')
                                    link.click()
                                    document.body.removeChild(tempDiv)
                                    root.unmount()
                                    toast.success('QR code berhasil diunduh')
                                  }
                                } catch {
                                  toast.error('Gagal mengunduh QR code')
                                } finally {
                                  setQrLoading(false)
                                }
                              }}
                              disabled={qrLoading}
                            >
                              <Download className="h-3.5 w-3.5" />
                              {qrLoading ? 'Memproses...' : 'Unduh PNG'}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20">
                            <QrCode className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                          <p className="text-xs text-muted-foreground text-center">QR code belum dibuat untuk kendaraan ini</p>
                          <Button
                            size="sm"
                            className="h-8 rounded-lg text-xs gap-1.5"
                            onClick={async () => {
                              try {
                                setQrLoading(true)
                                const res = await fetch('/api/kendaraan/generate-qr', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ vehicleId: detailData.id }),
                                })
                                const data = await res.json()
                                if (data.qrUrl) {
                                  await queryClient.invalidateQueries({ queryKey: ['kendaraan-detail'] })
                                  toast.success(data.existing ? 'QR code sudah ada' : 'QR code berhasil dibuat')
                                }
                              } catch {
                                toast.error('Gagal membuat QR code')
                              } finally {
                                setQrLoading(false)
                              }
                            }}
                            disabled={qrLoading}
                          >
                            {qrLoading ? 'Memproses...' : 'Buat QR Code'}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Edit Button */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-lg" onClick={() => { setShowDetail(false); openEdit(detailData) }}>
                    <Edit2 className="h-3.5 w-3.5" /> Edit Kendaraan
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="skeleton-shimmer h-40 w-full rounded-2xl" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-32 w-full rounded-2xl" />
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* QR Code Detail Dialog */}
      <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/10 dark:bg-violet-400/10">
                <QrCode className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              QR Code Kendaraan
            </DialogTitle>
            <DialogDescription>
              Cetak atau unduh QR code untuk ditempel pada kendaraan
            </DialogDescription>
          </DialogHeader>
          {qrData && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div ref={qrCanvasRef} className="p-4 bg-white rounded-xl border border-border/30 shadow-sm">
                <QRCodeSVG
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${qrData.qrUrl}`}
                  size={200}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{detailData?.nomorPolisi}</p>
                <p className="text-xs text-muted-foreground">{detailData?.merk} {detailData?.type} &bull; {detailData?.tahun}</p>
              </div>
              <div className="flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-lg text-xs gap-1.5"
                  onClick={async () => {
                    try {
                      const canvas = document.createElement('canvas')
                      const size = 400
                      canvas.width = size + 80
                      canvas.height = size + 120
                      const ctx = canvas.getContext('2d')!
                      ctx.fillStyle = '#ffffff'
                      ctx.fillRect(0, 0, canvas.width, canvas.height)
                      // Use QRCodeCanvas approach
                      const tempDiv = document.createElement('div')
                      document.body.appendChild(tempDiv)
                      const root = await import('react-dom/client').then(m => m.createRoot(tempDiv))
                      const React = await import('react')
                      root.render(React.createElement(QRCodeCanvas, {
                        value: `${window.location.origin}${qrData.qrUrl}`,
                        size: size,
                        level: 'M',
                        bgColor: '#ffffff',
                        fgColor: '#0f172a',
                      }))
                      await new Promise(r => setTimeout(r, 100))
                      const qrCanvas = tempDiv.querySelector('canvas')
                      if (qrCanvas) {
                        ctx.drawImage(qrCanvas, 40, 20)
                      }
                      ctx.fillStyle = '#0f172a'
                      ctx.font = 'bold 20px sans-serif'
                      ctx.textAlign = 'center'
                      ctx.fillText(detailData?.nomorPolisi || '', canvas.width / 2, size + 55)
                      ctx.font = '15px sans-serif'
                      ctx.fillStyle = '#64748b'
                      ctx.fillText(`${detailData?.merk} ${detailData?.type} | ${detailData?.tahun}`, canvas.width / 2, size + 80)
                      const link = document.createElement('a')
                      link.download = `QR-${detailData?.nomorPolisi}.png`
                      link.href = canvas.toDataURL('image/png')
                      link.click()
                      document.body.removeChild(tempDiv)
                      root.unmount()
                      toast.success('QR code berhasil diunduh')
                    } catch {
                      toast.error('Gagal mengunduh QR code')
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-lg text-xs gap-1.5"
                  onClick={async () => {
                    try {
                      // Copy QR URL to clipboard
                      const url = `${window.location.origin}${qrData.qrUrl}`
                      await navigator.clipboard.writeText(url)
                      toast.success('Link QR code disalin ke clipboard')
                    } catch {
                      toast.error('Gagal menyalin link')
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Salin Link
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 rounded-lg text-xs gap-1.5"
                onClick={() => {
                  // Print QR label
                  const printContent = `
                    <html><head><title>QR Code - ${detailData?.nomorPolisi}</title>
                    <style>
                      body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; }
                      .label { text-align: center; padding: 20px; }
                      .label img { margin: 0 auto; }
                      .label h2 { margin: 10px 0 5px; font-size: 18px; }
                      .label p { margin: 2px 0; color: #666; font-size: 14px; }
                    </style></head><body>
                    <div class="label">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}${qrData.qrUrl}`)}" width="200" height="200" />
                      <h2>${detailData?.nomorPolisi}</h2>
                      <p>${detailData?.merk} ${detailData?.type} | ${detailData?.tahun}</p>
                      <p>${detailData?.skpdBidang}</p>
                    </div>
                    </body></html>`
                  const printWindow = window.open('', '_blank')
                  if (printWindow) {
                    printWindow.document.write(printContent)
                    printWindow.document.close()
                    printWindow.onload = () => {
                      printWindow.print()
                    }
                  }
                }}
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Label QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
