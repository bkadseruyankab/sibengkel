'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Wrench, Plus, Search, Filter, Eye, Edit, Trash2, CheckCircle,
  XCircle, RefreshCw, ChevronLeft, ChevronRight, FileText,
  AlertTriangle, Info, X, Wallet, CalendarIcon, ArrowUpDown,
  Upload, Download, Image as ImageIcon, CalendarDays, History,
  Car, Gauge, Send, ClipboardCheck, ImagePlus, ZoomIn, Printer
} from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { generateQRDataURL } from '@/lib/qrcode-helper'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { MultiUpload } from '@/components/shared/multi-upload'
import type { Service, ServiceItem, ServiceItemPhoto, ServiceDocument, BudgetValidation, StatusService, JenisService, Prioritas } from '@/types'
import { useAuthStore } from '@/store/auth'

// ========== Types ==========
interface ServiceFormData {
  tanggalService: string
  vehicleId: string
  bengkelId: string
  jenisService: JenisService
  prioritas: Prioritas
  keterangan: string
  kilometerService: number
  estimasiBiaya: number
  estimasiLamaPerbaikan: number
  items: ServiceItemForm[]
}

interface ServiceItemForm {
  itemName: string
  quantity: number
  hargaSatuan: number
  keterangan: string
}

// ========== Constants ==========
const STATUS_COLORS: Record<StatusService, string> = {
  DIAJUKAN: 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm shadow-blue-200/50',
  PENGAJUAN: 'bg-cyan-100 text-cyan-800 border-cyan-200 shadow-sm shadow-cyan-200/50',
  DISETUJUI: 'bg-green-100 text-green-800 border-green-200 shadow-sm shadow-green-200/50',
  DITOLAK: 'bg-red-100 text-red-800 border-red-200 shadow-sm shadow-red-200/50',
  DIPROSES: 'bg-orange-100 text-orange-800 border-orange-200 shadow-sm shadow-orange-200/50',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm shadow-yellow-200/50',
  SELESAI: 'bg-purple-100 text-purple-800 border-purple-200 shadow-sm shadow-purple-200/50',
  MENUNGGU_PERSETUJUAN: 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm shadow-amber-200/50',
}

const STATUS_LABELS: Record<StatusService, string> = {
  DIAJUKAN: 'Diajukan',
  PENGAJUAN: 'Pengajuan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  DIPROSES: 'Diproses',
  PENDING: 'Pending',
  SELESAI: 'Selesai',
  MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan',
}

const JENIS_SERVICE_OPTIONS: { value: JenisService; label: string }[] = [
  { value: 'RUTIN', label: 'Rutin' },
  { value: 'PERBAIKAN', label: 'Perbaikan' },
  { value: 'DARURAT', label: 'Darurat' },
]

const PRIORITAS_OPTIONS: { value: Prioritas; label: string }[] = [
  { value: 'RENDAH', label: 'Rendah' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'TINGGI', label: 'Tinggi' },
  { value: 'DARURAT', label: 'Darurat' },
]

const BUDGET_LEVEL_COLORS: Record<string, string> = {
  INFO: 'border-blue-300 bg-blue-50 text-blue-800',
  WARNING: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  CRITICAL: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800',
  ERROR: 'border-red-300 bg-red-50 text-red-800',
}

const BUDGET_LEVEL_ICONS: Record<string, React.ReactNode> = {
  INFO: <Info className="h-5 w-5 text-blue-600" />,
  WARNING: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  CRITICAL: <AlertTriangle className="h-5 w-5 text-fuchsia-600" />,
  ERROR: <XCircle className="h-5 w-5 text-red-600" />,
}

// ========== Format helpers ==========
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return format(d, 'dd MMM yyyy', { locale: localeId })
  } catch {
    return '-'
  }
}

