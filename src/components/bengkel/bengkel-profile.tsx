'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Building2,
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  Plus,
  Phone,
  Mail,
  MapPin,
  User,
  CheckCircle,
  X,
  FileCheck,
  Shield,
  FileSignature,
  Briefcase,
  FileBarChart,
} from 'lucide-react'

import { useAuthStore } from '@/store/auth'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Workshop, WorkshopDocument } from '@/types'

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface BengkelProfileProps {
  isAdmin?: boolean
  bengkelId?: string
}

type JenisDokumenKey =
  | 'KTP'
  | 'NPWP'
  | 'NIB'
  | 'SPK'
  | 'IZIN_USAHA'
  | 'SURAT_KETERANGAN'
  | 'LAINNYA'

interface JenisDokumenOption {
  value: JenisDokumenKey
  label: string
  badgeClass: string
  icon: React.ReactNode
}

const JENIS_DOKUMEN_OPTIONS: JenisDokumenOption[] = [
  {
    value: 'KTP',
    label: 'KTP',
    badgeClass:
      'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
    icon: <FileCheck className="h-3.5 w-3.5" />,
  },
  {
    value: 'NPWP',
    label: 'NPWP',
    badgeClass:
      'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    icon: <FileBarChart className="h-3.5 w-3.5" />,
  },
  {
    value: 'NIB',
    label: 'NIB',
    badgeClass:
      'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100',
    icon: <Briefcase className="h-3.5 w-3.5" />,
  },
  {
    value: 'SPK',
    label: 'SPK',
    badgeClass:
      'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
    icon: <FileSignature className="h-3.5 w-3.5" />,
  },
  {
    value: 'IZIN_USAHA',
    label: 'Izin Usaha',
    badgeClass:
      'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100',
    icon: <Shield className="h-3.5 w-3.5" />,
  },
  {
    value: 'SURAT_KETERANGAN',
    label: 'Surat Keterangan',
    badgeClass:
      'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  {
    value: 'LAINNYA',
    label: 'Lainnya',
    badgeClass:
      'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
]

const JENIS_MAP = Object.fromEntries(
  JENIS_DOKUMEN_OPTIONS.map((o) => [o.value, o])
) as Record<string, JenisDokumenOption>

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_FILES = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFileTypeIcon(fileType?: string) {
  if (!fileType) return <FileText className="h-5 w-5 text-gray-400" />
  if (fileType.startsWith('image/'))
    return <ImageIcon className="h-5 w-5 text-emerald-500" />
  return <FileText className="h-5 w-5 text-red-500" />
}

function groupDocumentsByJenis(documents: WorkshopDocument[]) {
  const groups: Record<string, WorkshopDocument[]> = {}
  // Preserve ordering from JENIS_DOKUMEN_OPTIONS
  for (const opt of JENIS_DOKUMEN_OPTIONS) {
    groups[opt.value] = []
  }
  for (const doc of documents) {
    if (!groups[doc.jenisDokumen]) {
      groups[doc.jenisDokumen] = []
    }
    groups[doc.jenisDokumen].push(doc)
  }
  // Only return groups that have documents
  return Object.entries(groups).filter(([, docs]) => docs.length > 0)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  )
}

