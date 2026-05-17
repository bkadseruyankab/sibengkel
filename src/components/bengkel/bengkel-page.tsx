'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Building2,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Wrench,
  DollarSign,
  Clock,
  CheckCircle2,
  Upload,
  Download,
  FileText,
  Image as ImageIcon,
  X,
  FileCheck,
  Shield,
  FileSignature,
  Briefcase,
  FileBarChart,
  CheckCircle,
  FolderOpen,
  SearchX,
} from 'lucide-react'

import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Workshop, WorkshopDocument } from '@/types'
import { BengkelProfile } from './bengkel-profile'

// --- Zod Schema ---
const bengkelSchema = z.object({
  namaBengkel: z.string().min(1, 'Nama bengkel wajib diisi'),
  alamat: z.string().optional().default(''),
  noTelepon: z.string().optional().default(''),
  picBengkel: z.string().optional().default(''),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')).default(''),
  statusAktif: z.boolean().default(true),
  canAddService: z.boolean().default(false),
})

type BengkelFormValues = z.infer<typeof bengkelSchema>

// --- API helpers ---
async function fetchBengkel(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/bengkel?${qs}`)
  if (!res.ok) throw new Error('Gagal mengambil data bengkel')
  return res.json()
}

async function fetchBengkelDetail(id: string) {
  const res = await fetch(`/api/bengkel/${id}`)
  if (!res.ok) throw new Error('Gagal mengambil detail bengkel')
  return res.json()
}

// --- Format helpers ---
function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getStatusBadge(statusAktif: boolean) {
  return statusAktif
    ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-50 font-medium shadow-sm">Aktif</Badge>
    : <Badge className="bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-50 font-medium shadow-sm">Nonaktif</Badge>
}

function getServiceStatusBadge(status: string) {
  const colors: Record<string, string> = {
    'DIAJUKAN': 'bg-blue-50 text-blue-700 border-blue-200/80',
    'DISETUJUI': 'bg-sky-50 text-sky-700 border-sky-200/80',
    'DITOLAK': 'bg-red-50 text-red-700 border-red-200/80',
    'DIPROSES': 'bg-amber-50 text-amber-700 border-amber-200/80',
    'PENDING': 'bg-orange-50 text-orange-700 border-orange-200/80',
    'SELESAI': 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  }
  return (
    <Badge className={`${colors[status] || 'bg-gray-50 text-gray-700 border-gray-200/80'} font-medium shadow-sm`}>
      {status}
    </Badge>
  )
}

// --- Document badge config ---
const DOC_BADGES: Record<string, { label: string; className: string; icon: typeof Shield }> = {
  KTP: { label: 'KTP', className: 'bg-blue-50 text-blue-700 border-blue-200/80 shadow-sm', icon: Shield },
  NPWP: { label: 'NPWP', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-sm', icon: FileBarChart },
  NIB: { label: 'NIB', className: 'bg-purple-50 text-purple-700 border-purple-200/80 shadow-sm', icon: Briefcase },
  SPK: { label: 'SPK', className: 'bg-amber-50 text-amber-700 border-amber-200/80 shadow-sm', icon: FileSignature },
  IZIN_USAHA: { label: 'Izin Usaha', className: 'bg-teal-50 text-teal-700 border-teal-200/80 shadow-sm', icon: FileCheck },
  SURAT_KETERANGAN: { label: 'Surat Keterangan', className: 'bg-orange-50 text-orange-700 border-orange-200/80 shadow-sm', icon: FileText },
  LAINNYA: { label: 'Lainnya', className: 'bg-gray-50 text-gray-600 border-gray-200/80 shadow-sm', icon: FileText },
}

// --- Main Component ---
export function BengkelPage() {
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const limit = 10

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [docUploadOpen, setDocUploadOpen] = useState(false)
  const [docJenis, setDocJenis] = useState('KTP')
  const [docFiles, setDocFiles] = useState<File[]>([])
  const [docKeterangan, setDocKeterangan] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['bengkel', page, search, statusFilter],
    queryFn: () => fetchBengkel({
      page: String(page),
      limit: String(limit),
      search,
      statusAktif: statusFilter === 'all' ? '' : statusFilter,
    }),
  })

  const { data: detail } = useQuery({
    queryKey: ['bengkel-detail', selectedId],
    queryFn: () => fetchBengkelDetail(selectedId!),
    enabled: !!selectedId && detailOpen,
  })

  // Form
  const form = useForm<BengkelFormValues>({
    resolver: zodResolver(bengkelSchema),
    defaultValues: {
      namaBengkel: '',
      alamat: '',
      noTelepon: '',
      picBengkel: '',
      email: '',
      statusAktif: true,
      canAddService: false,
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: BengkelFormValues) => {
      const res = await fetch('/api/bengkel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat bengkel')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Bengkel berhasil ditambahkan')
      queryClient.invalidateQueries({ queryKey: ['bengkel'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: BengkelFormValues }) => {
      const res = await fetch(`/api/bengkel/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengupdate bengkel')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Bengkel berhasil diupdate')
      queryClient.invalidateQueries({ queryKey: ['bengkel'] })
      queryClient.invalidateQueries({ queryKey: ['bengkel-detail'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bengkel/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus bengkel')
      }
      return res.json()
    },
    onSuccess: (result) => {
      toast.success(result.message || 'Bengkel berhasil dinonaktifkan')
      queryClient.invalidateQueries({ queryKey: ['bengkel'] })
      setDeleteOpen(false)
      setSelectedId(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Document upload mutation
  const docUploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || docFiles.length === 0) return
      const formData = new FormData()
      docFiles.forEach(file => formData.append('files', file))
      formData.append('jenisDokumen', docJenis)
      if (docKeterangan) formData.append('keterangan', docKeterangan)
      const res = await fetch(`/api/bengkel/${selectedId}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengupload dokumen')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Dokumen berhasil diupload')
      queryClient.invalidateQueries({ queryKey: ['bengkel-detail'] })
      setDocUploadOpen(false)
      setDocFiles([])
      setDocKeterangan('')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Document delete mutation
  const docDeleteMutation = useMutation({
    mutationFn: async ({ bengkelId, docId }: { bengkelId: string; docId: string }) => {
      const res = await fetch(`/api/bengkel/${bengkelId}/documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus dokumen')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Dokumen berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['bengkel-detail'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Handlers
  function handleAdd() {
    setEditMode(false)
    form.reset({
      namaBengkel: '',
      alamat: '',
      noTelepon: '',
      picBengkel: '',
      email: '',
      statusAktif: true,
      canAddService: false,
    })
    setFormOpen(true)
  }

  function handleEdit(workshop: Workshop) {
    setEditMode(true)
    setSelectedId(workshop.id)
    form.reset({
      namaBengkel: workshop.namaBengkel,
      alamat: workshop.alamat || '',
      noTelepon: workshop.noTelepon || '',
      picBengkel: workshop.picBengkel || '',
      email: workshop.email || '',
      statusAktif: workshop.statusAktif,
      canAddService: workshop.canAddService,
    })
    setFormOpen(true)
  }

  function handleViewDetail(id: string) {
    setSelectedId(id)
    setDetailOpen(true)
  }

  function handleDelete(id: string) {
    setSelectedId(id)
    setDeleteOpen(true)
  }

  function onSubmit(values: BengkelFormValues) {
    if (editMode && selectedId) {
      updateMutation.mutate({ id: selectedId, values })
    } else {
      createMutation.mutate(values)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 animate-slide-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            Manajemen Bengkel
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 ml-11 sm:ml-12">
            Total <span className="font-semibold text-foreground">{data?.total || 0}</span> bengkel terdaftar
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2 min-h-[44px] shadow-sm">
          <Plus className="h-4 w-4" />
          Tambah Bengkel
        </Button>
      </div>

      {/* Filters - Glassmorphism */}
      <div className="bg-muted/30 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-border/40 animate-slide-up animate-stagger-1">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Cari nama bengkel, PIC, alamat..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 min-h-[44px] bg-background/60 border-border/50 focus:border-primary/40 focus:bg-background"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-40 min-h-[44px] bg-background/60 border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="true">Aktif</SelectItem>
              <SelectItem value="false">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table / Mobile Cards */}
      <Card className="border-border/40 shadow-sm animate-slide-up animate-stagger-2 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 sm:p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.data?.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 mb-4">
                <SearchX className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-semibold">Belum ada data bengkel</p>
              <p className="text-sm mt-1 text-muted-foreground/70">Tambahkan bengkel untuk pengelolaan service</p>
            </div>
          ) : isMobile ? (
            /* ========== Mobile Card View ========== */
            <div className="divide-y divide-border/40">
              {data.data.map((workshop: Workshop & { _count?: { services: number } }, idx: number) => (
                <div
                  key={workshop.id}
                  className={cn(
                    "p-4 space-y-3 card-hover animate-fade-in",
                    idx < 8 && `animate-stagger-${idx + 1}`
                  )}
                >
                  {/* Card Header: Name + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base truncate">{workshop.namaBengkel}</span>
                        {getStatusBadge(workshop.statusAktif)}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 shadow-sm">
                      {workshop._count?.services || 0} service
                    </Badge>
                  </div>

                  {/* Key Info Rows */}
                  <div className="space-y-2 text-sm">
                    {workshop.picBengkel && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{workshop.picBengkel}</span>
                      </div>
                    )}
                    {workshop.noTelepon && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{workshop.noTelepon}</span>
                      </div>
                    )}
                    {workshop.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{workshop.email}</span>
                      </div>
                    )}
                    {workshop.alamat && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="truncate">{workshop.alamat}</span>
                      </div>
                    )}
                  </div>

                  {/* Service Badge + Action Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {workshop.canAddService ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-50 gap-1 text-xs shadow-sm">
                          <Wrench className="h-3 w-3" />
                          Bisa Tambah
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-50 text-xs shadow-sm">
                          <Wrench className="h-3 w-3" />
                          Tidak Bisa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 min-w-[44px] min-h-[44px] rounded-lg" onClick={() => handleViewDetail(workshop.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 min-w-[44px] min-h-[44px] rounded-lg" onClick={() => handleEdit(workshop)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 min-w-[44px] min-h-[44px] text-destructive rounded-lg" onClick={() => handleDelete(workshop.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Mobile Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  {((page - 1) * limit) + 1}–{Math.min(page * limit, data.total)} / {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-[44px] min-w-[44px]">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{page}/{data.totalPages || 1}</span>
                  <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="min-h-[44px] min-w-[44px]">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ========== Desktop Table View ========== */
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama Bengkel</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>No Telepon</TableHead>
                      <TableHead>PIC</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Bisa Tambah Service</TableHead>
                      <TableHead className="text-center">Total Service</TableHead>
                      <TableHead className="w-28">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((workshop: Workshop & { _count?: { services: number } }, idx: number) => (
                      <TableRow
                        key={workshop.id}
                        className={cn(
                          "transition-colors duration-150 border-border/30",
                          idx % 2 === 1 && "bg-muted/10",
                          "hover:bg-muted/30"
                        )}
                      >
                        <TableCell className="font-medium text-muted-foreground">{(page - 1) * limit + idx + 1}</TableCell>
                        <TableCell className="font-semibold">{workshop.namaBengkel}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{workshop.alamat || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{workshop.noTelepon || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{workshop.picBengkel || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{workshop.email || '-'}</TableCell>
                        <TableCell>{getStatusBadge(workshop.statusAktif)}</TableCell>
                        <TableCell className="text-center">
                          {workshop.canAddService ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-50 shadow-sm">Ya</Badge>
                          ) : (
                            <Badge className="bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-50 shadow-sm">Tidak</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="shadow-sm">{workshop._count?.services || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleViewDetail(workshop.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(workshop)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-lg" onClick={() => handleDelete(workshop.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Desktop Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-border/40">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {((page - 1) * limit) + 1}–{Math.min(page * limit, data.total)} dari {data.total} data
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{page} / {data.totalPages || 1}</span>
                  <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) form.reset() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Bengkel' : 'Tambah Bengkel'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="namaBengkel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Bengkel *</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama bengkel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alamat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan alamat bengkel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="noTelepon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No Telepon</FormLabel>
                      <FormControl>
                        <Input placeholder="08xx-xxxx-xxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="picBengkel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIC Bengkel</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama penanggung jawab" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="statusAktif"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Status Aktif</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Nonaktifkan jika bengkel tidak digunakan lagi
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canAddService"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Izinkan Bengkel Membuat Service</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Aktifkan agar akun bengkel dapat menambahkan service baru
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setFormOpen(false); form.reset() }}>
                  Batal
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? 'Menyimpan...' : editMode ? 'Update' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Bengkel</AlertDialogTitle>
            <AlertDialogDescription>
              Bengkel akan dinonaktifkan dan tidak akan muncul dalam daftar aktif. Data service yang terkait tidak akan terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedId && deleteMutation.mutate(selectedId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Memproses...' : 'Nonaktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========== Detail Dialog ========== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className={cn(
          "max-h-[90vh] overflow-hidden flex flex-col p-0",
          isMobile ? "w-full h-full max-w-none rounded-none" : "sm:max-w-2xl rounded-xl"
        )}>
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-850 to-teal-900 px-4 sm:px-6 py-4 sm:py-5 text-white shrink-0 relative overflow-hidden">
            {/* Decorative blur circle */}
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl" />
            <div className="flex items-start justify-between gap-3 relative">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shrink-0 ring-1 ring-white/10">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold truncate">
                    {detail?.namaBengkel || 'Detail Bengkel'}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {detail?.statusAktif ? (
                      <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20 gap-1 text-[10px] shadow-sm">
                        <CheckCircle className="h-3 w-3" />
                        Aktif
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/20 text-[10px] shadow-sm">
                        Nonaktif
                      </Badge>
                    )}
                    {detail?.canAddService && (
                      <Badge className="bg-teal-500/20 text-teal-200 border-teal-500/30 hover:bg-teal-500/20 gap-1 text-[10px] shadow-sm">
                        <Wrench className="h-3 w-3" />
                        Bisa Tambah Service
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white min-h-[36px] rounded-lg backdrop-blur-sm"
                onClick={() => { setProfileOpen(true) }}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Profil & Dokumen</span>
                <span className="sm:hidden">Profil</span>
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 overflow-y-auto thin-scrollbar">
            {detail ? (
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-scale-in">
                {/* Workshop Info */}
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Informasi Bengkel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detail.alamat && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/30">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Alamat</p>
                            <p className="text-sm font-medium break-words mt-0.5">{detail.alamat}</p>
                          </div>
                        </div>
                      )}
                      {detail.noTelepon && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/30">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">No. Telepon</p>
                            <p className="text-sm font-medium break-words mt-0.5">{detail.noTelepon}</p>
                          </div>
                        </div>
                      )}
                      {detail.picBengkel && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/30">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">PIC Bengkel</p>
                            <p className="text-sm font-medium break-words mt-0.5">{detail.picBengkel}</p>
                          </div>
                        </div>
                      )}
                      {detail.email && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/30">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Email</p>
                            <p className="text-sm font-medium break-words mt-0.5">{detail.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Statistics Grid */}
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Statistik
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 card-hover">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                          <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Total Service</p>
                          <p className="text-lg sm:text-xl font-bold">{detail.stats?.totalServices || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 card-hover dark:from-emerald-950/30 dark:to-emerald-900/20 dark:border-emerald-900/30">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-100 shrink-0 dark:bg-emerald-900/40">
                          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Pendapatan</p>
                          <p className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(detail.stats?.totalRevenue || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 card-hover dark:from-amber-950/30 dark:to-amber-900/20 dark:border-amber-900/30">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-100 shrink-0 dark:bg-amber-900/40">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Rata-rata Selesai</p>
                          <p className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-400">{detail.stats?.avgCompletionDays || 0}<span className="text-xs font-normal ml-1">hari</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-sky-50 to-sky-100/50 border border-sky-100 card-hover dark:from-sky-950/30 dark:to-sky-900/20 dark:border-sky-900/30">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-sky-100 shrink-0 dark:bg-sky-900/40">
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Selesai</p>
                          <p className="text-lg sm:text-xl font-bold text-sky-700 dark:text-sky-400">{detail.stats?.completedCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Services List */}
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <Wrench className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Daftar Service
                      {detail.services?.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] shadow-sm">
                          {detail.services.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    {detail.services?.length ? (
                      <ScrollArea className="max-h-64 sm:max-h-80">
                        <div className="space-y-2 pr-1">
                          {detail.services.map((s: { id: string; nomorService: string; tanggalService: string; totalBiaya: number; statusService: string; vehicle?: { nomorPolisi: string; namaPengguna: string } }) => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-border/30 text-sm hover:bg-muted/30 hover:border-border/50 transition-all duration-200">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{s.nomorService}</span>
                                  {getServiceStatusBadge(s.statusService)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {s.vehicle?.nomorPolisi} • {new Date(s.tanggalService).toLocaleDateString('id-ID')}
                                </p>
                              </div>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-2 shrink-0 text-xs sm:text-sm">
                                {formatCurrency(s.totalBiaya)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 mb-2">
                          <Wrench className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm">Belum ada service untuk bengkel ini</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Documents / Perizinan */}
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                          <FileCheck className="h-3.5 w-3.5 text-primary" />
                        </div>
                        Dokumen Perizinan
                        {detail.documents?.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] shadow-sm">
                            {detail.documents.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <Button size="sm" variant="outline" className="gap-1.5 min-h-[36px] w-fit rounded-lg" onClick={() => { setDocJenis('KTP'); setDocFiles([]); setDocKeterangan(''); setDocUploadOpen(true) }}>
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    {detail.documents?.length ? (
                      <ScrollArea className="max-h-64 sm:max-h-80">
                        <div className="space-y-2 pr-1">
                          {detail.documents.map((doc: WorkshopDocument) => {
                            const badge = DOC_BADGES[doc.jenisDokumen] || DOC_BADGES.LAINNYA
                            const DocIcon = badge.icon
                            return (
                              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/30 text-sm hover:bg-muted/30 hover:border-border/50 transition-all duration-200">
                                <div className="h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-muted/60 flex items-center justify-center border border-border/30">
                                  {doc.fileType?.startsWith('image/') ? (
                                    <ImageIcon className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium truncate max-w-[120px] sm:max-w-none">{doc.fileName}</span>
                                    <Badge className={`text-[10px] border shrink-0 gap-1 ${badge.className}`}>
                                      <DocIcon className="h-2.5 w-2.5" />
                                      {badge.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '-'} • {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                                    {doc.keterangan && ` • ${doc.keterangan}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 min-w-[36px] min-h-[36px] rounded-lg" onClick={() => window.open(doc.filePath, '_blank')}>
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 min-w-[36px] min-h-[36px] text-destructive rounded-lg" onClick={() => docDeleteMutation.mutate({ bengkelId: doc.workshopId, docId: doc.id })}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 mb-2">
                          <FolderOpen className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm">Belum ada dokumen perizinan yang diupload</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className={cn(
          "max-h-[90vh] overflow-y-auto",
          isMobile ? "w-full max-w-none" : "sm:max-w-3xl"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Profil Bengkel
            </DialogTitle>
          </DialogHeader>
          <BengkelProfile isAdmin={true} bengkelId={selectedId || undefined} />
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={docUploadOpen} onOpenChange={setDocUploadOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Dokumen Perizinan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis Dokumen</Label>
              <Select value={docJenis} onValueChange={setDocJenis}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KTP">KTP</SelectItem>
                  <SelectItem value="NPWP">NPWP</SelectItem>
                  <SelectItem value="NIB">NIB</SelectItem>
                  <SelectItem value="SPK">SPK</SelectItem>
                  <SelectItem value="IZIN_USAHA">Izin Usaha</SelectItem>
                  <SelectItem value="SURAT_KETERANGAN">Surat Keterangan</SelectItem>
                  <SelectItem value="LAINNYA">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Keterangan (Opsional)</Label>
              <Input
                value={docKeterangan}
                onChange={(e) => setDocKeterangan(e.target.value)}
                placeholder="Keterangan tambahan..."
              />
            </div>
            <div className="space-y-2">
              <Label>Pilih File</Label>
              <Input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  if (e.target.files) {
                    const newFiles = Array.from(e.target.files)
                    setDocFiles(prev => [...prev, ...newFiles].slice(0, 10))
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Format: JPG, PNG, PDF. Maks. 5MB/file, 10 file</p>
            </div>
            {docFiles.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {docFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-lg border bg-muted/30 border-border/40">
                    {file.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-green-500 shrink-0" /> : <FileText className="h-4 w-4 text-red-500 shrink-0" />}
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setDocFiles(prev => prev.filter((_, i) => i !== idx))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDocUploadOpen(false); setDocFiles([]) }}>Batal</Button>
            <Button onClick={() => docUploadMutation.mutate()} disabled={docUploadMutation.isPending || docFiles.length === 0}>
              {docUploadMutation.isPending ? 'Mengupload...' : `Upload ${docFiles.length} File`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