// ========== Main Component ==========
export function ServicePage() {
  const queryClient = useQueryClient()

  // Auth & Role
  const { user } = useAuthStore()
  const userRole = user?.role || ''
  const userBengkelId = user?.bengkelId
  const isBengkel = userRole === 'BENGKEL'
  const isPimpinan = userRole === 'PIMPINAN'
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole)

  // State
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterBengkel, setFilterBengkel] = useState<string>('')
  const [filterJenis, setFilterJenis] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  const [showAddEdit, setShowAddEdit] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showApproval, setShowApproval] = useState(false)
  const [approvalService, setApprovalService] = useState<Service | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [progressService, setProgressService] = useState<Service | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailService, setDetailService] = useState<Service | null>(null)
  const [showUploadNota, setShowUploadNota] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [rejectReason, setRejectReason] = useState('')
  const [showBengkelEdit, setShowBengkelEdit] = useState(false)
  const [bengkelEditService, setBengkelEditService] = useState<Service | null>(null)
  const [showBengkelProgress, setShowBengkelProgress] = useState(false)
  const [bengkelProgressService, setBengkelProgressService] = useState<Service | null>(null)

  // Photo upload states
  const [itemPhotoDialogOpen, setItemPhotoDialogOpen] = useState(false)
  const [selectedItemForPhotos, setSelectedItemForPhotos] = useState<ServiceItem | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [photoKeterangan, setPhotoKeterangan] = useState('')
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [photoViewerSrc, setPhotoViewerSrc] = useState('')

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    }
    if (search) params.search = search
    if (filterStatus) params.statusService = filterStatus
    if (filterBengkel) params.bengkelId = filterBengkel
    if (filterJenis) params.jenisService = filterJenis
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    // For BENGKEL role, filter by their own bengkelId
    if (isBengkel && userBengkelId && !filterBengkel) {
      params.bengkelId = userBengkelId
    }
    return params
  }, [page, limit, search, filterStatus, filterBengkel, filterJenis, dateFrom, dateTo, isBengkel, userBengkelId])

  // Queries
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', queryParams],
    queryFn: async () => {
      const qs = new URLSearchParams(queryParams).toString()
      const res = await fetch(`/api/service?${qs}`)
      if (!res.ok) throw new Error('Gagal mengambil data service')
      return res.json()
    },
  })

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => fetch('/api/kendaraan').then(r => r.json()),
  })

  const { data: workshopsData } = useQuery({
    queryKey: ['workshops-list'],
    queryFn: () => fetch('/api/bengkel').then(r => r.json()),
  })

  // Fetch system settings for role-based permissions
  const { data: settingsData } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan')
      return res.json()
    },
  })

  // Fetch Kepala BKAD signature for print documents
  const [kepalaSignature, setKepalaSignature] = useState<string | null>(null)
  const [qrDocDataUrl, setQrDocDataUrl] = useState<string>('')
  const [qrVehicleDataUrl, setQrVehicleDataUrl] = useState<string>('')
  const kepalaSigFetched = useRef(false)
  useEffect(() => {
    if (kepalaSigFetched.current) return
    kepalaSigFetched.current = true
    fetch('/api/pengaturan/users')
      .then(r => r.json())
      .then(users => {
        const pimpinanUsers = Array.isArray(users) ? users.filter((u: any) => u.role === 'PIMPINAN') : []
        const sigCandidates = pimpinanUsers.length > 0 ? pimpinanUsers : (Array.isArray(users) ? users.filter((u: any) => ['SUPER_ADMIN', 'ADMIN'].includes(u.role)) : [])
        if (sigCandidates.length > 0) {
          fetch(`/api/signature/verify?userId=${sigCandidates[0].id}`)
            .then(r => r.json())
            .then(data => {
              if (data.hasSignature && data.signature?.imageData) {
                setKepalaSignature(data.signature.imageData)
              }
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  // Pre-generate QR code data URLs for print documents
  // (these will be regenerated with actual data when printing)
  useEffect(() => {
    generateQRDataURL(window.location.origin, 150).then(setQrDocDataUrl).catch(() => {})
    generateQRDataURL('vehicle-info', 100).then(setQrVehicleDataUrl).catch(() => {})
  }, [])

  // canCreateService check:
  // - Admin/SuperAdmin: always true
  // - Bengkel: check workshop.canAddService from workshops data
  // - Pimpinan: never
  const canCreateService = isBengkel
    ? (() => {
        const workshops = Array.isArray(workshopsData) ? workshopsData : (workshopsData?.data || [])
        const myWorkshop = workshops.find((w: { id: string; canAddService?: boolean }) => w.id === userBengkelId)
        return !!myWorkshop?.canAddService
      })()
    : isAdmin

  // Handle both array and {data:[...]} response formats
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.data || [])
  const workshops = Array.isArray(workshopsData) ? workshopsData : (workshopsData?.data || [])
  const services = servicesData?.data || []
  const pagination = servicesData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const res = await fetch('/api/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal membuat service') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Service berhasil dibuat' })
      setShowAddEdit(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: ServiceFormData & { id: string }) => {
      const res = await fetch(`/api/service/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengupdate service') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Service berhasil diupdate' })
      setShowAddEdit(false)
      setEditingService(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/service/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus service')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Service berhasil dihapus' })
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (data: { id: string; action: 'approve' | 'reject'; rejectedReason?: string }) => {
      const res = await fetch(`/api/service/${data.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: data.action, rejectedReason: data.rejectedReason }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal memproses') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Service berhasil diproses' })
      setShowApproval(false)
      setApprovalService(null)
      setRejectReason('')
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  const progressMutation = useMutation({
    mutationFn: async (data: { id: string; progress: number; statusService?: string; catatanBengkel?: string }) => {
      const res = await fetch(`/api/service/${data.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengupdate progress') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Progress berhasil diupdate' })
      setShowProgress(false)
      setProgressService(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  // Bengkel submit pengajuan mutation
  const bengkelPengajuanMutation = useMutation({
    mutationFn: async (data: { id: string; items: ServiceItemForm[]; catatanBengkel?: string; submitPengajuan: boolean }) => {
      // First, save the items via PUT /api/service/[id]/items
      if (data.items && data.items.length > 0) {
        const itemsRes = await fetch(`/api/service/${data.id}/items`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: data.items.map(item => ({
              ...item,
              totalHarga: item.quantity * item.hargaSatuan,
            })),
          }),
        })
        if (!itemsRes.ok) {
          const err = await itemsRes.json()
          throw new Error(err.error || 'Gagal menyimpan item service')
        }
      }
      // Then submit pengajuan
      const res = await fetch(`/api/service/${data.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catatanBengkel: data.catatanBengkel,
          submitPengajuan: true,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengirim pengajuan') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Pengajuan berhasil dikirim' })
      setShowBengkelEdit(false)
      setBengkelEditService(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  // Bengkel progress update mutation (DISETUJUI/DIPROSES → update progress / mark as selesai)
  const bengkelProgressMutation = useMutation({
    mutationFn: async (data: { id: string; progress: number; catatanBengkel?: string; markAsSelesai?: boolean }) => {
      const payload: Record<string, unknown> = {
        progress: data.progress,
        catatanBengkel: data.catatanBengkel,
      }
      if (data.markAsSelesai) {
        payload.statusService = 'MENUNGGU_PERSETUJUAN'
        payload.progress = 100
        payload.markAsSelesai = true
      } else if (data.progress > 0) {
        payload.statusService = 'DIPROSES'
      }
      const res = await fetch(`/api/service/${data.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengupdate service') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Service berhasil diupdate' })
      setShowBengkelProgress(false)
      setBengkelProgressService(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  // Upload Nota mutation
  const uploadNotaMutation = useMutation({
    mutationFn: async ({ serviceId, files, jenisDokumen }: { serviceId: string; files: File[]; jenisDokumen: string }) => {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      formData.append('jenisDokumen', jenisDokumen)

      setUploadProgress(10)

      const res = await fetch(`/api/service/${serviceId}/documents`, {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(80)

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengupload nota') }
      const result = await res.json()
      setUploadProgress(100)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-detail', detailService?.id] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Nota berhasil diupload' })
      setShowUploadNota(false)
      setUploadProgress(0)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
      setUploadProgress(0)
    },
  })

  // Delete document mutation
  const deleteDocMutation = useMutation({
    mutationFn: async ({ serviceId, docId }: { serviceId: string; docId: string }) => {
      const res = await fetch(`/api/service/${serviceId}/documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus dokumen')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-detail', detailService?.id] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Dokumen berhasil dihapus' })
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  // Upload Item Photos mutation
  const uploadItemPhotosMutation = useMutation({
    mutationFn: async ({ serviceId, itemId, files, keterangan }: { serviceId: string; itemId: string; files: File[]; keterangan: string }) => {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      if (keterangan) formData.append('keterangan', keterangan)
      const res = await fetch(`/api/service/${serviceId}/items/${itemId}/photos`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengupload foto') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-detail', detailService?.id] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Foto berhasil diupload' })
      setItemPhotoDialogOpen(false)
      setSelectedItemForPhotos(null)
      setPhotoFiles([])
      setPhotoPreviews([])
      setPhotoKeterangan('')
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  // Delete Item Photo mutation
  const deleteItemPhotoMutation = useMutation({
    mutationFn: async ({ serviceId, itemId, photoId }: { serviceId: string; itemId: string; photoId: string }) => {
      const res = await fetch(`/api/service/${serviceId}/items/${itemId}/photos/${photoId}`, {
        method: 'DELETE',
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menghapus foto') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-detail', detailService?.id] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Foto berhasil dihapus' })
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  // Detail query
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['service-detail', detailService?.id],
    queryFn: async () => {
      const res = await fetch(`/api/service/${detailService!.id}`)
      if (!res.ok) throw new Error('Gagal mengambil detail')
      return res.json()
    },
    enabled: !!detailService?.id,
  })

  const detail = detailData?.data as Service | undefined

  // Handlers
  const handleAddNew = () => {
    setEditingService(null)
    setShowAddEdit(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setShowAddEdit(true)
  }

  const handleDetail = (service: Service) => {
    setDetailService(service)
    setShowDetail(true)
  }

  const handleApproveReject = (service: Service) => {
    setApprovalService(service)
    setRejectReason('')
    setShowApproval(true)
  }

  const handleProgress = (service: Service) => {
    setProgressService(service)
    setShowProgress(true)
  }

  const handleBengkelEdit = (service: Service) => {
    setBengkelEditService(service)
    setShowBengkelEdit(true)
  }

  const handleBengkelProgress = (service: Service) => {
    setBengkelProgressService(service)
    setShowBengkelProgress(true)
  }

  const handleBengkelUploadNota = (service: Service) => {
    setDetailService(service)
    setShowUploadNota(true)
  }

  const handleOpenPhotoUpload = (item: ServiceItem) => {
    setSelectedItemForPhotos(item)
    setPhotoFiles([])
    setPhotoPreviews([])
    setPhotoKeterangan('')
    setItemPhotoDialogOpen(true)
  }

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    const newFiles = [...photoFiles, ...selected].slice(0, 10)
    setPhotoFiles(newFiles)
    // Generate previews
    const newPreviews: string[] = []
    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file)
      newPreviews.push(url)
    })
    setPhotoPreviews(newPreviews)
  }

  const handleRemovePhotoFile = (index: number) => {
    const newFiles = photoFiles.filter((_, i) => i !== index)
    const newPreviews = photoPreviews.filter((_, i) => i !== index)
    if (photoPreviews[index]) URL.revokeObjectURL(photoPreviews[index])
    setPhotoFiles(newFiles)
    setPhotoPreviews(newPreviews)
  }

  const handleUploadPhotos = () => {
    if (!detailService?.id || !selectedItemForPhotos || photoFiles.length === 0) return
    uploadItemPhotosMutation.mutate({
      serviceId: detailService.id,
      itemId: selectedItemForPhotos.id,
      files: photoFiles,
      keterangan: photoKeterangan,
    })
  }

  const handleDeletePhoto = (photo: ServiceItemPhoto) => {
    if (!detailService?.id) return
    deleteItemPhotoMutation.mutate({
      serviceId: detailService.id,
      itemId: photo.itemId,
      photoId: photo.id,
    })
  }

  const handleSubmit = (data: ServiceFormData) => {
    if (editingService) {
      updateMutation.mutate({ ...data, id: editingService.id })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  // ========== Role-based action helpers ==========
  const getBengkelActions = (status: StatusService) => {
    switch (status) {
      case 'DIAJUKAN':
        return { edit: true, uploadNota: true, updateProgress: false, tandaiSelesai: false, detail: true }
      case 'DITOLAK':
        return { edit: true, uploadNota: false, updateProgress: false, tandaiSelesai: false, detail: true }
      case 'PENGAJUAN':
        return { edit: false, uploadNota: false, updateProgress: false, tandaiSelesai: false, detail: true }
      case 'DISETUJUI':
        return { edit: false, uploadNota: true, updateProgress: true, tandaiSelesai: false, detail: true }
      case 'DIPROSES':
        return { edit: false, uploadNota: true, updateProgress: true, tandaiSelesai: true, detail: true }
      case 'MENUNGGU_PERSETUJUAN':
        return { edit: false, uploadNota: false, updateProgress: false, tandaiSelesai: false, detail: true }
      case 'SELESAI':
      default:
        return { edit: false, uploadNota: false, updateProgress: false, tandaiSelesai: false, detail: true }
    }
  }

  const getAdminActions = (status: StatusService) => {
    switch (status) {
      case 'DIAJUKAN':
        return { edit: true, approveReject: true, updateProgress: false, delete: true, detail: true }
      case 'PENGAJUAN':
        return { edit: false, approveReject: true, updateProgress: false, delete: false, detail: true }
      case 'DITOLAK':
        return { edit: true, approveReject: false, updateProgress: false, delete: true, detail: true }
      case 'DISETUJUI':
        return { edit: true, approveReject: false, updateProgress: true, delete: true, detail: true }
      case 'DIPROSES':
        return { edit: false, approveReject: false, updateProgress: true, delete: true, detail: true }
      case 'MENUNGGU_PERSETUJUAN':
        return { edit: false, approveReject: true, updateProgress: false, delete: false, detail: true }
      case 'SELESAI':
      default:
        return { edit: false, approveReject: false, updateProgress: false, delete: false, detail: true }
    }
  }

  return (
    <div className="space-y-4">
      {/* Role Indicator Banner */}
      {isBengkel && (
        <div className="animate-slide-up flex items-center gap-3 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20 p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
            <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Mode Bengkel</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Anda hanya dapat melihat dan mengelola service yang ditugaskan ke bengkel Anda</p>
          </div>
        </div>
      )}
      {isPimpinan && (
        <div className="animate-slide-up flex items-center gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
            <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Mode Pimpinan</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Anda hanya dapat melihat data service sebagai baca saja</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="animate-slide-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20">
            <Wrench className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Service Kendaraan
              <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                {pagination.total} data
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola service dan perbaikan kendaraan operasional
            </p>
          </div>
        </div>
        {canCreateService && !isPimpinan && (
          <Button onClick={handleAddNew} className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/20 active:scale-[0.98] transition-all">
            <Plus className="h-4 w-4" />
            Tambah Service
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="animate-slide-up animate-stagger-1">
      <Card className="shadow-sm border border-border/50 bg-background/80 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nomor service, nopol, bengkel..."
                className="pl-9 bg-background/60 border-border/50 focus:border-teal-500/50 focus:ring-teal-500/20"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg border-border/50 hover:border-teal-500/50 hover:text-teal-600"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label className="text-xs mb-1">Status</Label>
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === 'ALL' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Bengkel</Label>
                {isBengkel ? (
                  <Input className="h-9 text-sm bg-muted/50" value={user?.name || 'Bengkel Anda'} disabled />
                ) : (
                  <Select value={filterBengkel} onValueChange={(v) => { setFilterBengkel(v === 'ALL' ? '' : v); setPage(1) }}>
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="Semua Bengkel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Bengkel</SelectItem>
                      {workshops.map((w: { id: string; namaBengkel: string }) => (
                        <SelectItem key={w.id} value={w.id}>{w.namaBengkel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1">Jenis Service</Label>
                <Select value={filterJenis} onValueChange={(v) => { setFilterJenis(v === 'ALL' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Semua Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Jenis</SelectItem>
                    {JENIS_SERVICE_OPTIONS.map((j) => (
                      <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Tanggal Mulai</Label>
                <Input type="date" className="h-9 text-sm" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
              </div>
              <div>
                <Label className="text-xs mb-1">Tanggal Akhir</Label>
                <Input type="date" className="h-9 text-sm" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Data Table */}
      <Card className="animate-slide-up animate-stagger-2 shadow-sm border border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {servicesLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-fade-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/30 mb-4">
                <Wrench className="h-10 w-10 opacity-30" />
              </div>
              <p className="text-lg font-medium">Belum ada data service</p>
              <p className="text-sm mt-1">Tambahkan service baru untuk kendaraan operasional</p>
              {canCreateService && !isPimpinan && (
                <Button variant="outline" size="sm" className="mt-4 gap-2 rounded-lg" onClick={handleAddNew}>
                  <Plus className="h-4 w-4" /> Tambah Service
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                      <TableHead className="w-10 text-center font-semibold">No</TableHead>
                      <TableHead className="font-semibold">Nomor Service</TableHead>
                      <TableHead className="font-semibold">Tanggal</TableHead>
                      <TableHead className="font-semibold">Kendaraan</TableHead>
                      <TableHead className="font-semibold">Bengkel</TableHead>
                      <TableHead className="font-semibold">Jenis</TableHead>
                      <TableHead className="text-right font-semibold">Total Biaya</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Progress</TableHead>
                      <TableHead className="text-center font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service: Service, idx: number) => {
                      const bengkelActions = isBengkel ? getBengkelActions(service.statusService as StatusService) : null
                      const adminActions = isAdmin ? getAdminActions(service.statusService as StatusService) : null

                      return (
                        <TableRow key={service.id} className={`transition-all duration-200 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 hover:shadow-sm ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {(page - 1) * limit + idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm font-medium">
                              {service.documentNumber || service.nomorService}
                            </div>
                            {service.documentNumber && (
                              <div className="text-xs text-muted-foreground font-mono">{service.nomorService}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(service.tanggalService)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="text-sm font-medium">{service.vehicle?.nomorPolisi}</span>
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {service.vehicle?.merk} {service.vehicle?.type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{service.bengkel?.namaBengkel}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs shadow-sm">{service.jenisService}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatRupiah(service.totalBiaya)}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-xs border', STATUS_COLORS[service.statusService as StatusService])}>
                              {STATUS_LABELS[service.statusService as StatusService]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="relative flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                                    service.progress >= 100
                                      ? 'bg-gradient-to-r from-purple-400 to-purple-500'
                                      : service.progress > 50
                                      ? 'bg-gradient-to-r from-teal-400 to-emerald-500'
                                      : 'bg-gradient-to-r from-amber-400 to-amber-500'
                                  }`}
                                  style={{ width: service.progress + '%' }}
                                />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground w-8 text-right">{service.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {/* Detail button - visible to all roles */}
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400 transition-colors" onClick={() => handleDetail(service)} title="Detail">
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* BENGKEL role actions */}
                              {isBengkel && bengkelActions && (
                                <>
                                  {/* Edit button - for DIAJUKAN/DITOLAK (opens BengkelEditDialog to add items & submit pengajuan) */}
                                  {bengkelActions.edit && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 transition-colors" onClick={() => handleBengkelEdit(service)} title="Edit & Kirim Pengajuan">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {/* Upload Nota */}
                                  {bengkelActions.uploadNota && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-colors" onClick={() => handleBengkelUploadNota(service)} title="Upload Nota">
                                      <Upload className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {/* Update Progress - for DISETUJUI/DIPROSES */}
                                  {bengkelActions.updateProgress && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/30 dark:hover:text-orange-400 transition-colors" onClick={() => handleBengkelProgress(service)} title="Update Progress">
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {/* Tandai Selesai - for DIPROSES */}
                                  {bengkelActions.tandaiSelesai && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors" onClick={() => handleBengkelProgress(service)} title="Tandai Selesai">
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* PIMPINAN role - detail only, no other actions */}

                              {/* ADMIN/SUPER_ADMIN role actions */}
                              {isAdmin && adminActions && (
                                <>
                                  {/* Edit - for DIAJUKAN/DITOLAK/DISETUJUI */}
                                  {adminActions.edit && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 transition-colors" onClick={() => handleEdit(service)} title="Edit">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {/* Approve/Reject - for DIAJUKAN/PENGAJUAN/MENUNGGU_PERSETUJUAN */}
                                  {adminActions.approveReject && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors" onClick={() => handleApproveReject(service)} title="Setujui/Tolak">
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {/* Update Progress - for DISETUJUI/DIPROSES */}
                                  {adminActions.updateProgress && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/30 dark:hover:text-orange-400 transition-colors" onClick={() => handleProgress(service)} title="Update Progress">
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {/* Delete */}
                                  {adminActions.delete && (
                                    <DeleteButton serviceId={service.id} nomorService={service.nomorService} onDelete={() => deleteMutation.mutate(service.id)} isDeleting={deleteMutation.isPending} />
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/50 px-4 py-3 bg-muted/10">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan <span className="font-medium text-foreground">{(page - 1) * limit + 1}</span> - <span className="font-medium text-foreground">{Math.min(page * limit, pagination.total)}</span> dari <span className="font-medium text-foreground">{pagination.total}</span> data
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium px-2">{page} / {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog (Admin) */}
      <ServiceFormDialog
        open={showAddEdit}
        onOpenChange={(open) => { setShowAddEdit(open); if (!open) setEditingService(null) }}
        editingService={editingService}
        vehicles={vehicles}
        workshops={workshops}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Admin Approval Dialog */}
      <ApprovalDialog
        key={approvalService?.id || 'approval-new'}
        open={showApproval}
        onOpenChange={(open) => { setShowApproval(open); if (!open) { setApprovalService(null); setRejectReason('') } }}
        service={approvalService}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onApprove={() => approveMutation.mutate({ id: approvalService!.id, action: 'approve' })}
        onReject={(reason) => approveMutation.mutate({ id: approvalService!.id, action: 'reject', rejectedReason: reason })}
        isSubmitting={approveMutation.isPending}
      />

      {/* Admin Progress Dialog */}
      <ProgressDialog
        key={progressService?.id || 'new'}
        open={showProgress}
        onOpenChange={setShowProgress}
        service={progressService}
        onSubmit={(data) => progressMutation.mutate({ id: progressService!.id, ...data })}
        isSubmitting={progressMutation.isPending}
      />

      {/* Bengkel Edit Dialog (DIAJUKAN/DITOLAK - add items & submit pengajuan) */}
      <BengkelEditDialog
        key={bengkelEditService?.id || 'bengkel-edit-new'}
        open={showBengkelEdit}
        onOpenChange={(open) => { setShowBengkelEdit(open); if (!open) setBengkelEditService(null) }}
        service={bengkelEditService}
        onSubmit={(data) => bengkelPengajuanMutation.mutate({ id: bengkelEditService!.id, ...data })}
        isSubmitting={bengkelPengajuanMutation.isPending}
      />

      {/* Bengkel Progress Dialog (DISETUJUI/DIPROSES - update progress / mark as selesai) */}
      <BengkelProgressDialog
        key={bengkelProgressService?.id || 'bengkel-progress-new'}
        open={showBengkelProgress}
        onOpenChange={(open) => { setShowBengkelProgress(open); if (!open) setBengkelProgressService(null) }}
        service={bengkelProgressService}
        onSubmit={(data) => bengkelProgressMutation.mutate({ id: bengkelProgressService!.id, ...data })}
        isSubmitting={bengkelProgressMutation.isPending}
      />

      {/* Detail Sheet - Modernized */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto p-0">
          <SheetTitle className="sr-only">Detail Service</SheetTitle>
          {detailLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-32 w-full" />
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : detail ? (
            <div className="flex flex-col">
              {/* Gradient Header Banner */}
              <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-teal-900 px-6 py-5 text-white relative overflow-hidden animate-fade-in">
                {/* Decorative blur elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full translate-y-6 -translate-x-6 blur-xl" />
                <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/10">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Detail Service</h2>
                      <p className="text-sm text-slate-300 font-mono">{detail.documentNumber || detail.nomorService}</p>
                      {detail.documentNumber && (
                        <p className="text-xs text-slate-400 font-mono">{detail.nomorService}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={cn('text-sm border px-3 py-1', STATUS_COLORS[detail.statusService as StatusService])}>
                    {STATUS_LABELS[detail.statusService as StatusService]}
                  </Badge>
                </div>
                {/* Progress bar with gradient */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-300">Progress</span>
                    <span className="font-bold">{detail.progress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        detail.progress >= 100
                          ? 'bg-gradient-to-r from-purple-400 to-purple-500'
                          : detail.progress > 50
                          ? 'bg-gradient-to-r from-teal-400 to-emerald-500'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500'
                      }`}
                      style={{ width: detail.progress + '%' }}
                    />
                  </div>
                </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* General Info Card */}
                <Card className="animate-slide-up animate-stagger-1 shadow-sm border border-border/50 bg-gradient-to-br from-white to-slate-50/50 dark:from-card dark:to-slate-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
                      <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Informasi Umum
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5 shrink-0">
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tanggal Service</p>
                          <p className="font-semibold">{formatDate(detail.tanggalService)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5 shrink-0">
                          <Car className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Kendaraan</p>
                          <p className="font-semibold">{detail.vehicle?.nomorPolisi}</p>
                          <p className="text-xs text-muted-foreground">{detail.vehicle?.merk} {detail.vehicle?.type}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5 shrink-0">
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bengkel</p>
                          <p className="font-semibold">{detail.bengkel?.namaBengkel}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5 shrink-0">
                          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Jenis / Prioritas</p>
                          <p className="font-semibold">{detail.jenisService} • {detail.prioritas}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5 shrink-0">
                          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Kilometer</p>
                          <p className="font-semibold">{detail.kilometerService?.toLocaleString('id-ID')} km</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5 shrink-0">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Est. Lama Perbaikan</p>
                          <p className="font-semibold">{detail.estimasiLamaPerbaikan ? detail.estimasiLamaPerbaikan + ' hari' : '-'}</p>
                        </div>
                      </div>
                    </div>
                    {detail.keterangan && (
                      <div className="mt-3 p-2.5 rounded-lg bg-muted/50 dark:bg-muted/20 text-sm">
                        <p className="text-xs text-muted-foreground mb-0.5">Keterangan</p>
                        <p>{detail.keterangan}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Items Table - Polished */}
                <Card className="animate-slide-up animate-stagger-2 shadow-sm border border-border/50 bg-gradient-to-br from-white to-slate-50/50 dark:from-card dark:to-slate-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
                      <ClipboardCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Item Service
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detail.items && detail.items.length > 0 ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                                <TableHead className="text-xs font-semibold">Item</TableHead>
                                <TableHead className="text-xs font-semibold text-center">Qty</TableHead>
                                <TableHead className="text-xs font-semibold text-right">Harga</TableHead>
                                <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                                <TableHead className="text-xs font-semibold text-center">Foto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detail.items.map((item: ServiceItem, idx: number) => {
                                const itemPhotos = (item.photos || []) as ServiceItemPhoto[]
                                return (
                                  <TableRow key={item.id} className={`transition-colors hover:bg-teal-50/50 dark:hover:bg-teal-950/20 ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}>
                                    <TableCell className="text-sm">
                                      {item.itemName}
                                      {item.keterangan && <p className="text-xs text-muted-foreground">{item.keterangan}</p>}
                                    </TableCell>
                                    <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-sm text-right">{formatRupiah(item.hargaSatuan)}</TableCell>
                                    <TableCell className="text-sm text-right font-medium">{formatRupiah(item.totalHarga)}</TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        {itemPhotos.length > 0 && (
                                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5">
                                            <ImageIcon className="h-3 w-3" />
                                            {itemPhotos.length}
                                          </Badge>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                          onClick={() => handleOpenPhotoUpload(item)}
                                          title="Upload Foto"
                                        >
                                          <ImagePlus className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                          {/* Total Summary */}
                          <div className="border-t p-3 bg-gradient-to-r from-slate-50 to-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-muted-foreground">Total</span>
                              <span className="text-lg font-bold">{formatRupiah(detail.totalBiaya)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Photo Gallery per Item */}
                        {detail.items.some((item: ServiceItem) => (item.photos || []).length > 0) && (
                          <div className="space-y-3">
                            {detail.items.filter((item: ServiceItem) => (item.photos || []).length > 0).map((item: ServiceItem) => {
                              const photos = (item.photos || []) as ServiceItemPhoto[]
                              return (
                                <div key={item.id} className="rounded-lg border p-3 bg-slate-50/30">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{item.itemName}</span>
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                      {photos.length} foto
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {photos.map((photo: ServiceItemPhoto) => (
                                      <div key={photo.id} className="relative group">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border overflow-hidden bg-white cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                                          onClick={() => { setPhotoViewerSrc(photo.filePath); setPhotoViewerOpen(true) }}
                                        >
                                          <img
                                            src={photo.filePath}
                                            alt={photo.fileName}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        {/* Delete overlay */}
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => handleDeletePhoto(photo)}
                                          disabled={deleteItemPhotoMutation.isPending}
                                          title="Hapus foto"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                        {/* Zoom overlay */}
                                        <div
                                          className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                          onClick={() => { setPhotoViewerSrc(photo.filePath); setPhotoViewerOpen(true) }}
                                        >
                                          <ZoomIn className="h-4 w-4 text-white" />
                                        </div>
                                        {photo.keterangan && (
                                          <p className="text-[10px] text-muted-foreground mt-0.5 w-16 sm:w-20 truncate" title={photo.keterangan}>
                                            {photo.keterangan}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Tidak ada item service</p>
                    )}
                  </CardContent>
                </Card>

                {/* Approval Info */}
                {(detail.approvedBy || detail.rejectedReason) && (
                  <Card className="animate-slide-up animate-stagger-3 shadow-sm border border-border/50 bg-gradient-to-br from-white to-slate-50/50 dark:from-card dark:to-slate-900/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
                        <CheckCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        Persetujuan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detail.approvedBy && (
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Disetujui oleh <strong>{detail.approvedBy}</strong></span>
                          {detail.approvedAt && <span className="text-muted-foreground">({formatDate(detail.approvedAt)})</span>}
                        </div>
                      )}
                      {detail.rejectedReason && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                          <strong>Alasan Ditolak:</strong> {detail.rejectedReason}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Catatan Bengkel */}
                {detail.catatanBengkel && (
                  <Card className="animate-slide-up animate-stagger-3 shadow-sm border border-border/50 bg-gradient-to-br from-white to-slate-50/50 dark:from-card dark:to-slate-900/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
                        <Wrench className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        Catatan Bengkel
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm rounded-lg bg-muted/50 p-3">{detail.catatanBengkel}</p>
                    </CardContent>
                  </Card>
                )}

                {/* History - Timeline Style */}
                {detail.history && detail.history.length > 0 && (
                  <Card className="animate-slide-up animate-stagger-4 shadow-sm border border-border/50 bg-gradient-to-br from-white to-slate-50/50 dark:from-card dark:to-slate-900/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <div className="h-1 w-4 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
                          <History className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                          Riwayat
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 rounded-lg border-border/50 hover:border-teal-500/50 hover:text-teal-600"
                          onClick={async () => {
                            const settings = (settingsData || {}) as Record<string, string>
                            const printItems = Array.isArray(detail.items) ? detail.items : []
                            const itemsSubtotal = printItems.reduce((sum: number, item: any) => sum + (item.totalHarga || 0), 0)
                            const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

                            // Use existing document number or generate new one from API
                            let docNumber = detail.documentNumber || `${String(Math.floor(Math.random() * 900) + 100)}/BKAD/SRV/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`
                            if (!detail.documentNumber) {
                              try {
                                const genRes = await fetch('/api/document-numbering/generate', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ code: 'SRV' }),
                                })
                                if (genRes.ok) {
                                  const genData = await genRes.json()
                                  docNumber = genData.documentNumber
                                  // Save document number to service record
                                  fetch(`/api/service/${detail.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ documentNumber: docNumber }),
                                  }).catch(() => {})
                                }
                              } catch {}
                            }

                            // Build KOP SURAT HTML
                            const kopLogoHtml = settings.app_print_logo || settings.app_logo
                              ? `<img src="${window.location.origin}${settings.app_print_logo || settings.app_logo}" style="width:60px;height:60px;border-radius:0;object-fit:contain;" />`
                              : `<div class="kop-logo-inner">LOGO</div>`
                            const kopHtml = `<div class="kop-surat"><div class="kop-content"><div class="kop-logo">${kopLogoHtml}</div><div class="kop-text"><div class="kop-line1">${settings.app_kop_line1 || 'PEMERINTAH KABUPATEN/KOTA'}</div><div class="kop-line2">${settings.app_kop_line2 || 'BADAN KEUANGAN DAN ASET DAERAH'}</div><div class="kop-line3">${settings.app_kop_line3 || 'UNIT LAYANAN PENGADAAN'}</div><div class="kop-address">${settings.app_address || 'Jl. Merdeka No. 1, Kota Selatan | Telp. (021) 123-4567 | Email: bkad@pemda.go.id'}</div></div></div><div class="kop-border"><div class="kop-border-inner"></div></div></div>`

                            // Build items table HTML
                            let itemsHtml = ''
                            if (printItems.length > 0) {
                              const itemRows = printItems.map((item: any, idx: number) =>
                                `<tr><td class="center">${idx + 1}</td><td>${item.itemName || '-'}</td><td class="right">${item.quantity || 0}</td><td class="right">${formatRupiah(item.hargaSatuan || 0)}</td><td class="right" style="font-weight:600;">${formatRupiah(item.totalHarga || 0)}</td></tr>`
                              ).join('')
                              itemsHtml = `<div class="items-section"><div class="items-title">Detail Item Service</div><table class="items-table"><thead><tr><th class="center" style="width:30px;">No</th><th>Nama Item</th><th class="right">Qty</th><th class="right">Harga Satuan</th><th class="right">Total Harga</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr><td colspan="4" style="text-align:right;">Subtotal</td><td class="right">${formatRupiah(itemsSubtotal)}</td></tr></tfoot></table></div>`
                            }

                            // Build timeline HTML
                            const timelineItems = detail.history.map((h: any, i: number) =>
                              `<div class="timeline-item"><div class="timeline-dot ${i === 0 ? 'active' : 'done'}"></div><div><span class="timeline-status status-${h.status}">${h.status}</span><span class="timeline-date">${new Date(h.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><p class="timeline-desc">${h.keterangan || '-'}</p></div></div>`
                            ).join('')

                            // Build signature HTML with QR code for document and vehicle
                            const docQrData = `${window.location.origin}/verify/${detail.id}`
                            const vehicleInfo = `${detail.vehicle?.nomorPolisi || '-'}|${detail.vehicle?.merk || ''} ${detail.vehicle?.type || ''}|${detail.vehicle?.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}|${detail.vehicle?.nomorRangka || '-'}|${detail.vehicle?.nomorMesin || '-'}`
                            // Generate QR codes synchronously for print (using pre-generated data URLs as fallback)
                            let docQrImgHtml = `<div style="width:120px;height:120px;border:1px solid #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#888;">QR Code</div>`
                            let vehicleQrImgHtml = `<div style="width:100px;height:100px;border:1px solid #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:7pt;color:#888;">QR Code</div>`
                            try {
                              const docQr = await generateQRDataURL(docQrData, 150)
                              if (docQr) docQrImgHtml = `<img src="${docQr}" alt="QR Code Dokumen" style="width:120px;height:120px;" />`
                              const vehQr = await generateQRDataURL(vehicleInfo, 100)
                              if (vehQr) vehicleQrImgHtml = `<img src="${vehQr}" alt="QR Code Kendaraan" style="width:100px;height:100px;" />`
                            } catch {}
                            const sigHtml = `<div class="signature-section"><div class="sig-qr">${docQrImgHtml}<div class="sig-qr-label">Scan untuk verifikasi dokumen</div></div><div class="sig-block"><div class="sig-date">${settings.app_kabupaten_kota || settings.app_tempat_ttd || 'Kabupaten/Kota'}, ${printDate}</div><div class="sig-jabatan">${settings.app_kepala_jabatan || 'Kepala BKAD'}</div>${settings.app_tte_image ? `<div style="height:70px;display:flex;align-items:flex-end;justify-content:center;"><img src="${window.location.origin}${settings.app_tte_image}" alt="Tanda Tangan Elektronik" style="max-height:70px;max-width:200px;object-fit:contain;" /></div>` : kepalaSignature ? `<div style="height:60px;display:flex;align-items:flex-end;justify-content:center;"><img src="${kepalaSignature}" alt="Tanda Tangan" style="max-height:55px;max-width:180px;object-fit:contain;" /></div>` : `<div style="height:60px;"></div>`}<div class="sig-name">${settings.app_kepala_nama || '________________________'}</div><div class="sig-nip">NIP. ${settings.app_kepala_nip || '________________________'}</div>${settings.app_tte_image ? `<div class="sig-tte-label">Tanda Tangan Elektronik</div>` : ''}</div></div><div class="vehicle-qr-section">${vehicleQrImgHtml}<div class="vehicle-qr-info"><div class="vehicle-qr-title">QR Code Kendaraan</div><div class="vehicle-qr-detail">${detail.vehicle?.nomorPolisi || '-'} &bull; ${detail.vehicle?.merk || ''} ${detail.vehicle?.type || ''}<br/>${detail.vehicle?.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}${detail.vehicle?.nomorRangka ? ` | Rangka: ${detail.vehicle.nomorRangka}` : ''}${detail.vehicle?.nomorMesin ? ` | Mesin: ${detail.vehicle.nomorMesin}` : ''}</div></div></div>`

                            const printHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Timeline Service - ${detail.nomorService}</title>
<style>
  @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; position: relative; }
  .kop-surat { text-align: center; padding-bottom: 8px; position: relative; }
  .kop-content { display: flex; align-items: center; justify-content: center; gap: 14px; }
  .kop-logo { width: 72px; height: 72px; border: none; border-radius: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .kop-logo-inner { width: 60px; height: 60px; border: none; border-radius: 0; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; color: #1a1a1a; }
  .kop-text { text-align: center; }
  .kop-line1 { font-size: 11pt; font-weight: normal; letter-spacing: 1px; }
  .kop-line2 { font-size: 14pt; font-weight: bold; letter-spacing: 2px; margin: 1px 0; }
  .kop-line3 { font-size: 10pt; font-weight: normal; letter-spacing: 0.5px; }
  .kop-address { font-size: 9pt; margin-top: 2px; color: #333; }
  .kop-border { border-top: 3px double #1a1a1a; margin-top: 8px; padding-top: 0; }
  .kop-border-inner { border-top: 1px solid #1a1a1a; margin-top: 2px; }
  .doc-info { text-align: center; margin: 18px 0 14px 0; }
  .doc-title { font-size: 13pt; font-weight: bold; letter-spacing: 1px; margin-bottom: 6px; }
  .doc-meta { font-size: 9.5pt; color: #444; line-height: 1.6; }
  .info-grid { display: grid; grid-template-columns: 120px 1fr; gap: 4px 12px; font-size: 10pt; margin-bottom: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; background: #fafafa; }
  .info-label { font-weight: 600; color: #555; }
  .items-section { margin: 14px 0; }
  .items-title { font-size: 10pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .items-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .items-table thead th { background: #2c3e50; color: #fff; padding: 7px 6px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; }
  .items-table thead th.right { text-align: right; }
  .items-table thead th.center { text-align: center; }
  .items-table tbody td { padding: 5px 6px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  .items-table tbody tr:nth-child(even) { background: #f8f9fa; }
  .items-table tbody tr:nth-child(odd) { background: #fff; }
  .items-table tfoot td { padding: 7px 6px; font-weight: bold; border-top: 2px solid #2c3e50; background: #ecf0f1; font-size: 9pt; }
  .timeline-section { margin: 14px 0; }
  .timeline-section-title { font-size: 10pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .timeline { position: relative; padding-left: 24px; }
  .timeline-line { position: absolute; left: 8px; top: 4px; bottom: 4px; width: 2px; background: #ccc; }
  .timeline-item { position: relative; margin-bottom: 16px; }
  .timeline-dot { position: absolute; left: -20px; top: 4px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; }
  .timeline-dot.active { background: #2c3e50; }
  .timeline-dot.done { background: #95a5a6; }
  .timeline-status { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9pt; font-weight: 600; margin-bottom: 2px; }
  .timeline-date { font-size: 8.5pt; color: #888; margin-left: 6px; }
  .timeline-desc { font-size: 9.5pt; color: #444; margin-top: 2px; }
  .status-DIAJUKAN { background: #cce5ff; color: #004085; }
  .status-DISETUJUI { background: #d1ecf1; color: #0c5460; }
  .status-DITOLAK { background: #f8d7da; color: #721c24; }
  .status-DIPROSES { background: #fff3cd; color: #856404; }
  .status-PENGAJUAN { background: #e8daef; color: #6c3483; }
  .status-MENUNGGU_PERSETUJUAN { background: #d6eaf8; color: #2e4053; }
  .status-SELESAI { background: #d4edda; color: #155724; }
  .status-PENDING { background: #ffeaa7; color: #6c5ce7; }
  .signature-section { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
  .sig-qr { width: 140px; text-align: center; }
  .sig-qr img { width: 120px; height: 120px; border: 1px solid #ccc; border-radius: 4px; }
  .sig-qr-label { font-size: 7.5pt; color: #555; margin-top: 4px; line-height: 1.3; }
  .sig-block { text-align: center; width: 220px; }
  .sig-date { font-size: 9pt; margin-bottom: 4px; }
  .sig-name { font-size: 9pt; border-bottom: 1px solid #1a1a1a; padding-bottom: 2px; margin-bottom: 2px; font-weight: bold; min-height: 16px; }
  .sig-jabatan { font-size: 8.5pt; font-weight: bold; }
  .sig-title { font-size: 8.5pt; font-weight: bold; }
  .sig-nip { font-size: 8pt; color: #555; }
  .sig-tte-label { font-size: 7.5pt; color: #888; font-style: italic; }
  .vehicle-qr-section { margin-top: 14px; padding: 10px; border: 1px solid #e5e5e5; border-radius: 6px; background: #fafafa; display: flex; align-items: center; gap: 12px; }
  .vehicle-qr-section img { width: 80px; height: 80px; border: 1px solid #ccc; border-radius: 4px; }
  .vehicle-qr-info { font-size: 8.5pt; }
  .vehicle-qr-title { font-weight: bold; margin-bottom: 2px; }
  .vehicle-qr-detail { color: #555; font-size: 7.5pt; line-height: 1.4; }
  .doc-footer { margin-top: 30px; padding-top: 8px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 7.5pt; color: #888; }
  @media print { body { margin: 0; padding: 0; background: #fff; } .page { margin: 0; width: 100%; } }
</style>
</head>
<body>
<div class="page">
  ${kopHtml}
  <div class="doc-info">
    <div class="doc-title">TIMELINE SERVICE KENDARAAN</div>
    <div class="doc-meta">Nomor Surat: ${docNumber}<br/>Nomor Service: ${detail.nomorService}<br/>Tanggal Cetak: ${printDate}</div>
  </div>
  <div class="info-grid">
    <span class="info-label">Nomor Surat</span><span style="font-weight:bold;">${docNumber}</span>
    <span class="info-label">Nomor Service</span><span>${detail.nomorService}</span>
    <span class="info-label">Tanggal</span><span>${detail.tanggalService ? new Date(detail.tanggalService).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
    <span class="info-label">Kendaraan</span><span>${detail.vehicle?.nomorPolisi || '-'} - ${detail.vehicle?.merk || ''} ${detail.vehicle?.type || ''}</span>
    <span class="info-label">Bengkel</span><span>${detail.bengkel?.namaBengkel || '-'}</span>
    <span class="info-label">Jenis Service</span><span>${detail.jenisService || '-'}</span>
    <span class="info-label">Status</span><span>${detail.statusService}</span>
    <span class="info-label">Total Biaya</span><span>${formatRupiah(detail.totalBiaya || 0)}</span>
    <span class="info-label">Keterangan</span><span>${detail.keterangan || '-'}</span>
  </div>
  ${itemsHtml}
  <div class="timeline-section">
    <div class="timeline-section-title">Timeline Service</div>
    <div class="timeline">
      <div class="timeline-line"></div>
      ${timelineItems}
    </div>
  </div>
  ${sigHtml}
  <div class="doc-footer">
    <div>Dicetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</div>
    <div style="font-style:italic;">Dokumen ini merupakan catatan resmi dinas yang sah</div>
    <div>Halaman 1 dari 1</div>
  </div>
</div>
</body>
</html>`
                            const printWin = window.open('', '_blank', 'width=800,height=600')
                            if (printWin) {
                              printWin.document.write(printHtml)
                              printWin.document.close()
                              printWin.focus()
                              setTimeout(() => printWin.print(), 500)
                            }
                          }}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Cetak Timeline
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="relative pl-6 max-h-48 overflow-y-auto">
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-teal-500/60 via-emerald-400/40 to-slate-200 dark:to-slate-700" />
                        <div className="space-y-4">
                          {detail.history.map((h: { id: string; status: string; keterangan: string | null; createdAt: string }, idx: number) => (
                            <div key={h.id} className={`relative flex items-start gap-3 animate-slide-up animate-stagger-${Math.min(idx + 1, 8)}`}>
                              <div className={'absolute -left-4 mt-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-800 z-10 shadow-sm ' + (idx === 0 ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-slate-300 dark:bg-slate-600')} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs shadow-sm">{h.status}</Badge>
                                  <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                                </div>
                                <p className="text-muted-foreground text-xs mt-0.5">{h.keterangan}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Documents Section */}
                <Card className="animate-slide-up animate-stagger-5 shadow-sm border border-border/50 bg-gradient-to-br from-white to-slate-50/50 dark:from-card dark:to-slate-900/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
                        <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        Dokumen
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-lg border-border/50 hover:border-teal-500/50 hover:text-teal-600"
                        onClick={() => setShowUploadNota(true)}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Nota
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {detail.documents && detail.documents.length > 0 ? (
                      <div className="space-y-2">
                        {detail.documents.map((doc: ServiceDocument) => {
                          const ext = doc.fileName.split('.').pop()?.toLowerCase() || ''
                          const extColors: Record<string, string> = {
                            pdf: 'bg-red-100 text-red-700',
                            doc: 'bg-blue-100 text-blue-700',
                            docx: 'bg-blue-100 text-blue-700',
                            xls: 'bg-emerald-100 text-emerald-700',
                            xlsx: 'bg-emerald-100 text-emerald-700',
                            jpg: 'bg-purple-100 text-purple-700',
                            jpeg: 'bg-purple-100 text-purple-700',
                            png: 'bg-purple-100 text-purple-700',
                          }
                          return (
                            <div key={doc.id} className="flex items-center gap-3 text-sm p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                              <Badge variant="outline" className={'text-[10px] font-bold ' + (extColors[ext] || 'bg-gray-100 text-gray-700')}>
                                .{ext.toUpperCase()}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{doc.fileName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {doc.fileSize && (
                                    <span className="text-xs text-muted-foreground">
                                      {doc.fileSize < 1024 ? doc.fileSize + ' B' : doc.fileSize < 1024 * 1024 ? (doc.fileSize / 1024).toFixed(1) + ' KB' : (doc.fileSize / (1024 * 1024)).toFixed(1) + ' MB'}
                                    </span>
                                  )}
                                  {doc.jenisDokumen && (
                                    <Badge variant="secondary" className={cn(
                                      'text-[10px] px-1.5 py-0',
                                      doc.jenisDokumen === 'NOTA' && 'bg-blue-100 text-blue-800',
                                      doc.jenisDokumen === 'KWITANSI' && 'bg-green-100 text-green-800',
                                      doc.jenisDokumen === 'FAKTUR' && 'bg-orange-100 text-orange-800',
                                      doc.jenisDokumen === 'LAINNYA' && 'bg-gray-100 text-gray-800',
                                    )}>
                                      {doc.jenisDokumen}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Download">
                                  <a href={doc.filePath} download target="_blank" rel="noopener noreferrer">
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => deleteDocMutation.mutate({ serviceId: detail.id, docId: doc.id })}
                                  disabled={deleteDocMutation.isPending}
                                  title="Hapus"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">Belum ada dokumen</p>
                        <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => setShowUploadNota(true)}>
                          <Upload className="h-3.5 w-3.5" /> Upload Nota
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Upload Nota Dialog */}
      <Dialog open={showUploadNota} onOpenChange={setShowUploadNota}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Nota / Dokumen
            </DialogTitle>
            <DialogDescription>
              Upload nota, kwitansi, faktur, atau dokumen lainnya untuk service {detail?.nomorService}
            </DialogDescription>
          </DialogHeader>
          <MultiUpload
            onUpload={async (files, jenisDokumen) => {
              if (!detailService?.id) return
              await uploadNotaMutation.mutateAsync({
                serviceId: detailService.id,
                files,
                jenisDokumen,
              })
            }}
            isUploading={uploadNotaMutation.isPending}
            progress={uploadProgress}
          />
        </DialogContent>
      </Dialog>

      {/* Photo Upload Dialog for Service Items */}
      <Dialog open={itemPhotoDialogOpen} onOpenChange={(open) => {
        setItemPhotoDialogOpen(open)
        if (!open) {
          setSelectedItemForPhotos(null)
          setPhotoFiles([])
          setPhotoPreviews([])
          setPhotoKeterangan('')
          photoPreviews.forEach(url => URL.revokeObjectURL(url))
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              Upload Foto Item
            </DialogTitle>
            <DialogDescription>
              Upload foto untuk item: <strong>{selectedItemForPhotos?.itemName}</strong>
              {detail && <span className="text-muted-foreground"> — {detail.nomorService}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Drag & drop / click area */}
            <div
              className="relative border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                if (dropped.length === 0) {
                  toast({ title: 'Format Salah', description: 'Hanya file gambar yang diperbolehkan', variant: 'destructive' })
                  return
                }
                const newFiles = [...photoFiles, ...dropped].slice(0, 10)
                setPhotoFiles(newFiles)
                const newPreviews = newFiles.map(f => URL.createObjectURL(f))
                setPhotoPreviews(newPreviews)
              }}
              onClick={() => document.getElementById('photo-upload-input')?.click()}
            >
              <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Seret & lepas foto di sini, atau <span className="text-primary font-medium">klik untuk pilih</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maksimal 10 file, JPG/PNG, maks 5MB per file
              </p>
              <input
                id="photo-upload-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                multiple
                className="hidden"
                onChange={handlePhotoFileSelect}
              />
            </div>

            {/* Preview of selected files */}
            {photoPreviews.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Preview ({photoPreviews.length} file)</Label>
                <div className="flex flex-wrap gap-2">
                  {photoPreviews.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-16 h-16 rounded-lg border overflow-hidden bg-white">
                        <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full"
                        onClick={() => handleRemovePhotoFile(idx)}
                        title="Hapus"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-0.5 w-16 truncate">
                        {photoFiles[idx]?.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keterangan */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Keterangan (opsional)</Label>
              <Input
                placeholder="Mis: Foto perbaikan, kondisi sebelum, dll."
                value={photoKeterangan}
                onChange={(e) => setPhotoKeterangan(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setItemPhotoDialogOpen(false)} disabled={uploadItemPhotosMutation.isPending}>
              Batal
            </Button>
            <Button
              onClick={handleUploadPhotos}
              disabled={photoFiles.length === 0 || uploadItemPhotosMutation.isPending}
              className="gap-2"
            >
              {uploadItemPhotosMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
              <Upload className="h-4 w-4" />
              Upload {photoFiles.length > 0 ? `${photoFiles.length} Foto` : 'Foto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer (Full Size) */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="sm:max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Lihat Foto</DialogTitle>
            <DialogDescription>Tampilan foto ukuran penuh</DialogDescription>
          </DialogHeader>
          {photoViewerSrc && (
            <div className="flex items-center justify-center bg-black/5 rounded-lg overflow-hidden max-h-[80vh]">
              <img
                src={photoViewerSrc}
                alt="Foto item service"
                className="max-w-full max-h-[78vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== Delete Button Component ==========
function DeleteButton({ serviceId, nomorService, onDelete, isDeleting }: { serviceId: string; nomorService: string; onDelete: () => void; isDeleting: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Hapus" disabled={isDeleting}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Service?</AlertDialogTitle>
          <AlertDialogDescription>
            Service <strong>{nomorService}</strong> akan dihapus. Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ========== Admin Approval Dialog ==========
interface ApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  rejectReason: string
  onRejectReasonChange: (reason: string) => void
  onApprove: () => void
  onReject: (reason: string) => void
  isSubmitting: boolean
}

function ApprovalDialog({ open, onOpenChange, service, rejectReason, onRejectReasonChange, onApprove, onReject, isSubmitting }: ApprovalDialogProps) {
  if (!service) return null

  const status = service.statusService as StatusService
  const isPengajuan = status === 'PENGAJUAN'
  const isMenungguPersetujuan = status === 'MENUNGGU_PERSETUJUAN'
  const isDiajukan = status === 'DIAJUKAN'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {isMenungguPersetujuan ? 'Persetujuan Penyelesaian' : 'Proses Persetujuan'}
          </DialogTitle>
          <DialogDescription>
            Service {service.nomorService} - {service.vehicle?.nomorPolisi}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Status context */}
          <div className={cn(
            'rounded-lg border-2 p-3',
            isPengajuan && 'border-cyan-300 bg-cyan-50',
            isMenungguPersetujuan && 'border-amber-300 bg-amber-50',
            isDiajukan && 'border-blue-300 bg-blue-50',
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isPengajuan && <Send className="h-4 w-4 text-cyan-700" />}
              {isMenungguPersetujuan && <CheckCircle className="h-4 w-4 text-amber-700" />}
              {isDiajukan && <Info className="h-4 w-4 text-blue-700" />}
              <span className="font-semibold text-sm">
                {isPengajuan && 'Bengkel telah mengirimkan pengajuan item service'}
                {isMenungguPersetujuan && 'Bengkel menandai service telah selesai'}
                {isDiajukan && 'Service baru diajukan'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPengajuan && 'Silakan periksa item dan biaya yang diajukan bengkel sebelum menyetujui.'}
              {isMenungguPersetujuan && 'Silakan periksa hasil pekerjaan sebelum menyetujui penyelesaian.'}
              {isDiajukan && 'Silakan periksa detail service sebelum menyetujui.'}
            </p>
          </div>

          {/* Service info */}
          <div className="rounded-lg border p-3 text-sm space-y-1">
            <p><strong>Bengkel:</strong> {service.bengkel?.namaBengkel}</p>
            <p><strong>Jenis:</strong> {service.jenisService} • <strong>Prioritas:</strong> {service.prioritas}</p>
            <p><strong>Total Biaya:</strong> {formatRupiah(service.totalBiaya)}</p>
            {service.keterangan && <p><strong>Keterangan:</strong> {service.keterangan}</p>}
          </div>

          {/* Items table for PENGAJUAN */}
          {(isPengajuan || isMenungguPersetujuan) && service.items && service.items.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs text-center">Qty</TableHead>
                    <TableHead className="text-xs text-right">Harga Satuan</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {service.items.map((item: ServiceItem) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {item.itemName}
                        {item.keterangan && <p className="text-xs text-muted-foreground">{item.keterangan}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right">{formatRupiah(item.hargaSatuan)}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{formatRupiah(item.totalHarga)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t p-3 bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-semibold">Total Biaya</span>
                <span className="text-lg font-bold">{formatRupiah(service.totalBiaya)}</span>
              </div>
            </div>
          )}

          {/* Catatan Bengkel */}
          {service.catatanBengkel && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Catatan Bengkel:</p>
              <p>{service.catatanBengkel}</p>
            </div>
          )}

          {/* Reject reason */}
          <div>
            <Label className="text-sm font-medium">Alasan Penolakan (wajib diisi jika menolak)</Label>
            <Textarea
              placeholder="Masukkan alasan penolakan..."
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="destructive"
            onClick={() => {
              if (!rejectReason.trim()) {
                toast({ title: 'Peringatan', description: 'Alasan penolakan wajib diisi', variant: 'destructive' })
                return
              }
              onReject(rejectReason)
            }}
            disabled={isSubmitting}
          >
            <XCircle className="h-4 w-4 mr-1" /> Tolak
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={onApprove}
            disabled={isSubmitting}
          >
            <CheckCircle className="h-4 w-4 mr-1" /> Setujui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ========== Service Form Dialog (Admin creates/edits) ==========
interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingService: Service | null
  vehicles: { id: string; nomorPolisi: string; namaPengguna: string; merk: string; type: string; kilometerTerakhir: number }[]
  workshops: { id: string; namaBengkel: string }[]
  onSubmit: (data: ServiceFormData) => void
  isSubmitting: boolean
}

const serviceItemSchema = z.object({
  itemName: z.string().min(1, 'Nama item wajib diisi'),
  quantity: z.coerce.number().min(1, 'Qty min 1'),
  hargaSatuan: z.coerce.number().min(0, 'Harga min 0'),
  keterangan: z.string().optional().default(''),
})

const serviceFormSchema = z.object({
  tanggalService: z.string().min(1, 'Tanggal wajib diisi'),
  vehicleId: z.string().min(1, 'Kendaraan wajib dipilih'),
  bengkelId: z.string().min(1, 'Bengkel wajib dipilih'),
  jenisService: z.enum(['RUTIN', 'PERBAIKAN', 'DARURAT']),
  prioritas: z.enum(['RENDAH', 'NORMAL', 'TINGGI', 'DARURAT']),
  keterangan: z.string().optional().default(''),
  kilometerService: z.coerce.number().min(0).default(0),
  estimasiBiaya: z.coerce.number().min(0).default(0),
  estimasiLamaPerbaikan: z.coerce.number().min(0).optional().default(0),
  items: z.array(serviceItemSchema).optional().default([]),
})

function ServiceFormDialog({ open, onOpenChange, editingService, vehicles, workshops, onSubmit, isSubmitting }: ServiceFormDialogProps) {
  const [budgetValidation, setBudgetValidation] = useState<BudgetValidation | null>(null)
  const [isValidatingBudget, setIsValidatingBudget] = useState(false)
  const [vehicleSearch, setVehicleSearch] = useState('')

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema) as never,
    defaultValues: {
      tanggalService: new Date().toISOString().split('T')[0],
      vehicleId: '',
      bengkelId: '',
      jenisService: 'RUTIN',
      prioritas: 'NORMAL',
      keterangan: '',
      kilometerService: 0,
      estimasiBiaya: 0,
      estimasiLamaPerbaikan: 0,
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  const watchedVehicleId = form.watch('vehicleId')
  const watchedItems = form.watch('items')

  // Calculate total from items
  const totalBiaya = useMemo(() => {
    return (watchedItems || []).reduce(
      (sum, item) => sum + ((item.quantity || 0) * (item.hargaSatuan || 0)),
      0
    )
  }, [watchedItems])

  // Populate form when editing
  useEffect(() => {
    if (editingService) {
      form.reset({
        tanggalService: editingService.tanggalService
          ? new Date(editingService.tanggalService).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        vehicleId: editingService.vehicleId,
        bengkelId: editingService.bengkelId,
        jenisService: editingService.jenisService as JenisService,
        prioritas: editingService.prioritas as Prioritas,
        keterangan: editingService.keterangan || '',
        kilometerService: editingService.kilometerService || 0,
        estimasiBiaya: editingService.estimasiBiaya || 0,
        estimasiLamaPerbaikan: editingService.estimasiLamaPerbaikan || 0,
        items:
          editingService.items && editingService.items.length > 0
            ? editingService.items.map((item) => ({
                itemName: item.itemName,
                quantity: item.quantity,
                hargaSatuan: item.hargaSatuan,
                keterangan: item.keterangan || '',
              }))
            : [],
      })
    } else {
      form.reset({
        tanggalService: new Date().toISOString().split('T')[0],
        vehicleId: '',
        bengkelId: '',
        jenisService: 'RUTIN',
        prioritas: 'NORMAL',
        keterangan: '',
        kilometerService: 0,
        estimasiBiaya: 0,
        estimasiLamaPerbaikan: 0,
        items: [],
      })
      setBudgetValidation(null)
    }
  }, [editingService, form])

  // Budget validation (debounced)
  useEffect(() => {
    if (!watchedVehicleId || totalBiaya <= 0) {
      if (!watchedVehicleId) setBudgetValidation(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsValidatingBudget(true)
      try {
        const res = await fetch('/api/anggaran/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleId: watchedVehicleId, biaya: totalBiaya, serviceId: editingService?.id }),
        })
        if (res.ok) {
          const result = await res.json()
          setBudgetValidation(result.data)
        }
      } catch {
        setBudgetValidation(null)
      } finally {
        setIsValidatingBudget(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedVehicleId, totalBiaya, editingService?.id])

  // Update vehicle kilometer when vehicle is selected
  useEffect(() => {
    if (watchedVehicleId) {
      const vehicle = vehicles.find((v) => v.id === watchedVehicleId)
      if (vehicle && !editingService) {
        form.setValue('kilometerService', vehicle.kilometerTerakhir)
      }
    }
  }, [watchedVehicleId, vehicles, editingService, form])

  const handleFormSubmit = (data: ServiceFormData) => {
    const processedItems = (data.items || []).map((item) => ({
      ...item,
      totalHarga: item.quantity * item.hargaSatuan,
    }))
    onSubmit({ ...data, items: processedItems, estimasiBiaya: totalBiaya })
  }

  const addItem = () => {
    append({ itemName: '', quantity: 1, hargaSatuan: 0, keterangan: '' })
  }

  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch) return vehicles
    const s = vehicleSearch.toLowerCase()
    return vehicles.filter(
      (v) => v.nomorPolisi.toLowerCase().includes(s) || v.namaPengguna.toLowerCase().includes(s) || v.merk.toLowerCase().includes(s)
    )
  }, [vehicles, vehicleSearch])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingService ? 'Edit Service' : 'Tambah Service Baru'}</DialogTitle>
          <DialogDescription>
            {editingService ? `Edit service ${editingService.nomorService}` : 'Isi form berikut untuk menambahkan service baru'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Informasi Dasar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Tanggal Service *</Label>
                <Input type="date" className="mt-1" {...form.register('tanggalService')} />
                {form.formState.errors.tanggalService && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.tanggalService.message}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Kendaraan *</Label>
                <Select value={form.watch('vehicleId')} onValueChange={(v) => form.setValue('vehicleId', v)}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Pilih Kendaraan" /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input placeholder="Cari nopol..." value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <ScrollArea className="max-h-48">
                      {filteredVehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.nomorPolisi} - {v.merk} {v.type}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
                {form.formState.errors.vehicleId && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.vehicleId.message}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Bengkel *</Label>
                <Select value={form.watch('bengkelId')} onValueChange={(v) => form.setValue('bengkelId', v)}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Pilih Bengkel" /></SelectTrigger>
                  <SelectContent>
                    {workshops.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.namaBengkel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.bengkelId && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.bengkelId.message}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Jenis Service *</Label>
                <Select value={form.watch('jenisService')} onValueChange={(v) => form.setValue('jenisService', v as JenisService)}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JENIS_SERVICE_OPTIONS.map((j) => (<SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Prioritas</Label>
                <Select value={form.watch('prioritas')} onValueChange={(v) => form.setValue('prioritas', v as Prioritas)}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITAS_OPTIONS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Kilometer Saat Service</Label>
                <Input type="number" className="mt-1" {...form.register('kilometerService', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-sm">Estimasi Lama Perbaikan (Hari)</Label>
                <Input type="number" className="mt-1" {...form.register('estimasiLamaPerbaikan', { valueAsNumber: true })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm">Keterangan</Label>
                <Textarea className="mt-1" placeholder="Keterangan tambahan..." {...form.register('keterangan')} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Spreadsheet-Style Items Section (optional for admin) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Item Service <span className="text-xs font-normal">(Opsional)</span>
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-3 w-3" /> Tambah Item
              </Button>
            </div>

            {fields.length > 0 ? (
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs w-8">#</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs min-w-[200px]">Nama Item *</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs w-20">Qty *</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-36">Harga Satuan *</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-36">Total</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs min-w-[150px]">Keterangan</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const qty = form.watch(`items.${index}.quantity`) || 0
                      const harga = form.watch(`items.${index}.hargaSatuan`) || 0
                      const rowTotal = qty * harga

                      return (
                        <tr key={field.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-1.5 text-muted-foreground text-xs">{index + 1}</td>
                          <td className="px-1 py-1.5">
                            <Input
                              placeholder="Nama item/suku cadang"
                              className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent"
                              {...form.register(`items.${index}.itemName`)}
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <Input
                              type="number" min={1}
                              className="h-8 text-sm text-center border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent w-full"
                              {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <Input
                              type="number" min={0}
                              className="h-8 text-sm text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent"
                              {...form.register(`items.${index}.hargaSatuan`, { valueAsNumber: true })}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium text-sm">{formatRupiah(rowTotal)}</td>
                          <td className="px-1 py-1.5">
                            <Input
                              placeholder="Catatan"
                              className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent"
                              {...form.register(`items.${index}.keterangan`)}
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(index)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 border-t">
                      <td colSpan={4} className="px-3 py-2 text-right font-semibold text-sm">Total Biaya:</td>
                      <td className="px-3 py-2 text-right font-bold text-sm text-primary">{formatRupiah(totalBiaya)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada item. Item bisa ditambahkan nanti oleh bengkel.</p>
                <Button type="button" variant="outline" size="sm" className="mt-2 gap-1" onClick={addItem}>
                  <Plus className="h-3 w-3" /> Tambah Item
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Budget Validation Panel */}
          {watchedVehicleId && totalBiaya > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Validasi Anggaran
              </h3>

              {isValidatingBudget ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Memvalidasi anggaran...
                </div>
              ) : budgetValidation ? (
                <>
                  {(budgetValidation.level === 'CRITICAL' || budgetValidation.level === 'ERROR') && (
                    <div className={cn('rounded-lg border-2 p-4 flex items-start gap-3', BUDGET_LEVEL_COLORS[budgetValidation.level])}>
                      {BUDGET_LEVEL_ICONS[budgetValidation.level]}
                      <div>
                        <p className="font-semibold text-sm">
                          {budgetValidation.level === 'CRITICAL' ? 'PERINGATAN KRITIS!' : 'ANGGARAN TIDAK MENCUKUPI!'}
                        </p>
                        <p className="text-sm mt-1">{budgetValidation.message}</p>
                      </div>
                    </div>
                  )}

                  <div className={cn(
                    'rounded-lg border p-4',
                    budgetValidation.level === 'INFO' && 'border-blue-200 bg-blue-50/50',
                    budgetValidation.level === 'WARNING' && 'border-yellow-200 bg-yellow-50/50',
                    budgetValidation.level === 'CRITICAL' && 'border-fuchsia-200 bg-fuchsia-50/30',
                    budgetValidation.level === 'ERROR' && 'border-red-200 bg-red-50/30',
                  )}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Anggaran Total</span>
                        <p className="font-semibold">{formatRupiah(budgetValidation.anggaranTotal)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Terpakai</span>
                        <p className="font-semibold">{formatRupiah(budgetValidation.anggaranTerpakai)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Prediksi Setelah Service</span>
                        <p className="font-semibold">{formatRupiah(budgetValidation.prediksiSetelahService)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Sisa Anggaran</span>
                        <p className={cn('font-semibold', budgetValidation.sisaAnggaran < 0 ? 'text-red-600' : 'text-green-600')}>
                          {formatRupiah(budgetValidation.sisaAnggaran)}
                        </p>
                      </div>
                    </div>

                    {budgetValidation.kekuranganDana > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-xs text-destructive font-medium">
                          Kekurangan Dana: {formatRupiah(budgetValidation.kekuranganDana)}
                        </span>
                      </div>
                    )}

                    {budgetValidation.anggaranTotal > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Penggunaan Anggaran</span>
                          <span className="font-medium">{((budgetValidation.prediksiSetelahService / budgetValidation.anggaranTotal) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              budgetValidation.level === 'INFO' && 'bg-blue-500',
                              budgetValidation.level === 'WARNING' && 'bg-yellow-500',
                              budgetValidation.level === 'CRITICAL' && 'bg-fuchsia-500',
                              budgetValidation.level === 'ERROR' && 'bg-red-500',
                            )}
                            style={{ width: `${Math.min(100, (budgetValidation.prediksiSetelahService / budgetValidation.anggaranTotal) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Submit Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || (budgetValidation?.canSave === false)} className="gap-2">
              {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
              {editingService ? 'Update Service' : 'Simpan Service'}
            </Button>
          </DialogFooter>

          {budgetValidation?.canSave === false && (
            <p className="text-xs text-destructive text-right">Tidak dapat menyimpan - anggaran tidak mencukupi!</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ========== Progress Update Dialog (Admin) ==========
interface ProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  onSubmit: (data: { progress: number; statusService?: string; catatanBengkel?: string }) => void
  isSubmitting: boolean
}

function ProgressDialog({ open, onOpenChange, service, onSubmit, isSubmitting }: ProgressDialogProps) {
  const [progress, setProgress] = useState(service?.progress || 0)
  const [statusService, setStatusService] = useState<string>(service?.statusService === 'DISETUJUI' ? 'DIPROSES' : (service?.statusService || 'DIPROSES'))
  const [catatanBengkel, setCatatanBengkel] = useState(service?.catatanBengkel || '')

  const handleSave = () => {
    onSubmit({ progress, statusService, catatanBengkel })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
          <DialogDescription>Service {service?.nomorService} - {service?.vehicle?.nomorPolisi}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Progress: {progress}%</Label>
            <Slider value={[progress]} onValueChange={(v) => setProgress(v[0])} max={100} step={5} className="w-full" />
            <Progress value={progress} className="h-2" />
          </div>
          <div>
            <Label>Status Service</Label>
            <Select value={statusService} onValueChange={setStatusService}>
              <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DIPROSES">Diproses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Catatan</Label>
            <Textarea className="mt-1" placeholder="Catatan..." value={catatanBengkel} onChange={(e) => setCatatanBengkel(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
            {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ========== Bengkel Edit Dialog (DIAJUKAN/DITOLAK - add items & submit pengajuan) ==========
interface BengkelEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  onSubmit: (data: { items: ServiceItemForm[]; catatanBengkel?: string; submitPengajuan: boolean }) => void
  isSubmitting: boolean
}

function BengkelEditDialog({ open, onOpenChange, service, onSubmit, isSubmitting }: BengkelEditDialogProps) {
  const form = useForm<{
    items: ServiceItemForm[]
    catatanBengkel: string
  }>({
    defaultValues: {
      items: [],
      catatanBengkel: '',
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  const watchedItems = form.watch('items')

  // Calculate total
  const totalBiaya = useMemo(() => {
    return (watchedItems || []).reduce(
      (sum, item) => sum + ((item.quantity || 0) * (item.hargaSatuan || 0)),
      0
    )
  }, [watchedItems])

  // Populate form when service changes
  useEffect(() => {
    if (service) {
      form.reset({
        items: service.items && service.items.length > 0
          ? service.items.map((item) => ({
              itemName: item.itemName,
              quantity: item.quantity,
              hargaSatuan: item.hargaSatuan,
              keterangan: item.keterangan || '',
            }))
          : [{ itemName: '', quantity: 1, hargaSatuan: 0, keterangan: '' }],
        catatanBengkel: service.catatanBengkel || '',
      })
    } else {
      form.reset({
        items: [{ itemName: '', quantity: 1, hargaSatuan: 0, keterangan: '' }],
        catatanBengkel: '',
      })
    }
  }, [service, form])

  const addItem = () => {
    append({ itemName: '', quantity: 1, hargaSatuan: 0, keterangan: '' })
  }

  const handleKirimPengajuan = () => {
    // Validate that at least one item has a name
    const items = form.getValues('items')
    const validItems = items.filter((item) => item.itemName.trim() !== '')
    if (validItems.length === 0) {
      toast({ title: 'Peringatan', description: 'Minimal satu item service harus diisi', variant: 'destructive' })
      return
    }
    // Validate all items with names have valid qty and price
    const invalidItem = validItems.find((item) => item.quantity <= 0 || item.hargaSatuan < 0)
    if (invalidItem) {
      toast({ title: 'Peringatan', description: 'Pastikan semua item memiliki kuantitas dan harga yang valid', variant: 'destructive' })
      return
    }
    const catatanBengkel = form.getValues('catatanBengkel')
    onSubmit({ items: validItems, catatanBengkel, submitPengajuan: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Edit & Kirim Pengajuan
          </DialogTitle>
          <DialogDescription>
            Service {service?.nomorService} - {service?.vehicle?.nomorPolisi}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Service Info Summary */}
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <p><strong>Kendaraan:</strong> {service?.vehicle?.nomorPolisi} - {service?.vehicle?.merk} {service?.vehicle?.type}</p>
            <p><strong>Bengkel:</strong> {service?.bengkel?.namaBengkel}</p>
            <p><strong>Jenis:</strong> {service?.jenisService} • <strong>Prioritas:</strong> {service?.prioritas}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">Status saat ini:</span>
              <Badge className={cn('text-xs border', STATUS_COLORS[service?.statusService as StatusService])}>
                {STATUS_LABELS[service?.statusService as StatusService]}
              </Badge>
            </div>
            {service?.rejectedReason && (
              <div className="mt-2 rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-800">
                <strong>Alasan Ditolak:</strong> {service.rejectedReason}
              </div>
            )}
          </div>

          {/* Info about pengajuan */}
          <div className="rounded-lg border-2 border-cyan-300 bg-cyan-50 p-3 flex items-start gap-3">
            <Send className="h-5 w-5 text-cyan-700 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-cyan-800">Kirim Pengajuan ke Admin</p>
              <p className="text-xs text-cyan-700 mt-0.5">
                Tambahkan item service beserta harga, lalu klik &quot;Kirim Pengajuan&quot; untuk mengirimkan ke admin
                untuk mendapatkan persetujuan. Status akan berubah menjadi <Badge className="text-xs border bg-cyan-100 text-cyan-800 border-cyan-200">Pengajuan</Badge>.
              </p>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Item Service
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-3 w-3" /> Tambah Item
              </Button>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs min-w-[200px]">Nama Item *</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs w-20">Qty *</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-36">Harga Satuan *</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-36">Total</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs min-w-[150px]">Keterangan</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const qty = form.watch(`items.${index}.quantity`) || 0
                    const harga = form.watch(`items.${index}.hargaSatuan`) || 0
                    const rowTotal = qty * harga

                    return (
                      <tr key={field.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-1.5 text-muted-foreground text-xs">{index + 1}</td>
                        <td className="px-1 py-1.5">
                          <Input
                            placeholder="Nama item/suku cadang"
                            className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent"
                            {...form.register(`items.${index}.itemName`)}
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <Input
                            type="number" min={1}
                            className="h-8 text-sm text-center border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent w-full"
                            {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <Input
                            type="number" min={0}
                            className="h-8 text-sm text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent"
                            {...form.register(`items.${index}.hargaSatuan`, { valueAsNumber: true })}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-sm">{formatRupiah(rowTotal)}</td>
                        <td className="px-1 py-1.5">
                          <Input
                            placeholder="Catatan"
                            className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent"
                            {...form.register(`items.${index}.keterangan`)}
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(index)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 border-t">
                    <td colSpan={4} className="px-3 py-2 text-right font-semibold text-sm">Total Biaya:</td>
                    <td className="px-3 py-2 text-right font-bold text-sm text-primary">{formatRupiah(totalBiaya)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Catatan Bengkel */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Catatan Bengkel</Label>
            <Textarea
              className="mt-1"
              placeholder="Tambahkan catatan untuk admin, keterangan perbaikan, dll..."
              {...form.register('catatanBengkel')}
              rows={4}
            />
          </div>

          {/* Documents if any */}
          {service?.documents && service.documents.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dokumen yang sudah diupload</Label>
              <div className="space-y-1">
                {service.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{doc.fileName}</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">{doc.jenisDokumen}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={handleKirimPengajuan}
            disabled={isSubmitting}
            className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Kirim Pengajuan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ========== Bengkel Progress Dialog (DISETUJUI/DIPROSES - update progress / mark as selesai) ==========
interface BengkelProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  onSubmit: (data: { progress: number; catatanBengkel?: string; markAsSelesai?: boolean }) => void
  isSubmitting: boolean
}

function BengkelProgressDialog({ open, onOpenChange, service, onSubmit, isSubmitting }: BengkelProgressDialogProps) {
  const [progress, setProgress] = useState(service?.progress || 0)
  const [catatanBengkel, setCatatanBengkel] = useState(service?.catatanBengkel || '')
  const [markAsSelesai, setMarkAsSelesai] = useState(false)
  // Note: Component remounts via key prop when service changes, so initial values are correct

  const handleUpdateProgress = () => {
    onSubmit({ progress, catatanBengkel, markAsSelesai: false })
  }

  const handleTandaiSelesai = () => {
    onSubmit({ progress: 100, catatanBengkel, markAsSelesai: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Update Progress Service
          </DialogTitle>
          <DialogDescription>
            Service {service?.nomorService} - {service?.vehicle?.nomorPolisi}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          {/* Service Info Summary */}
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <p><strong>Kendaraan:</strong> {service?.vehicle?.nomorPolisi} - {service?.vehicle?.merk} {service?.vehicle?.type}</p>
            <p><strong>Bengkel:</strong> {service?.bengkel?.namaBengkel}</p>
            <p><strong>Jenis:</strong> {service?.jenisService} • <strong>Prioritas:</strong> {service?.prioritas}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={cn('text-xs border', STATUS_COLORS[service?.statusService as StatusService])}>
                {STATUS_LABELS[service?.statusService as StatusService]}
              </Badge>
            </div>
          </div>

          {/* Progress Slider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Progress: {markAsSelesai ? 100 : progress}%</Label>
            <Slider
              value={[markAsSelesai ? 100 : progress]}
              onValueChange={(v) => {
                if (!markAsSelesai) {
                  setProgress(v[0])
                }
              }}
              max={100}
              step={5}
              className="w-full"
              disabled={markAsSelesai}
            />
            <Progress value={markAsSelesai ? 100 : progress} className="h-2" />
          </div>

          {/* Catatan Bengkel */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Catatan Bengkel</Label>
            <Textarea
              className="mt-1"
              placeholder="Tambahkan catatan progress, keterangan perbaikan, dll..."
              value={catatanBengkel}
              onChange={(e) => setCatatanBengkel(e.target.value)}
              rows={4}
            />
          </div>

          {/* Mark as Selesai */}
          <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="bengkel-markAsSelesai"
                checked={markAsSelesai}
                onChange={(e) => {
                  setMarkAsSelesai(e.target.checked)
                  if (e.target.checked) setProgress(100)
                }}
                className="mt-1 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <Label htmlFor="bengkel-markAsSelesai" className="text-sm font-semibold text-amber-800 cursor-pointer">
                  Tandai Selesai & Ajukan Persetujuan
                </Label>
                <p className="text-xs text-amber-600 mt-0.5">
                  Service akan ditandai selesai dan diajukan untuk persetujuan admin. Progress otomatis diatur 100%.
                </p>
              </div>
            </div>
            {markAsSelesai && (
              <div className="rounded-md bg-amber-100 border border-amber-200 p-2.5 text-sm text-amber-800">
                <strong>Perhatian:</strong> Setelah ditandai selesai, status service akan berubah menjadi{' '}
                <Badge className="text-xs border bg-amber-100 text-amber-800 border-amber-200">Menunggu Persetujuan</Badge>{' '}
                dan menunggu persetujuan dari admin.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          {markAsSelesai ? (
            <Button
              onClick={handleTandaiSelesai}
              disabled={isSubmitting}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
              <CheckCircle className="h-4 w-4" />
              Tandai Selesai
            </Button>
          ) : (
            <Button onClick={handleUpdateProgress} disabled={isSubmitting} className="gap-2">
              {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
              Update Progress
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ServicePage