function DocumentCard({
  doc,
  onDelete,
  isDeleting,
  canDelete,
}: {
  doc: WorkshopDocument
  onDelete: (doc: WorkshopDocument) => void
  isDeleting: boolean
  canDelete: boolean
}) {
  const jenis = JENIS_MAP[doc.jenisDokumen]
  const isMobile = useIsMobile()

  return (
    <div className="group animate-fade-in flex items-start gap-2 sm:gap-3 rounded-xl border border-border/50 p-3 transition-all duration-200 hover:bg-muted/40 hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-sm card-hover">
      {/* File type icon */}
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
        {getFileTypeIcon(doc.fileType)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate max-w-[140px] sm:max-w-none">
            {doc.fileName}
          </p>
          {jenis && (
            <Badge className={cn('text-[10px] gap-1 shrink-0', jenis.badgeClass)}>
              {jenis.icon}
              {jenis.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
          <span>•</span>
          <span>{formatDateTime(doc.uploadedAt)}</span>
        </div>
        {doc.keterangan && (
          <p className="text-xs text-muted-foreground italic">
            {doc.keterangan}
          </p>
        )}
      </div>

      {/* Actions - always visible on mobile */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn("text-muted-foreground", isMobile ? "h-9 w-9" : "h-8 w-8")}
          title="Unduh"
          asChild
        >
          <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
          </a>
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hover:text-destructive",
              isMobile ? "h-9 w-9" : "h-8 w-8"
            )}
            title="Hapus"
            onClick={() => onDelete(doc)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

function UploadDropZone({
  onFilesSelected,
  isUploading,
}: {
  onFilesSelected: (files: File[]) => void
  isUploading: boolean
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      if (e.dataTransfer.files) {
        onFilesSelected(Array.from(e.dataTransfer.files))
      }
    },
    [onFilesSelected]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onFilesSelected(Array.from(e.target.files))
        e.target.value = ''
      }
    },
    [onFilesSelected]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 sm:p-6 transition-all duration-300 cursor-pointer',
        isDragOver
          ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20 scale-[1.01] shadow-lg shadow-teal-500/10'
          : 'border-muted-foreground/25 hover:border-teal-400/60 hover:bg-teal-50/30 dark:hover:bg-teal-900/10',
        isUploading && 'pointer-events-none opacity-50'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handleFileInput}
        className="hidden"
      />
      <div
        className={cn(
          'flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl mb-2 transition-all duration-300',
          isDragOver ? 'bg-teal-500/20 scale-110' : 'bg-muted/60'
        )}
      >
        <Upload
          className={cn(
            'h-6 w-6 transition-all duration-300',
            isDragOver ? 'text-teal-600 dark:text-teal-400 scale-110' : 'text-muted-foreground'
          )}
        />
      </div>
      <p className="text-sm font-medium text-center">
        {isDragOver ? 'Lepaskan file di sini' : 'Seret & lepas file, atau klik untuk memilih'}
      </p>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        JPG, PNG, atau PDF (maks. 5 MB per file, maks. {MAX_FILES} file)
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function BengkelProfile({ isAdmin = false, bengkelId: propBengkelId }: BengkelProfileProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isMobile = useIsMobile()

  // Determine the workshop ID
  const workshopId = propBengkelId || user?.bengkelId || ''

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const {
    data: workshop,
    isLoading: isLoadingWorkshop,
    isError: isWorkshopError,
  } = useQuery<Workshop & { stats?: Record<string, unknown> }>({
    queryKey: ['bengkel-profile', workshopId],
    queryFn: async () => {
      const res = await fetch(`/api/bengkel/${workshopId}`)
      if (!res.ok) throw new Error('Gagal mengambil data bengkel')
      return res.json()
    },
    enabled: !!workshopId,
  })

  const {
    data: documentsData,
    isLoading: isLoadingDocs,
  } = useQuery<{ data: WorkshopDocument[] }>({
    queryKey: ['bengkel-documents', workshopId],
    queryFn: async () => {
      const res = await fetch(`/api/bengkel/${workshopId}/documents`)
      if (!res.ok) throw new Error('Gagal mengambil dokumen')
      return res.json()
    },
    enabled: !!workshopId,
  })

  const documents = documentsData?.data || []
  const groupedDocs = useMemo(() => groupDocumentsByJenis(documents), [documents])

  // -------------------------------------------------------------------------
  // Upload state
  // -------------------------------------------------------------------------

  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; id: string; preview?: string }[]
  >([])
  const [jenisDokumen, setJenisDokumen] = useState<JenisDokumenKey>('KTP')
  const [keterangan, setKeterangan] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<WorkshopDocument | null>(null)

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      selectedFiles.forEach((f) => formData.append('files', f.file))
      formData.append('jenisDokumen', jenisDokumen)
      if (keterangan.trim()) formData.append('keterangan', keterangan.trim())
      if (user?.id) formData.append('uploadedBy', user.id)

      const res = await fetch(`/api/bengkel/${workshopId}/documents`, {
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
      queryClient.invalidateQueries({ queryKey: ['bengkel-documents', workshopId] })
      queryClient.invalidateQueries({ queryKey: ['bengkel-profile', workshopId] })
      resetUploadState()
      setUploadOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(
        `/api/bengkel/${workshopId}/documents/${docId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus dokumen')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Dokumen berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['bengkel-documents', workshopId] })
      queryClient.invalidateQueries({ queryKey: ['bengkel-profile', workshopId] })
      setDeleteTarget(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setDeleteTarget(null)
    },
  })

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function resetUploadState() {
    selectedFiles.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview)
    })
    setSelectedFiles([])
    setJenisDokumen('KTP')
    setKeterangan('')
    setFileError(null)
  }

  const handleFilesSelected = useCallback((files: File[]) => {
    setFileError(null)
    const valid: { file: File; id: string; preview?: string }[] = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError(
          `File "${file.name}" tidak didukung. Gunakan JPG, PNG, atau PDF.`
        )
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" melebihi batas 5 MB.`)
        continue
      }
      valid.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        preview: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
      })
    }

    const combined = [...selectedFiles, ...valid]
    if (combined.length > MAX_FILES) {
      setFileError(`Maksimal ${MAX_FILES} file per upload.`)
      setSelectedFiles(combined.slice(0, MAX_FILES))
    } else {
      setSelectedFiles(combined)
    }
  }, [selectedFiles])

  function removeFile(id: string) {
    setSelectedFiles((prev) => {
      const f = prev.find((p) => p.id === id)
      if (f?.preview) URL.revokeObjectURL(f.preview)
      return prev.filter((p) => p.id !== id)
    })
    setFileError(null)
  }

  function handleUpload() {
    if (selectedFiles.length === 0) {
      toast.error('Pilih file terlebih dahulu')
      return
    }
    uploadMutation.mutate()
  }

  function handleDeleteClick(doc: WorkshopDocument) {
    setDeleteTarget(doc)
  }

  function confirmDelete() {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id)
    }
  }

  const totalUploadSize = selectedFiles.reduce(
    (sum, f) => sum + f.file.size,
    0
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!workshopId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Bengkel tidak ditemukan</p>
        <p className="text-sm">Akun Anda belum terhubung dengan bengkel manapun</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Workshop Info Card                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Card className="animate-slide-up overflow-hidden border border-border/50 shadow-sm rounded-2xl">
        {/* Gradient Header - responsive: stack icon+name on very small screens */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 sm:px-6 py-4 sm:py-5 text-white">
          <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3">
            <div className="flex items-center gap-3 w-full xs:w-auto">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shrink-0">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  {workshop?.namaBengkel || 'Memuat...'}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {workshop?.statusAktif ? (
                    <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20 gap-1 text-[10px]">
                      <CheckCircle className="h-3 w-3" />
                      Aktif
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/20 text-[10px]">
                      Nonaktif
                    </Badge>
                  )}
                  {isAdmin && (
                    <Badge className="bg-sky-500/20 text-sky-200 border-sky-500/30 hover:bg-sky-500/20 gap-1 text-[10px]">
                      <Shield className="h-3 w-3" />
                      Admin View
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6">
          {isLoadingWorkshop ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : isWorkshopError ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>Gagal memuat informasi bengkel</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ['bengkel-profile', workshopId],
                  })
                }
              >
                Coba Lagi
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Alamat"
                value={workshop?.alamat}
              />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="No. Telepon"
                value={workshop?.noTelepon}
              />
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="PIC Bengkel"
                value={workshop?.picBengkel}
              />
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={workshop?.email}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Documents Section                                                  */}
      {/* ----------------------------------------------------------------- */}
      <Card className="animate-slide-up animate-stagger-2 border border-border/50 shadow-sm rounded-2xl">
        <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/30 dark:to-emerald-950/20 rounded-t-2xl border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <FileText className="h-5 w-5" />
              Dokumen Bengkel
              {documents.length > 0 && (
                <Badge variant="secondary" className="text-[10px] rounded-lg">
                  {documents.length} file
                </Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              className="gap-2 min-h-[44px] w-full sm:w-auto rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20"
              onClick={() => {
                resetUploadState()
                setUploadOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Upload Dokumen
            </Button>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4 px-4 sm:px-6 pb-4 sm:pb-6">
          {isLoadingDocs ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Belum ada dokumen</p>
              <p className="text-xs mt-1 text-center px-4">
                Upload dokumen seperti KTP, NPWP, NIB, atau dokumen penting lainnya
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2 min-h-[44px]"
                onClick={() => {
                  resetUploadState()
                  setUploadOpen(true)
                }}
              >
                <Upload className="h-4 w-4" />
                Upload Sekarang
              </Button>
            </div>
          ) : (
            <ScrollArea className={cn(isMobile ? "max-h-[60vh]" : "max-h-[600px]")}>
              <div className="space-y-6 pr-2 sm:pr-3">
                {groupedDocs.map(([jenis, docs]) => {
                  const jenisOpt = JENIS_MAP[jenis]
                  return (
                    <div key={jenis}>
                      {/* Group header */}
                      <div className="flex items-center gap-2 mb-3">
                        {jenisOpt ? (
                          <Badge
                            className={cn(
                              'gap-1 text-xs',
                              jenisOpt.badgeClass
                            )}
                          >
                            {jenisOpt.icon}
                            {jenisOpt.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {jenis}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {docs.length} file
                        </span>
                      </div>

                      {/* Document cards */}
                      <div className="space-y-2">
                        {docs.map((doc) => (
                          <DocumentCard
                            key={doc.id}
                            doc={doc}
                            onDelete={handleDeleteClick}
                            isDeleting={
                              deleteMutation.isPending &&
                              deleteTarget?.id === doc.id
                            }
                            canDelete={!isAdmin || true}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Upload Dialog                                                      */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!open) resetUploadState()
          setUploadOpen(open)
        }}
      >
        <DialogContent className={cn(
          "max-h-[90vh] overflow-y-auto",
          isMobile ? "w-full max-w-none" : "sm:max-w-lg"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Dokumen
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Jenis Dokumen */}
            <div className="space-y-2">
              <Label htmlFor="jenis-dokumen" className="text-sm font-medium">
                Jenis Dokumen *
              </Label>
              <Select
                value={jenisDokumen}
                onValueChange={(v) => setJenisDokumen(v as JenisDokumenKey)}
              >
                <SelectTrigger id="jenis-dokumen" className="w-full min-h-[44px]">
                  <SelectValue placeholder="Pilih jenis dokumen" />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_DOKUMEN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {opt.icon}
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Keterangan */}
            <div className="space-y-2">
              <Label htmlFor="keterangan" className="text-sm font-medium">
                Keterangan <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                id="keterangan"
                placeholder="Contoh: Dokumen perpanjangan tahun 2024"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <Separator />

            {/* Drop zone */}
            <UploadDropZone
              onFilesSelected={handleFilesSelected}
              isUploading={uploadMutation.isPending}
            />

            {/* File error */}
            {fileError && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <X className="h-4 w-4 shrink-0" />
                {fileError}
              </div>
            )}

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {selectedFiles.length} file dipilih
                  </span>
                  <span className="text-muted-foreground">
                    Total: {formatFileSize(totalUploadSize)}
                  </span>
                </div>
                <div className="space-y-2 max-h-40 sm:max-h-52 overflow-y-auto pr-1">
                  {selectedFiles.map((fp) => (
                    <div
                      key={fp.id}
                      className="flex items-center gap-2 sm:gap-3 rounded-lg border p-2 sm:p-2.5 bg-background"
                    >
                      {/* Thumbnail / icon */}
                      <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {fp.preview ? (
                          <img
                            src={fp.preview}
                            alt={fp.file.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getFileTypeIcon(fp.file.type)
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {fp.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fp.file.size)} •{' '}
                          {fp.file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                        </p>
                      </div>
                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive min-w-[36px] min-h-[36px]"
                        onClick={() => removeFile(fp.id)}
                        disabled={uploadMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetUploadState()
                setUploadOpen(false)
              }}
              disabled={uploadMutation.isPending}
              className="min-h-[44px]"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={
                uploadMutation.isPending ||
                selectedFiles.length === 0
              }
              className="gap-2 min-h-[44px]"
            >
              {uploadMutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Delete Confirmation Dialog                                         */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className={cn(
          "max-h-[90vh]",
          isMobile ? "w-full max-w-none" : "sm:max-w-md"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Hapus Dokumen
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Apakah Anda yakin ingin menghapus dokumen{' '}
            <span className="font-semibold text-foreground">
              {deleteTarget?.fileName}
            </span>
            ? Tindakan ini tidak dapat dibatalkan.
          </p>
          {deleteTarget?.keterangan && (
            <p className="text-xs text-muted-foreground italic">
              Keterangan: {deleteTarget.keterangan}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
              className="min-h-[44px]"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="gap-2 min-h-[44px]"
            >
              {deleteMutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
