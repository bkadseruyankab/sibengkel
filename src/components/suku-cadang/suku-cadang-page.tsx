'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Archive,
  ShoppingCart,
  Wrench,
  Building2,
  Filter,
  Eye,
  SearchX,
  X,
  Boxes,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { SparePart, Workshop } from '@/types'
import { useAuthStore } from '@/store/auth'

// --- Zod Schema ---
const sukuCadangSchema = z.object({
  namaSukuCadang: z.string().min(1, 'Nama suku cadang wajib diisi'),
  qty: z.number().min(0).default(0),
  hargaSatuan: z.number().min(0).default(0),
  supplier: z.string().optional().default(''),
  stok: z.number().min(0).default(0),
  keterangan: z.string().optional().default(''),
  isActive: z.boolean().default(true),
  bengkelId: z.string().min(1, 'Bengkel wajib dipilih'),
})

type SukuCadangFormValues = z.infer<typeof sukuCadangSchema>

// --- API helpers ---
async function fetchSukuCadang(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/suku-cadang?${qs}`)
  if (!res.ok) throw new Error('Gagal mengambil data suku cadang')
  return res.json()
}

async function fetchBengkels() {
  const res = await fetch('/api/bengkel')
  if (!res.ok) throw new Error('Gagal mengambil data bengkel')
  const data = await res.json()
  return data.data || data
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

function getStockBadge(stok: number) {
  if (stok === 0) {
    return <Badge className="bg-red-50 text-red-700 border-red-200/80 hover:bg-red-50 shadow-sm font-medium">Habis</Badge>
  }
  if (stok < 5) {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200/80 hover:bg-red-50 gap-1 shadow-sm font-medium">
        <AlertTriangle className="h-3 w-3" />
        {stok}
      </Badge>
    )
  }
  if (stok < 10) {
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-50 shadow-sm font-medium">{stok}</Badge>
  }
  return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-50 shadow-sm font-medium">{stok}</Badge>
}

function getActiveBadge(isActive: boolean) {
  return isActive
    ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-50 shadow-sm font-medium">Aktif</Badge>
    : <Badge className="bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-50 shadow-sm font-medium">Nonaktif</Badge>
}

// --- Main Component ---
export function SukuCadangPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isBengkel = user?.role === 'BENGKEL'
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterBengkelId, setFilterBengkelId] = useState<string>(
    isBengkel && user?.bengkelId ? user.bengkelId : ''
  )
  const limit = 10

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['suku-cadang', page, search, filterBengkelId],
    queryFn: () => fetchSukuCadang({
      page: String(page),
      limit: String(limit),
      search,
      bengkelId: filterBengkelId,
    }),
  })

  // Fetch bengkels for admin filter & form
  const { data: bengkels = [] } = useQuery({
    queryKey: ['bengkels-for-suku-cadang'],
    queryFn: fetchBengkels,
    enabled: isAdmin,
  })

  // Detail query
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['suku-cadang-detail', selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/suku-cadang/${selectedId}`)
      if (!res.ok) throw new Error('Gagal mengambil detail')
      return res.json()
    },
    enabled: !!selectedId && detailOpen,
  })

  // Form
  const form = useForm<SukuCadangFormValues>({
    resolver: zodResolver(sukuCadangSchema),
    defaultValues: {
      namaSukuCadang: '',
      qty: 0,
      hargaSatuan: 0,
      supplier: '',
      stok: 0,
      keterangan: '',
      isActive: true,
      bengkelId: isBengkel && user?.bengkelId ? user.bengkelId : '',
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: SukuCadangFormValues) => {
      const res = await fetch('/api/suku-cadang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat suku cadang')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Suku cadang berhasil ditambahkan')
      queryClient.invalidateQueries({ queryKey: ['suku-cadang'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: SukuCadangFormValues }) => {
      const res = await fetch(`/api/suku-cadang/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengupdate suku cadang')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Suku cadang berhasil diupdate')
      queryClient.invalidateQueries({ queryKey: ['suku-cadang'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suku-cadang/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus suku cadang')
      }
      return res.json()
    },
    onSuccess: (result) => {
      toast.success(result.message || 'Suku cadang berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['suku-cadang'] })
      setDeleteOpen(false)
      setSelectedId(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Handlers
  function handleAdd() {
    setEditMode(false)
    form.reset({
      namaSukuCadang: '',
      qty: 0,
      hargaSatuan: 0,
      supplier: '',
      stok: 0,
      keterangan: '',
      isActive: true,
      bengkelId: isBengkel && user?.bengkelId ? user.bengkelId : '',
    })
    setFormOpen(true)
  }

  function handleEdit(part: SparePart & { bengkel?: { id: string; namaBengkel: string } }) {
    setEditMode(true)
    setSelectedId(part.id)
    form.reset({
      namaSukuCadang: part.namaSukuCadang,
      qty: part.qty,
      hargaSatuan: part.hargaSatuan,
      supplier: part.supplier || '',
      stok: part.stok,
      keterangan: part.keterangan || '',
      isActive: part.isActive,
      bengkelId: part.bengkelId,
    })
    setFormOpen(true)
  }

  function handleDelete(id: string) {
    setSelectedId(id)
    setDeleteOpen(true)
  }

  function handleDetail(id: string) {
    setSelectedId(id)
    setDetailOpen(true)
  }

  function onSubmit(values: SukuCadangFormValues) {
    if (editMode && selectedId) {
      updateMutation.mutate({ id: selectedId, values })
    } else {
      createMutation.mutate(values)
    }
  }

  // Summary
  const summary = data?.summary
  const bengkelSummary = data?.bengkelSummary

  // Get bengkel name for a spare part
  function getBengkelName(part: SparePart & { bengkel?: { id: string; namaBengkel: string } }) {
    return part.bengkel?.namaBengkel || '-'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            Suku Cadang / Material
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 ml-12">
            {isBengkel
              ? <>Stok suku cadang bengkel Anda — Total <span className="font-semibold text-foreground">{data?.total || 0}</span> item</>
              : <>Total <span className="font-semibold text-foreground">{data?.total || 0}</span> item dari semua bengkel</>
            }
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Tambah Suku Cadang
        </Button>
      </div>

      {/* Role Banner - Bengkel */}
      {isBengkel && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/60 p-3.5 animate-slide-up animate-stagger-1 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-900/30">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
            <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Mode Bengkel</p>
            <p className="text-xs text-amber-600 dark:text-amber-400/80">Anda hanya dapat melihat dan mengelola stok suku cadang bengkel Anda sendiri</p>
          </div>
        </div>
      )}

      {/* Role Banner - Admin */}
      {isAdmin && (
        <div className="flex items-center gap-3 rounded-xl border border-teal-200/60 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 p-3.5 animate-slide-up animate-stagger-1 dark:from-teal-950/30 dark:to-emerald-950/20 dark:border-teal-900/30">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40 shrink-0">
            <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">Mode Admin</p>
            <p className="text-xs text-teal-600 dark:text-teal-400/80">Anda dapat melihat stok suku cadang dari seluruh bengkel yang terdaftar</p>
          </div>
        </div>
      )}

      {/* Bengkel Stock Summary Cards (Admin only) */}
      {isAdmin && bengkelSummary && bengkelSummary.length > 0 && !filterBengkelId && (
        <div className="animate-slide-up animate-stagger-2">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Building2 className="h-4 w-4" />
            Stok per Bengkel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bengkelSummary.map((b: { id: string; namaBengkel: string; itemCount: number; totalStok: number }, idx: number) => (
              <Card
                key={b.id}
                className={cn(
                  "cursor-pointer border-border/40 shadow-sm card-hover border-l-4 border-l-teal-500/60 animate-fade-in",
                  idx < 8 && `animate-stagger-${idx + 1}`
                )}
                onClick={() => { setFilterBengkelId(b.id); setPage(1) }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium truncate pr-2">{b.namaBengkel}</CardTitle>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/30 shrink-0">
                    <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">{b.itemCount}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">jenis item</p>
                    </div>
                    <Separator orientation="vertical" className="h-8 bg-border/40" />
                    <div className="text-right">
                      <p className="text-lg font-bold">{b.totalStok}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">total stok</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up animate-stagger-3">
        <Card className="border-border/40 shadow-sm card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {isBengkel ? 'Total Stok Bengkel' : 'Total Stok Aktif'}
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
              <Archive className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-2xl font-bold">{summary?.totalItems || 0}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-sm card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Stok Rendah</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary?.lowStockCount || 0}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-sm card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Jenis Item</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold">{data?.total || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters - Glassmorphism */}
      <div className="bg-muted/30 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-border/40 animate-slide-up animate-stagger-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Cari nama suku cadang, supplier..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 bg-background/60 border-border/50 focus:border-primary/40 focus:bg-background"
            />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={filterBengkelId || 'all'}
                onValueChange={(val) => {
                  setFilterBengkelId(val === 'all' ? '' : val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[220px] bg-background/60 border-border/50">
                  <SelectValue placeholder="Semua Bengkel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bengkel</SelectItem>
                  {bengkels.map((b: Workshop) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.namaBengkel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {filterBengkelId && isAdmin && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="gap-1 shadow-sm bg-background/50">
              <Building2 className="h-3 w-3" />
              {bengkels.find((b: Workshop) => b.id === filterBengkelId)?.namaBengkel || filterBengkelId}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setFilterBengkelId(''); setPage(1) }}
            >
              <X className="h-3 w-3 mr-1" />
              Hapus filter
            </Button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <Card className="border-border/40 shadow-sm animate-slide-up animate-stagger-5 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.data?.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 mb-4">
                <SearchX className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-semibold">Belum ada data suku cadang</p>
              <p className="text-sm mt-1 text-muted-foreground/70">
                {isBengkel
                  ? 'Tambahkan suku cadang untuk persediaan bengkel Anda'
                  : 'Belum ada suku cadang yang terdaftar di sistem'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama</TableHead>
                      {isAdmin && <TableHead>Bengkel</TableHead>}
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-center">Stok</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-28">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((part: SparePart & { bengkel?: { id: string; namaBengkel: string } }, idx: number) => (
                      <TableRow
                        key={part.id}
                        className={cn(
                          "cursor-pointer transition-colors duration-150 border-border/30",
                          idx % 2 === 1 && "bg-muted/10",
                          "hover:bg-muted/30"
                        )}
                        onClick={() => handleDetail(part.id)}
                      >
                        <TableCell className="font-medium text-muted-foreground">{(page - 1) * limit + idx + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{part.namaSukuCadang}</p>
                            {part.keterangan && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{part.keterangan}</p>
                            )}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Badge variant="outline" className="gap-1 text-xs shadow-sm bg-background/50">
                              <Building2 className="h-3 w-3" />
                              {getBengkelName(part)}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-center">{part.qty}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(part.hargaSatuan)}</TableCell>
                        <TableCell className="text-muted-foreground">{part.supplier || '-'}</TableCell>
                        <TableCell className="text-center">{getStockBadge(part.stok)}</TableCell>
                        <TableCell>{getActiveBadge(part.isActive)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(part)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-lg" onClick={() => handleDelete(part.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Suku Cadang' : 'Tambah Suku Cadang'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="namaSukuCadang"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Suku Cadang *</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama suku cadang" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bengkel Selector */}
              {isAdmin ? (
                <FormField
                  control={form.control}
                  name="bengkelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bengkel *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih bengkel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bengkels.map((b: Workshop) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.namaBengkel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="bengkelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bengkel</FormLabel>
                      <FormControl>
                        <Input
                          value={bengkels.find((b: Workshop) => b.id === field.value)?.namaBengkel || user?.bengkelId || 'Bengkel Anda'}
                          disabled
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hargaSatuan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Satuan (Rp)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stok"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stok</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama supplier" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="keterangan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keterangan</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Keterangan tambahan..." className="resize-none" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Status Aktif</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Nonaktifkan jika suku cadang tidak digunakan lagi
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

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-850 to-teal-900 px-5 sm:px-6 py-4 sm:py-5 text-white relative overflow-hidden">
            <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="absolute -bottom-4 -left-4 h-14 w-14 rounded-full bg-emerald-500/10 blur-xl" />
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-2 text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/10">
                  <Package className="h-4 w-4" />
                </div>
                Detail Suku Cadang
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-5 sm:p-6 animate-scale-in">
            {detailLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : detailData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Nama Suku Cadang</p>
                    <p className="font-semibold mt-0.5">{detailData.namaSukuCadang}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Bengkel</p>
                    <p className="font-semibold flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {detailData.bengkel?.namaBengkel || '-'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Quantity</p>
                    <p className="font-semibold mt-0.5">{detailData.qty}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Harga Satuan</p>
                    <p className="font-semibold mt-0.5">{formatCurrency(detailData.hargaSatuan)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Stok</p>
                    <div className="mt-1">{getStockBadge(detailData.stok)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                    <div className="mt-1">{getActiveBadge(detailData.isActive)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Supplier</p>
                    <p className="font-semibold mt-0.5">{detailData.supplier || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-50/80 to-emerald-50/60 border border-teal-100 dark:from-teal-950/30 dark:to-emerald-950/20 dark:border-teal-900/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Nilai Total Stok</p>
                    <p className="font-bold text-teal-700 dark:text-teal-400 mt-0.5">
                      {formatCurrency(detailData.stok * detailData.hargaSatuan)}
                    </p>
                  </div>
                </div>

                {detailData.keterangan && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Keterangan</p>
                    <p className="text-sm">{detailData.keterangan}</p>
                  </div>
                )}

                {/* Service usage history */}
                {detailData.serviceSpareParts && detailData.serviceSpareParts.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                        <Boxes className="h-3 w-3 text-primary" />
                      </div>
                      Riwayat Penggunaan di Service
                    </p>
                    <ScrollArea className="max-h-48">
                      <div className="space-y-2 pr-1">
                        {detailData.serviceSpareParts.map((ssp: any) => (
                          <div key={ssp.id} className="flex items-center justify-between text-sm p-3 bg-muted/40 rounded-xl border border-border/30 hover:bg-muted/60 transition-colors">
                            <div>
                              <span className="font-medium">{ssp.service?.nomorService}</span>
                              <span className="text-muted-foreground ml-2">
                                {ssp.service?.vehicle?.nomorPolisi}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground">{ssp.qty} x {formatCurrency(ssp.hargaSatuan)}</span>
                              <span className="ml-2 font-semibold">{formatCurrency(ssp.totalHarga)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Suku Cadang</AlertDialogTitle>
            <AlertDialogDescription>
              Jika suku cadang masih digunakan dalam service, data akan dinonaktifkan alih-alih dihapus. Apakah Anda yakin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedId && deleteMutation.mutate(selectedId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Memproses...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
