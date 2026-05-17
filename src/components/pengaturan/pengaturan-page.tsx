'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Settings, Building2, Mail, Users, FileText, Database, Calendar, Save, Plus, Trash2, Edit, Download, Upload, Shield, Clock, User, Image as ImageIcon, Globe, Palette, Stamp, PenLine, MessageSquare, Zap, FileDown, TrendingDown, BarChart3, CheckCircle, Camera, HardDrive, FileArchive, Paperclip, ImagePlus, PenTool, Printer, MapPin, Hash, FileSignature, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { ESignatureDialog } from '@/components/shared/e-signature-dialog'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  BENGKEL: 'Bengkel',
  PIMPINAN: 'Pimpinan',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: 'Akses penuh ke seluruh sistem',
  ADMIN: 'Mengelola service, kendaraan, dan laporan',
  BENGKEL: 'Mengelola progress service di bengkel',
  PIMPINAN: 'Melihat laporan dan menyetujui service',
}

export function PengaturanPage() {
  const queryClient = useQueryClient()
  const { user: authUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('umum')
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'ADMIN', bengkelId: '', isActive: true })
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)

  // Refs for file inputs
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const tteInputRef = useRef<HTMLInputElement>(null)
  const printLogoInputRef = useRef<HTMLInputElement>(null)

  // Cache-busting timestamp for logo/favicon/tte/print-logo
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now())
  const [faviconTimestamp, setFaviconTimestamp] = useState(Date.now())
  const [tteTimestamp, setTteTimestamp] = useState(Date.now())
  const [printLogoTimestamp, setPrintLogoTimestamp] = useState(Date.now())

  // Fetch settings
  const { data: settings = {}, isLoading: loadingSettings } = useQuery({
    queryKey: ['pengaturan'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan')
      return res.json()
    },
  })

  // Fetch users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['pengaturan-users'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan/users')
      return res.json()
    },
  })

  // Fetch workshops for user form
  const { data: workshopsRaw } = useQuery({
    queryKey: ['workshops-pengaturan'],
    queryFn: async () => {
      const res = await fetch('/api/bengkel?limit=100')
      return res.json()
    },
  })
  const workshops = Array.isArray(workshopsRaw?.data) ? workshopsRaw.data : Array.isArray(workshopsRaw) ? workshopsRaw : []

  // Fetch audit logs
  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan/audit-logs')
      return res.json()
    },
  })

  // Fetch backup info
  const { data: backupInfo, isLoading: loadingBackup } = useQuery({
    queryKey: ['backup-info'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan/backup')
      return res.json()
    },
  })

  // Fetch current user's signature
  const { data: signatureData, isLoading: loadingSignature } = useQuery({
    queryKey: ['user-signature', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return { signature: null }
      const res = await fetch(`/api/signature?userId=${authUser.id}`)
      return res.json()
    },
    enabled: !!authUser?.id,
  })
  const currentSignature = signatureData?.signature || null

  // Delete signature mutation
  const deleteSignature = useMutation({
    mutationFn: async (signatureId: string) => {
      const res = await fetch(`/api/signature/${signatureId}?userId=${authUser?.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus tanda tangan')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-signature', authUser?.id] })
      toast.success('Tanda tangan berhasil dihapus')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Record<string, string>) => {
      const res = await fetch('/api/pengaturan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
      queryClient.invalidateQueries({ queryKey: ['app-settings-sidebar'] })
      toast.success('Pengaturan berhasil disimpan')
    },
    onError: () => {
      toast.error('Gagal menyimpan pengaturan')
    },
  })

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/pengaturan/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat user')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-users'] })
      toast.success('User berhasil ditambahkan')
      setUserDialogOpen(false)
      setEditingUser(null)
      setUserForm({ name: '', email: '', password: '', role: 'ADMIN', bengkelId: '', isActive: true })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/pengaturan/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengupdate user')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-users'] })
      toast.success('User berhasil diperbarui')
      setUserDialogOpen(false)
      setEditingUser(null)
      setUserForm({ name: '', email: '', password: '', role: 'ADMIN', bengkelId: '', isActive: true })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Delete user mutation (toggles isActive)
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/pengaturan/users?id=${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus user')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-users'] })
      toast.success(data.isActive ? 'User berhasil diaktifkan kembali' : 'User berhasil dinonaktifkan')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Handle opening edit dialog
  const handleEditUser = (user: any) => {
    setEditingUser(user)
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'ADMIN',
      bengkelId: user.bengkelId || '',
      isActive: user.isActive !== undefined ? user.isActive : true,
    })
    setUserDialogOpen(true)
  }

  // Handle form submit
  const handleUserFormSubmit = () => {
    if (editingUser) {
      // Update existing user
      const updateData: any = {
        id: editingUser.id,
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        isActive: userForm.isActive,
      }
      if (userForm.role === 'BENGKEL') {
        updateData.bengkelId = userForm.bengkelId || null
      }
      // Only send password if provided
      if (userForm.password) {
        updateData.password = userForm.password
      }
      updateUser.mutate(updateData)
    } else {
      // Create new user
      createUser.mutate(userForm)
    }
  }

  // Backup mutation
  const handleBackup = async () => {
    try {
      toast.loading('Membuat backup...', { id: 'backup' })
      const res = await fetch('/api/pengaturan/backup', { method: 'POST' })
      if (!res.ok) throw new Error('Backup failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisp = res.headers.get('Content-Disposition')
      a.download = contentDisp ? contentDisp.split('filename=')[1]?.replace(/"/g, '') : 'bkad-backup.db'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Backup berhasil diunduh', { id: 'backup' })
      queryClient.invalidateQueries({ queryKey: ['backup-info'] })
    } catch {
      toast.error('Gagal membuat backup', { id: 'backup' })
    }
  }

  // Restore state
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleRestore = async () => {
    if (!restoreFile) return
    try {
      setIsRestoring(true)
      toast.loading('Memulihkan database...', { id: 'restore' })
      const formData = new FormData()
      formData.append('file', restoreFile)
      const res = await fetch('/api/pengaturan/backup', {
        method: 'PUT',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memulihkan database')
      toast.success('Database berhasil dipulihkan! Halaman akan dimuat ulang...', { id: 'restore', duration: 3000 })
      setRestoreFile(null)
      // Reload after a short delay to let the DB reconnect
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      toast.error(err.message || 'Gagal memulihkan database', { id: 'restore' })
    } finally {
      setIsRestoring(false)
    }
  }

  // Test notification states
  const [testingWA, setTestingWA] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  // Compression states
  const [testingCompress, setTestingCompress] = useState(false)
  const [compressTestFile, setCompressTestFile] = useState<File | null>(null)
  const [compressResult, setCompressResult] = useState<any>(null)
  const [compressSettings, setCompressSettings] = useState({
    enabled: true, quality: 80, maxWidth: 1920, maxHeight: 1080,
    format: 'original' as string, compressPhotos: true, compressDocuments: true, compressLogo: true,
  })
  const compressLoadedRef = useRef(false)
  const [compressStats, setCompressStats] = useState({ totalSaved: 0, totalFiles: 0 })

  // Storage stats state
  const [storageStats, setStorageStats] = useState<{
    serviceDocs: { count: number; totalSize: number }
    servicePhotos: { count: number; totalSize: number }
    workshopDocs: { count: number; totalSize: number }
    vehicleDocs: { count: number; totalSize: number }
    blobFiles: { count: number; totalSize: number }
    total: { count: number; totalSize: number }
  } | null>(null)
  const storageLoadedRef = useRef(false)

  // Document Numbering states
  const [docNumDialogOpen, setDocNumDialogOpen] = useState(false)
  const [editingDocNum, setEditingDocNum] = useState<any>(null)
  const [docNumForm, setDocNumForm] = useState({ code: '', name: '', prefix: 'BKAD', digitCount: 3, isActive: true })

  // Fetch document numberings
  const { data: docNumberings = [], isLoading: loadingDocNums } = useQuery({
    queryKey: ['document-numberings'],
    queryFn: async () => {
      const res = await fetch('/api/document-numbering')
      return res.json()
    },
  })

  // Create document numbering mutation
  const createDocNum = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/document-numbering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat penomoran surat')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-numberings'] })
      toast.success('Jenis surat berhasil ditambahkan')
      setDocNumDialogOpen(false)
      setEditingDocNum(null)
      setDocNumForm({ code: '', name: '', prefix: 'BKAD', digitCount: 3, isActive: true })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Update document numbering mutation
  const updateDocNum = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/document-numbering', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengupdate penomoran surat')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-numberings'] })
      toast.success('Jenis surat berhasil diperbarui')
      setDocNumDialogOpen(false)
      setEditingDocNum(null)
      setDocNumForm({ code: '', name: '', prefix: 'BKAD', digitCount: 3, isActive: true })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Delete document numbering mutation
  const deleteDocNum = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/document-numbering?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus penomoran surat')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-numberings'] })
      toast.success('Jenis surat berhasil dihapus')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Reset document numbering counter
  const resetDocNum = useMutation({
    mutationFn: async ({ id, currentNumber }: { id: string; currentNumber: number }) => {
      const res = await fetch('/api/document-numbering', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, currentNumber }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal reset counter')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-numberings'] })
      toast.success('Counter berhasil direset')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleEditDocNum = (doc: any) => {
    setEditingDocNum(doc)
    setDocNumForm({
      code: doc.code || '',
      name: doc.name || '',
      prefix: doc.prefix || 'BKAD',
      digitCount: doc.digitCount || 3,
      isActive: doc.isActive !== false,
    })
    setDocNumDialogOpen(true)
  }

  const handleDocNumFormSubmit = () => {
    if (editingDocNum) {
      updateDocNum.mutate({ id: editingDocNum.id, ...docNumForm })
    } else {
      createDocNum.mutate(docNumForm)
    }
  }

  const handleTestWhatsApp = async () => {
    if (!localSettings.fonnte_api_key) {
      toast.error('API Key Fonnte belum diisi')
      return
    }
    if (!localSettings.fonnte_admin_phone) {
      toast.error('Nomor Admin belum diisi')
      return
    }
    try {
      setTestingWA(true)
      const res = await fetch('/api/pengaturan/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'whatsapp', testTarget: localSettings.fonnte_admin_phone }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Gagal mengirim test WhatsApp')
      }
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setTestingWA(false)
    }
  }

  const handleTestEmail = async () => {
    if (!localSettings.smtp_host || !localSettings.smtp_username) {
      toast.error('Konfigurasi SMTP belum lengkap')
      return
    }
    try {
      setTestingEmail(true)
      const res = await fetch('/api/pengaturan/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', testTarget: localSettings.smtp_from_email || localSettings.smtp_username }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Gagal mengirim test email')
      }
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setTestingEmail(false)
    }
  }

  const [localSettings, setLocalSettings] = useState<Record<string, string>>({})

  // Sync settings when loaded - use useEffect to avoid race conditions
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      setLocalSettings(prev => {
        // Merge: keep any locally-updated values (like just-uploaded logo paths)
        // but update with server values for everything else
        const merged = { ...settings }

        // Helper to preserve cache-busted blob URLs
        const preserveBlobUrl = (key: string) => {
          if (prev[key] && prev[key] !== settings[key]) {
            const prevBase = prev[key].split('?')[0]
            const serverBase = (settings[key] || '').split('?')[0]
            // Case 1: local has cache-busted version of the same base URL → keep local
            if (prevBase === serverBase && prev[key].includes('?t=')) {
              merged[key] = prev[key]
            }
            // Case 2: local has a blob URL but server doesn't → keep local
            else if (prev[key].startsWith('/api/file/') && !settings[key]?.startsWith('/api/file/')) {
              merged[key] = prev[key]
            }
          }
        }

        preserveBlobUrl('app_logo')
        preserveBlobUrl('app_favicon')
        preserveBlobUrl('app_tte_image')
        preserveBlobUrl('app_print_logo')

        // On initial load (prev is empty), add cache-busting to blob URLs
        // so browser doesn't show stale/cached images
        if (Object.keys(prev).length === 0) {
          const blobKeys = ['app_logo', 'app_favicon', 'app_tte_image', 'app_print_logo']
          for (const key of blobKeys) {
            if (merged[key] && merged[key].startsWith('/api/file/') && !merged[key].includes('?t=')) {
              merged[key] = merged[key] + '?t=' + Date.now()
            }
          }
        }

        return merged
      })
    }
  }, [settings])

  // Fetch compression settings (one-time, using ref to avoid re-trigger)
  useEffect(() => {
    if (compressLoadedRef.current) return
    compressLoadedRef.current = true
    fetch('/api/pengaturan/compress')
      .then(res => res.json())
      .then(data => {
        setCompressSettings({
          enabled: data.enabled !== false,
          quality: data.quality || 80,
          maxWidth: data.maxWidth || 1920,
          maxHeight: data.maxHeight || 1080,
          format: data.format || 'original',
          compressPhotos: data.compressPhotos !== false,
          compressDocuments: data.compressDocuments !== false,
          compressLogo: data.compressLogo !== false,
        })
        setCompressStats({ totalSaved: data.totalSaved || 0, totalFiles: data.totalFiles || 0 })
      })
      .catch(() => {})
  }, [])

  // Fetch storage stats (one-time, using ref to avoid re-trigger)
  useEffect(() => {
    if (storageLoadedRef.current) return
    storageLoadedRef.current = true
    fetch('/api/pengaturan/storage')
      .then(res => res.json())
      .then(data => {
        setStorageStats(data)
      })
      .catch(() => {})
  }, [])

  // Handle save compression settings
  const handleSaveCompressSettings = async () => {
    try {
      toast.loading('Menyimpan pengaturan kompresi...', { id: 'compress-save' })
      const res = await fetch('/api/pengaturan/compress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compressSettings),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      toast.success('Pengaturan kompresi berhasil disimpan', { id: 'compress-save' })
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pengaturan kompresi', { id: 'compress-save' })
    }
  }

  // Handle test compression
  const handleTestCompression = async () => {
    if (!compressTestFile) {
      toast.error('Pilih file gambar terlebih dahulu')
      return
    }
    try {
      setTestingCompress(true)
      setCompressResult(null)
      const formData = new FormData()
      formData.append('file', compressTestFile)
      const res = await fetch('/api/pengaturan/compress', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menguji kompresi')
      setCompressResult(data)
      toast.success(`Kompresi berhasil! Hemat ${data.savedPercent}% (${formatBytes(data.savedBytes)})`)
    } catch (err: any) {
      toast.error(err.message || 'Gagal menguji kompresi')
    } finally {
      setTestingCompress(false)
    }
  }

  const handleSaveSettings = (section: string) => {
    const sectionKeys: Record<string, string[]> = {
      umum: ['nama_instansi', 'tahun_aktif', 'nomor_surat_otomatis', 'format_nomor_surat', 'bengkel_can_create_service'],
      email: ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_from_email', 'fonnte_api_key', 'fonnte_admin_phone',
        'notif_service_diajukan', 'notif_service_disetujui', 'notif_service_ditolak', 'notif_service_selesai', 'notif_anggaran_warning'],
      identitas: ['app_name', 'app_short_name', 'app_description', 'app_instansi', 'app_address', 'app_phone', 'app_email', 'app_kop_line1', 'app_kop_line2', 'app_kop_line3', 'app_kepala_nama', 'app_kepala_nip', 'app_kepala_jabatan', 'app_tempat_ttd', 'app_kabupaten_kota', 'app_sekda_nama', 'app_sekda_nip', 'app_logo', 'app_favicon', 'app_tte_image', 'app_print_logo'],
    }
    const keys = sectionKeys[section] || []
    const updateData: Record<string, string> = {}
    keys.forEach(k => {
      if (localSettings[k] !== undefined) {
        // Strip cache-busting query params from blob URLs before saving to DB
        // e.g., "/api/file/blob/app_logo?t=123" -> "/api/file/blob/app_logo"
        const val = localSettings[k]
        if (val.startsWith('/api/file/') && val.includes('?')) {
          updateData[k] = val.split('?')[0]
        } else {
          updateData[k] = val
        }
      }
    })
    updateSettings.mutate(updateData)
  }

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon' | 'tte' | 'print_logo') => {
    try {
      toast.loading(`Mengupload ${type}...`, { id: `upload-${type}` })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      const res = await fetch('/api/pengaturan/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        let errorMsg = 'Gagal mengupload'
        try {
          const err = await res.json()
          errorMsg = err.error || err.message || errorMsg
        } catch {}
        throw new Error(errorMsg)
      }
      const data = await res.json()
      // Add cache-busting timestamp to the URL so browser fetches fresh image
      const cacheBustedPath = data.path + '?t=' + Date.now()
      setLocalSettings(s => ({ ...s, [data.key]: cacheBustedPath }))
      // Update timestamp state for immediate visual refresh
      if (type === 'logo') setLogoTimestamp(Date.now())
      else if (type === 'favicon') setFaviconTimestamp(Date.now())
      else if (type === 'tte') setTteTimestamp(Date.now())
      else if (type === 'print_logo') setPrintLogoTimestamp(Date.now())
      queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
      queryClient.invalidateQueries({ queryKey: ['app-settings-sidebar'] })
      const typeLabel = type === 'logo' ? 'Logo' : type === 'favicon' ? 'Favicon' : type === 'tte' ? 'TTE' : 'Logo Cetak'
      toast.success(`${typeLabel} berhasil diupload`, { id: `upload-${type}` })
    } catch (err: any) {
      toast.error(err.message || `Gagal mengupload ${type}`, { id: `upload-${type}` })
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  if (loadingSettings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
            <Settings className="h-5 w-5" />
          </div>
          Pengaturan Sistem
        </h1>
        <p className="text-muted-foreground mt-1">Konfigurasi dan manajemen sistem</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="animate-slide-up animate-stagger-1 flex-wrap h-auto gap-1 bg-muted/40 backdrop-blur-sm rounded-2xl p-1.5 border border-border/30">
          <TabsTrigger value="umum" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200">Umum</TabsTrigger>
          <TabsTrigger value="identitas" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200"><Globe className="h-3.5 w-3.5 mr-1" /> Identitas Aplikasi</TabsTrigger>
          <TabsTrigger value="email" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200">Email & Notifikasi</TabsTrigger>
          <TabsTrigger value="users" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200">Manajemen User</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200">Audit Log</TabsTrigger>
          <TabsTrigger value="compress" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200"><Zap className="h-3.5 w-3.5 mr-1" /> Kompresi</TabsTrigger>
          <TabsTrigger value="storage" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200"><HardDrive className="h-3.5 w-3.5 mr-1" /> Penyimpanan</TabsTrigger>
          <TabsTrigger value="backup" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200">Backup & Restore</TabsTrigger>
          <TabsTrigger value="penomoran" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200"><Hash className="h-3.5 w-3.5 mr-1" /> Penomoran Surat</TabsTrigger>
          <TabsTrigger value="tahun" className="text-xs rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/20 transition-all duration-200">Pergantian Tahun</TabsTrigger>
        </TabsList>

        {/* Tab: Umum */}
        <TabsContent value="umum" className="mt-4">
          <Card className="animate-scale-in border border-border/50 shadow-sm rounded-2xl card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Pengaturan Umum</CardTitle>
              <CardDescription>Konfigurasi dasar sistem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nama_instansi">Nama Instansi</Label>
                  <Input
                    id="nama_instansi"
                    value={localSettings.nama_instansi || ''}
                    onChange={(e) => setLocalSettings(s => ({ ...s, nama_instansi: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tahun_aktif">Tahun Aktif</Label>
                  <Select value={localSettings.tahun_aktif || '2025'} onValueChange={(v) => setLocalSettings(s => ({ ...s, tahun_aktif: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2023, 2024, 2025, 2026, 2027].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Nomor Surat Otomatis</Label>
                  <p className="text-xs text-muted-foreground">Generate nomor surat otomatis saat service dibuat menggunakan konfigurasi Penomoran Surat</p>
                </div>
                <Switch
                  checked={localSettings.nomor_surat_otomatis === 'true'}
                  onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, nomor_surat_otomatis: checked.toString() }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bengkel Bisa Tambah Service
                  </Label>
                  <p className="text-xs text-muted-foreground">Izinkan role Bengkel untuk membuat service baru. Jika nonaktif, hanya Admin yang dapat membuat service.</p>
                </div>
                <Switch
                  checked={localSettings.bengkel_can_create_service === 'true'}
                  onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, bengkel_can_create_service: checked.toString() }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format_nomor_surat">Format Nomor Surat</Label>
                <Input
                  id="format_nomor_surat"
                  value={localSettings.format_nomor_surat || ''}
                  onChange={(e) => setLocalSettings(s => ({ ...s, format_nomor_surat: e.target.value }))}
                  placeholder="BKAD/SRV/{nomor}/{bulan}/{tahun}"
                />
                <p className="text-xs text-muted-foreground">Format lama — sekarang menggunakan Pengaturan Penomoran Surat (tab terpisah). Gunakan {'{tahun}'} dan {'{nomor}'} sebagai placeholder</p>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSaveSettings('umum')} disabled={updateSettings.isPending} className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20">
                  <Save className="h-4 w-4 mr-1" /> Simpan Pengaturan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Identitas Aplikasi */}
        <TabsContent value="identitas" className="mt-4">
          <div className="space-y-6">
            {/* Card 1: Logo & Favicon */}
            <Card className="animate-fade-in animate-stagger-1 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Logo & Favicon</CardTitle>
                <CardDescription>Upload logo dan favicon aplikasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Logo */}
                  <div className="flex-1 space-y-3">
                    <Label className="text-sm font-medium">Logo Aplikasi</Label>
                    <div className="flex items-center gap-4">
                      <div
                        className="h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50 shrink-0 cursor-pointer hover:border-primary/50 hover:bg-muted transition-colors"
                        onClick={() => logoInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/10') }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/10') }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove('border-primary', 'bg-primary/10')
                          const file = e.dataTransfer.files?.[0]
                          if (file && file.type.startsWith('image/')) handleFileUpload(file, 'logo')
                        }}
                      >
                        {localSettings.app_logo ? (
                          <img
                            key={logoTimestamp}
                            src={localSettings.app_logo}
                            alt="Logo"
                            className="h-20 w-20 rounded-full object-cover"
                            onError={(e) => {
                              // If image fails to load, try refreshing with new timestamp
                              const img = e.currentTarget
                              if (!img.src.includes('onerror=1')) {
                                const baseUrl = localSettings.app_logo?.split('?')[0] || ''
                                if (baseUrl) {
                                  img.src = baseUrl + '?onerror=1&t=' + Date.now()
                                } else {
                                  // Can't recover, hide the broken image
                                  img.style.display = 'none'
                                }
                              }
                            }}
                          />
                        ) : (
                          <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, 'logo')
                            e.target.value = ''
                          }}
                        />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-1" /> Upload Logo
                          </Button>
                          {localSettings.app_logo && (
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={async () => {
                              try {
                                const res = await fetch('/api/pengaturan/upload?type=logo', { method: 'DELETE' })
                                if (res.ok) {
                                  setLocalSettings(s => ({ ...s, app_logo: '' }))
                                  setLogoTimestamp(Date.now())
                                  queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
                                  queryClient.invalidateQueries({ queryKey: ['app-settings-sidebar'] })
                                  toast.success('Logo berhasil dihapus')
                                }
                              } catch {
                                toast.error('Gagal menghapus logo')
                              }
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">JPG, PNG, SVG, atau WebP. Maks 2MB.</p>
                        <p className="text-xs text-muted-foreground">Klik gambar atau drag & drop</p>
                      </div>
                    </div>
                  </div>

                  <Separator orientation="vertical" className="hidden sm:block h-auto" />

                  {/* Favicon */}
                  <div className="flex-1 space-y-3">
                    <Label className="text-sm font-medium">Favicon</Label>
                    <div className="flex items-center gap-4">
                      <div
                        className="h-12 w-12 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50 shrink-0 cursor-pointer hover:border-primary/50 hover:bg-muted transition-colors rounded"
                        onClick={() => faviconInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/10') }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/10') }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove('border-primary', 'bg-primary/10')
                          const file = e.dataTransfer.files?.[0]
                          if (file && file.type.startsWith('image/')) handleFileUpload(file, 'favicon')
                        }}
                      >
                        {localSettings.app_favicon ? (
                          <img
                            key={faviconTimestamp}
                            src={localSettings.app_favicon}
                            alt="Favicon"
                            className="h-12 w-12 object-contain"
                            onError={(e) => {
                              const img = e.currentTarget
                              if (!img.src.includes('onerror=1')) {
                                const baseUrl = localSettings.app_favicon?.split('?')[0] || ''
                                if (baseUrl) {
                                  img.src = baseUrl + '?onerror=1&t=' + Date.now()
                                } else {
                                  img.style.display = 'none'
                                }
                              }
                            }}
                          />
                        ) : (
                          <Globe className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept="image/x-icon,image/png,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, 'favicon')
                            e.target.value = ''
                          }}
                        />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-1" /> Upload Favicon
                          </Button>
                          {localSettings.app_favicon && (
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={async () => {
                              try {
                                const res = await fetch('/api/pengaturan/upload?type=favicon', { method: 'DELETE' })
                                if (res.ok) {
                                  setLocalSettings(s => ({ ...s, app_favicon: '' }))
                                  setFaviconTimestamp(Date.now())
                                  queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
                                  queryClient.invalidateQueries({ queryKey: ['app-settings-sidebar'] })
                                  toast.success('Favicon berhasil dihapus')
                                }
                              } catch {
                                toast.error('Gagal menghapus favicon')
                              }
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">ICO, PNG, SVG, atau WebP. Maks 1MB.</p>
                        <p className="text-xs text-muted-foreground">Klik gambar atau drag & drop</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Informasi Aplikasi */}
            <Card className="animate-fade-in animate-stagger-2 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Informasi Aplikasi</CardTitle>
                <CardDescription>Identitas dan informasi dasar aplikasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="app_name">Nama Aplikasi</Label>
                    <Input
                      id="app_name"
                      value={localSettings.app_name || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_name: e.target.value }))}
                      placeholder="SIService BKAD"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_short_name">Nama Singkat</Label>
                    <Input
                      id="app_short_name"
                      value={localSettings.app_short_name || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_short_name: e.target.value }))}
                      placeholder="BKAD"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="app_description">Deskripsi Aplikasi</Label>
                    <Input
                      id="app_description"
                      value={localSettings.app_description || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_description: e.target.value }))}
                      placeholder="Sistem Informasi Service Kendaraan Dinas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_instansi">Nama Instansi</Label>
                    <Input
                      id="app_instansi"
                      value={localSettings.app_instansi || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_instansi: e.target.value }))}
                      placeholder="Badan Keuangan dan Aset Daerah"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_address">Alamat</Label>
                    <Input
                      id="app_address"
                      value={localSettings.app_address || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_address: e.target.value }))}
                      placeholder="Jl. ..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_phone">Telepon</Label>
                    <Input
                      id="app_phone"
                      value={localSettings.app_phone || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_phone: e.target.value }))}
                      placeholder="(021) 1234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_email">Email</Label>
                    <Input
                      id="app_email"
                      type="email"
                      value={localSettings.app_email || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_email: e.target.value }))}
                      placeholder="info@bkad.go.id"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2b: Logo Cetak Dokumen */}
            <Card className="animate-fade-in animate-stagger-2 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5" /> Logo Cetak Dokumen</CardTitle>
                <CardDescription>Logo khusus untuk dokumen cetak (kop surat). Jika tidak diisi, akan menggunakan Logo Aplikasi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="h-20 w-20 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50 shrink-0 cursor-pointer hover:border-primary/50 hover:bg-muted transition-colors"
                    onClick={() => printLogoInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/10') }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/10') }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('border-primary', 'bg-primary/10')
                      const file = e.dataTransfer.files?.[0]
                      if (file && file.type.startsWith('image/')) handleFileUpload(file, 'print_logo')
                    }}
                  >
                    {localSettings.app_print_logo ? (
                      <img
                        key={printLogoTimestamp}
                        src={localSettings.app_print_logo}
                        alt="Logo Cetak"
                        className="h-20 w-20 rounded-xl object-contain"
                        onError={(e) => {
                          const img = e.currentTarget
                          if (!img.src.includes('onerror=1')) {
                            const baseUrl = localSettings.app_print_logo?.split('?')[0] || ''
                            if (baseUrl) {
                              img.src = baseUrl + '?onerror=1&t=' + Date.now()
                            } else {
                              img.style.display = 'none'
                            }
                          }
                        }}
                      />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={printLogoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, 'print_logo')
                        e.target.value = ''
                      }}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => printLogoInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-1" /> Upload Logo Cetak
                      </Button>
                      {localSettings.app_print_logo && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={async () => {
                          try {
                            const res = await fetch('/api/pengaturan/upload?type=print_logo', { method: 'DELETE' })
                            if (res.ok) {
                              setLocalSettings(s => ({ ...s, app_print_logo: '' }))
                              setPrintLogoTimestamp(Date.now())
                              queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
                              queryClient.invalidateQueries({ queryKey: ['app-settings-sidebar'] })
                              toast.success('Logo cetak berhasil dihapus')
                            }
                          } catch {
                            toast.error('Gagal menghapus logo cetak')
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">JPG, PNG, SVG, atau WebP. Maks 2MB.</p>
                    <p className="text-xs text-muted-foreground">Klik gambar atau drag & drop</p>
                    {!localSettings.app_print_logo && (
                      <p className="text-xs text-teal-600 dark:text-teal-400">Fallback: Logo Aplikasi akan digunakan</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Kop Surat */}
            <Card className="animate-fade-in animate-stagger-3 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PenLine className="h-5 w-5" /> Kop Surat</CardTitle>
                <CardDescription>Konfigurasi kop surat untuk cetak laporan resmi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="app_kop_line1">Baris 1</Label>
                    <Input
                      id="app_kop_line1"
                      value={localSettings.app_kop_line1 || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_kop_line1: e.target.value }))}
                      placeholder="PEMERINTAH KABUPATEN/KOTA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_kop_line2">Baris 2</Label>
                    <Input
                      id="app_kop_line2"
                      value={localSettings.app_kop_line2 || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_kop_line2: e.target.value }))}
                      placeholder="BADAN KEUANGAN DAN ASET DAERAH"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_kop_line3">Baris 3</Label>
                    <Input
                      id="app_kop_line3"
                      value={localSettings.app_kop_line3 || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_kop_line3: e.target.value }))}
                      placeholder="UNIT LAYANAN PENGADAAN"
                    />
                  </div>
                </div>
                {/* Preview Kop Surat */}
                <Separator />
                <div className="rounded-lg border p-4 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Preview Kop Surat:</p>
                  <div className="text-center">
                    <p className="text-sm font-bold tracking-wider">{localSettings.app_kop_line1 || 'PEMERINTAH KABUPATEN/KOTA'}</p>
                    <p className="text-base font-bold tracking-wider">{localSettings.app_kop_line2 || 'BADAN KEUANGAN DAN ASET DAERAH'}</p>
                    <p className="text-sm font-semibold tracking-wider">{localSettings.app_kop_line3 || 'UNIT LAYANAN PENGADAAN'}</p>
                    <div className="border-b-2 border-black mt-2" />
                    <div className="border-b border-black mt-0.5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Tanda Tangan */}
            <Card className="animate-fade-in animate-stagger-4 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Stamp className="h-5 w-5" /> Tanda Tangan</CardTitle>
                <CardDescription>Data pejabat untuk tanda tangan laporan resmi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="app_kepala_nama">Nama Kepala</Label>
                    <Input
                      id="app_kepala_nama"
                      value={localSettings.app_kepala_nama || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_kepala_nama: e.target.value }))}
                      placeholder="Nama Kepala BKAD"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_kepala_nip">NIP Kepala</Label>
                    <Input
                      id="app_kepala_nip"
                      value={localSettings.app_kepala_nip || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_kepala_nip: e.target.value }))}
                      placeholder="19680101 199001 1 001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_kepala_jabatan">Jabatan Kepala</Label>
                    <Input
                      id="app_kepala_jabatan"
                      value={localSettings.app_kepala_jabatan || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_kepala_jabatan: e.target.value }))}
                      placeholder="Kepala BKAD"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_tempat_ttd">Tempat Penandatanganan</Label>
                    <Input
                      id="app_tempat_ttd"
                      value={localSettings.app_tempat_ttd || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_tempat_ttd: e.target.value }))}
                      placeholder="Kabupaten/Kota"
                    />
                    <p className="text-xs text-muted-foreground">Tempat penandatanganan yang tampil pada dokumen cetak (contoh: Kabupaten Bandung, Kota Surabaya)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_kabupaten_kota" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Kabupaten/Kota
                    </Label>
                    <Input
                      id="app_kabupaten_kota"
                      value={localSettings.app_kabupaten_kota || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, app_kabupaten_kota: e.target.value }))}
                      placeholder="Kabupaten Bojonegoro"
                    />
                    <p className="text-xs text-muted-foreground">Nama Kabupaten/Kota yang tampil di baris tanggal penandatanganan (contoh: Kabupaten Bojonegoro, Kota Surabaya)</p>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Card 5: Tanda Tangan Elektronik (TTE) - Upload Gambar */}
            <Card className="animate-fade-in animate-stagger-5 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Stamp className="h-5 w-5" /> Tanda Tangan Elektronik (TTE)</CardTitle>
                <CardDescription>Upload gambar tanda tangan untuk digunakan pada semua dokumen cetak resmi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* TTE Image Upload Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Gambar Tanda Tangan (TTE)</Label>
                  {localSettings.app_tte_image ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 rounded-xl border border-border/50 bg-white p-3 shadow-sm">
                          <img
                            src={`${localSettings.app_tte_image}${localSettings.app_tte_image.includes('?') ? '&' : '?'}t=${tteTimestamp}`}
                            alt="TTE Image"
                            className="h-20 w-auto max-w-[240px] object-contain"
                          />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                              <CheckCircle className="h-3 w-3 mr-1" /> Aktif
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Gambar TTE ini akan ditampilkan pada kolom tanda tangan di semua dokumen cetak resmi.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => tteInputRef.current?.click()}
                          className="gap-1.5 rounded-xl border-border/50 hover:border-teal-500/50 hover:text-teal-600"
                        >
                          <ImagePlus className="h-3.5 w-3.5" /> Ganti Gambar TTE
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/pengaturan/upload?type=tte', { method: 'DELETE' })
                              if (!res.ok) throw new Error('Gagal menghapus')
                              setLocalSettings(s => ({ ...s, app_tte_image: '' }))
                              setTteTimestamp(Date.now())
                              queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
                              toast.success('Gambar TTE berhasil dihapus')
                            } catch (err: any) {
                              toast.error(err.message || 'Gagal menghapus TTE')
                            }
                          }}
                          className="gap-1.5 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div
                        className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 cursor-pointer hover:border-teal-500/50 hover:bg-muted/30 transition-colors"
                        onClick={() => tteInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-teal-500', 'bg-teal-50', 'dark:bg-teal-950/20') }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-teal-500', 'bg-teal-50', 'dark:bg-teal-950/20') }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove('border-teal-500', 'bg-teal-50', 'dark:bg-teal-950/20')
                          const file = e.dataTransfer.files[0]
                          if (file) handleFileUpload(file, 'tte')
                        }}
                      >
                        <Stamp className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">Belum ada gambar TTE</p>
                        <p className="text-xs text-muted-foreground/70">Klik atau seret gambar tanda tangan ke sini</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">Format: PNG, JPG, SVG (Maks. 2MB)</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => tteInputRef.current?.click()}
                          className="gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20 flex-1"
                        >
                          <Upload className="h-4 w-4" /> Upload Gambar TTE
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSignatureDialogOpen(true)}
                          className="gap-1.5 rounded-xl border-border/50 hover:border-teal-500/50 hover:text-teal-600"
                        >
                          <PenLine className="h-4 w-4" /> Gambar Tangan
                        </Button>
                      </div>
                    </div>
                  )}
                  <input
                    ref={tteInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'tte')
                      e.target.value = ''
                    }}
                  />
                </div>

                <Separator className="my-2" />

                {/* Canvas Signature (alternative / manual) */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <PenTool className="h-3.5 w-3.5" />
                    Tanda Tangan Manual (Canvas)
                  </Label>
                  {currentSignature ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30">
                        <div className="shrink-0 rounded-lg border border-border/50 bg-white p-2">
                          <img
                            src={currentSignature.imageData}
                            alt="Tanda Tangan Canvas"
                            className="h-10 w-auto max-w-[160px] object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {localSettings.app_tte_image
                              ? 'Tanda tangan canvas tersimpan. Klik "Gunakan sebagai TTE" untuk mengganti gambar TTE saat ini.'
                              : 'Tanda tangan canvas tersimpan. Klik "Gunakan sebagai TTE" untuk menggunakannya di semua dokumen cetak.'}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                toast.loading('Mengkonversi tanda tangan ke TTE...', { id: 'convert-tte' })
                                const res = await fetch('/api/signature/convert-tte', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ signatureId: currentSignature.id }),
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.error || 'Gagal mengkonversi')
                                setLocalSettings(s => ({ ...s, app_tte_image: data.ttePath + '?t=' + Date.now() }))
                                setTteTimestamp(Date.now())
                                queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
                                toast.success('Tanda tangan berhasil dijadikan TTE', { id: 'convert-tte' })
                              } catch (err: any) {
                                toast.error(err.message || 'Gagal mengkonversi', { id: 'convert-tte' })
                              }
                            }}
                            className="gap-1.5 rounded-xl border-teal-500/50 text-teal-600 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/30"
                          >
                            <Stamp className="h-3.5 w-3.5" /> Gunakan sebagai TTE
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (currentSignature?.id) {
                                deleteSignature.mutate(currentSignature.id)
                              }
                            }}
                            disabled={deleteSignature.isPending}
                            className="gap-1 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSignatureDialogOpen(true)}
                        className="gap-1.5 rounded-xl text-muted-foreground"
                      >
                        <PenLine className="h-3.5 w-3.5" /> Buat Ulang Tanda Tangan Manual
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20">
                      <PenTool className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">Belum ada tanda tangan manual</p>
                      <p className="text-xs text-muted-foreground/70 mb-3">Buat tanda tangan langsung di layar</p>
                      <Button
                        onClick={() => setSignatureDialogOpen(true)}
                        className="gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20"
                      >
                        <PenLine className="h-4 w-4" /> Buat Tanda Tangan Manual
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => handleSaveSettings('identitas')} disabled={updateSettings.isPending} className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20">
                <Save className="h-4 w-4 mr-1" /> Simpan Pengaturan
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Email & Notifikasi */}
        <TabsContent value="email" className="mt-4">
          <div className="space-y-6">
            <Card className="animate-fade-in animate-stagger-1 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Konfigurasi Email (SMTP)</CardTitle>
                <CardDescription>Pengaturan server email untuk notifikasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={localSettings.smtp_host || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_host: e.target.value }))}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input
                      value={localSettings.smtp_port || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_port: e.target.value }))}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={localSettings.smtp_username || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_username: e.target.value }))}
                      placeholder="email@domain.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={localSettings.smtp_password || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>From Email</Label>
                    <Input
                      value={localSettings.smtp_from_email || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_from_email: e.target.value }))}
                      placeholder="noreply@bkad.go.id"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestEmail}
                    disabled={testingEmail}
                  >
                    {testingEmail ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                    ) : (
                      <Mail className="h-4 w-4 mr-1.5" />
                    )}
                    Test Email
                  </Button>
                  <p className="text-xs text-muted-foreground">Email test akan dikirim ke alamat From Email yang dikonfigurasi</p>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in animate-stagger-2 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                  Notifikasi WhatsApp (Fonnte)
                </CardTitle>
                <CardDescription>Konfigurasi Fonnte untuk pengiriman notifikasi WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>API Key Fonnte</Label>
                    <Input
                      type="password"
                      value={localSettings.fonnte_api_key || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, fonnte_api_key: e.target.value }))}
                      placeholder="Masukkan API key dari fonnte.co.id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nomor Admin</Label>
                    <Input
                      value={localSettings.fonnte_admin_phone || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, fonnte_admin_phone: e.target.value }))}
                      placeholder="6281234567890"
                    />
                    <p className="text-xs text-muted-foreground">Nomor WA admin untuk menerima notifikasi (format: 628xxx)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestWhatsApp}
                    disabled={testingWA}
                  >
                    {testingWA ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-1.5" />
                    )}
                    Test Koneksi
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Daftar dan dapatkan API key di <a href="https://fonnte.co.id" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">fonnte.co.id</a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in animate-stagger-3 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle>Notifikasi per Event</CardTitle>
                <CardDescription>Aktifkan notifikasi untuk setiap jenis event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'notif_service_diajukan', label: 'Service Diajukan', desc: 'Notifikasi saat service baru diajukan' },
                  { key: 'notif_service_disetujui', label: 'Service Disetujui', desc: 'Notifikasi saat service disetujui admin' },
                  { key: 'notif_service_ditolak', label: 'Service Ditolak', desc: 'Notifikasi saat service ditolak' },
                  { key: 'notif_service_selesai', label: 'Service Selesai', desc: 'Notifikasi saat service selesai dikerjakan' },
                  { key: 'notif_anggaran_warning', label: 'Peringatan Anggaran', desc: 'Notifikasi saat anggaran mendekati batas' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={localSettings[item.key] === 'true'}
                      onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, [item.key]: checked.toString() }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => handleSaveSettings('email')} disabled={updateSettings.isPending} className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20">
                <Save className="h-4 w-4 mr-1" /> Simpan Pengaturan
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Manajemen User */}
        <TabsContent value="users" className="mt-4">
          <Card className="animate-scale-in border border-border/50 shadow-sm rounded-2xl card-hover">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Manajemen User</CardTitle>
                <CardDescription>Kelola pengguna sistem</CardDescription>
              </div>
              <Dialog open={userDialogOpen} onOpenChange={(open) => {
                setUserDialogOpen(open)
                if (!open) {
                  setEditingUser(null)
                  setUserForm({ name: '', email: '', password: '', role: 'ADMIN', bengkelId: '', isActive: true })
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => {
                    setEditingUser(null)
                    setUserForm({ name: '', email: '', password: '', role: 'ADMIN', bengkelId: '', isActive: true })
                    setUserDialogOpen(true)
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
                    <DialogDescription>{editingUser ? 'Perbarui data pengguna sistem' : 'Masukkan data pengguna sistem'}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nama</Label>
                      <Input value={userForm.name} onChange={(e) => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama lengkap" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={userForm.email} onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="email@domain.com" type="email" />
                    </div>
                    {editingUser ? (
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input value={userForm.password} onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Kosongkan jika tidak ingin mengubah" type="password" />
                        <p className="text-xs text-muted-foreground">Kosongkan jika tidak ingin mengubah password</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input value={userForm.password} onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimal 8 karakter" type="password" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={userForm.role} onValueChange={(v) => setUserForm(f => ({ ...f, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              <div>
                                <p>{label}</p>
                                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[key]}</p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {userForm.role === 'BENGKEL' && (
                      <div className="space-y-2">
                        <Label>Bengkel</Label>
                        <Select value={userForm.bengkelId} onValueChange={(v) => setUserForm(f => ({ ...f, bengkelId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Pilih bengkel" /></SelectTrigger>
                          <SelectContent>
                            {workshops.map((w: any) => (
                              <SelectItem key={w.id} value={w.id}>{w.namaBengkel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {editingUser && (
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label>Status Aktif</Label>
                          <p className="text-xs text-muted-foreground">
                            {userForm.isActive ? 'User dapat mengakses sistem' : 'User tidak dapat mengakses sistem'}
                          </p>
                        </div>
                        <Switch
                          checked={userForm.isActive}
                          onCheckedChange={(checked) => setUserForm(f => ({ ...f, isActive: checked }))}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Batal</Button>
                    <Button onClick={handleUserFormSubmit} disabled={createUser.isPending || updateUser.isPending}>
                      {editingUser ? 'Simpan Perubahan' : 'Tambah'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Bengkel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ROLE_LABELS[user.role] || user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{user.bengkel?.namaBengkel || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'destructive'} className="text-xs">
                            {user.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{user.isActive ? 'Nonaktifkan User' : 'Aktifkan User'}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {user.isActive
                                      ? `Yakin ingin menonaktifkan user "${user.name}"? User tidak akan dapat mengakses sistem.`
                                      : `Yakin ingin mengaktifkan kembali user "${user.name}"? User akan dapat mengakses sistem kembali.`
                                    }
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    className={user.isActive ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
                                    onClick={() => deleteUser.mutate(user.id)}
                                  >
                                    {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Role Descriptions */}
              <Separator className="my-4" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-start gap-2 rounded-lg border p-3">
                    <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[key]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Audit Log */}
        <TabsContent value="audit" className="mt-4">
          <Card className="animate-scale-in border border-border/50 shadow-sm rounded-2xl card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Audit Log</CardTitle>
              <CardDescription>Riwayat aktivitas sistem</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAudit ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Aksi</TableHead>
                        <TableHead>Entitas</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditData?.logs || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Belum ada log aktivitas
                          </TableCell>
                        </TableRow>
                      ) : (
                        (auditData?.logs || []).map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {formatDate(log.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                                  <User className="h-3 w-3" />
                                </div>
                                <span>{log.user?.name || 'System'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                log.action === 'CREATE' ? 'default' :
                                log.action === 'UPDATE' ? 'secondary' :
                                log.action === 'DELETE' ? 'destructive' :
                                'outline'
                              } className="text-[10px]">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{log.entity}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.details}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Kompresi Gambar */}
        <TabsContent value="compress" className="mt-4">
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="animate-fade-in animate-stagger-1 border border-border/50 shadow-sm rounded-2xl card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shrink-0">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground tracking-wider uppercase">Total Hemat</p>
                      <p className="text-xl font-bold">{formatBytes(compressStats.totalSaved)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in animate-stagger-2 border border-border/50 shadow-sm rounded-2xl card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0">
                      <FileDown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground tracking-wider uppercase">File Dikompresi</p>
                      <p className="text-xl font-bold">{compressStats.totalFiles}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in animate-stagger-3 border border-border/50 shadow-sm rounded-2xl card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shrink-0">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground tracking-wider uppercase">Rata-rata Kompresi</p>
                      <p className="text-xl font-bold">{compressStats.totalFiles > 0 ? Math.round(compressStats.totalSaved / compressStats.totalFiles / 1024) + ' KB' : '0 KB'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings Card */}
            <Card className="animate-fade-in animate-stagger-2 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Pengaturan Kompresi
                </CardTitle>
                <CardDescription>Konfigurasi kompresi gambar otomatis saat upload untuk menghemat penyimpanan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Aktifkan Kompresi Otomatis
                    </Label>
                    <p className="text-xs text-muted-foreground">Kompresi gambar secara otomatis saat upload</p>
                  </div>
                  <Switch
                    checked={compressSettings.enabled}
                    onCheckedChange={(checked) => setCompressSettings(s => ({ ...s, enabled: checked }))}
                  />
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="compress-quality">Kualitas Gambar ({compressSettings.quality}%)</Label>
                    <input
                      id="compress-quality"
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={compressSettings.quality}
                      onChange={(e) => setCompressSettings(s => ({ ...s, quality: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Kecil (10%)</span>
                      <span>Besar (100%)</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Format Output</Label>
                    <Select value={compressSettings.format} onValueChange={(v) => setCompressSettings(s => ({ ...s, format: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Asli (JPEG→JPEG, PNG→JPEG)</SelectItem>
                        <SelectItem value="jpeg">Selalu JPEG</SelectItem>
                        <SelectItem value="webp">Selalu WebP (terkecil)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">WebP menghasilkan ukuran file terkecil</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compress-max-width">Lebar Maksimum (px)</Label>
                    <Input
                      id="compress-max-width"
                      type="number"
                      value={compressSettings.maxWidth}
                      onChange={(e) => setCompressSettings(s => ({ ...s, maxWidth: parseInt(e.target.value) || 1920 }))}
                      min={320}
                      max={7680}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compress-max-height">Tinggi Maksimum (px)</Label>
                    <Input
                      id="compress-max-height"
                      type="number"
                      value={compressSettings.maxHeight}
                      onChange={(e) => setCompressSettings(s => ({ ...s, maxHeight: parseInt(e.target.value) || 1080 }))}
                      min={240}
                      max={4320}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Kompresi per Jenis Upload</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-teal-500" />
                        <div>
                          <p className="text-sm font-medium">Logo Aplikasi</p>
                          <p className="text-xs text-muted-foreground">Kompresi logo & favicon</p>
                        </div>
                      </div>
                      <Switch
                        checked={compressSettings.compressLogo}
                        onCheckedChange={(checked) => setCompressSettings(s => ({ ...s, compressLogo: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium">Dokumen</p>
                          <p className="text-xs text-muted-foreground">Nota, kwitansi, dokumen bengkel & kendaraan</p>
                        </div>
                      </div>
                      <Switch
                        checked={compressSettings.compressDocuments}
                        onCheckedChange={(checked) => setCompressSettings(s => ({ ...s, compressDocuments: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">Foto Item Service</p>
                          <p className="text-xs text-muted-foreground">Foto perbaikan/service item</p>
                        </div>
                      </div>
                      <Switch
                        checked={compressSettings.compressPhotos}
                        onCheckedChange={(checked) => setCompressSettings(s => ({ ...s, compressPhotos: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveCompressSettings} className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20">
                    <Save className="h-4 w-4 mr-1" /> Simpan Pengaturan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Compression Card */}
            <Card className="animate-fade-in animate-stagger-3 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  Uji Kompresi
                </CardTitle>
                <CardDescription>Upload gambar untuk menguji pengaturan kompresi saat ini</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Pilih Gambar untuk Test</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        id="compress-test-file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setCompressTestFile(file)
                            setCompressResult(null)
                          }
                          e.target.value = ''
                        }}
                      />
                      <Button variant="outline" size="sm" onClick={() => document.getElementById('compress-test-file')?.click()}>
                        <Upload className="h-4 w-4 mr-1" /> Pilih File
                      </Button>
                      {compressTestFile && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{compressTestFile.name}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleTestCompression}
                    disabled={!compressTestFile || testingCompress}
                    className="rounded-xl"
                  >
                    {testingCompress ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                    ) : (
                      <Zap className="h-4 w-4 mr-1.5" />
                    )}
                    Uji Kompresi
                  </Button>
                </div>

                {/* Compression Result */}
                {compressResult && (
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {compressResult.wasCompressed ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <span className="text-amber-500 text-sm">ℹ️</span>
                      )}
                      <span className="text-sm font-medium">
                        {compressResult.wasCompressed ? 'Kompresi Berhasil!' : 'File tidak perlu dikompresi'}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/50 p-3 bg-background">
                        <p className="text-xs text-muted-foreground">Ukuran Asli</p>
                        <p className="text-lg font-bold">{formatBytes(compressResult.originalSize)}</p>
                      </div>
                      <div className="rounded-lg border border-border/50 p-3 bg-background">
                        <p className="text-xs text-muted-foreground">Setelah Kompresi</p>
                        <p className="text-lg font-bold text-emerald-600">{formatBytes(compressResult.compressedSize)}</p>
                      </div>
                    </div>
                    {compressResult.wasCompressed && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${100 - compressResult.savedPercent}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-emerald-600">-{compressResult.savedPercent}%</span>
                      </div>
                    )}
                    {compressResult.width && compressResult.height && (
                      <p className="text-xs text-muted-foreground">
                        Dimensi: {compressResult.width} × {compressResult.height}px | Format: {compressResult.format}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Penyimpanan Blob */}
        <TabsContent value="storage" className="mt-4">
          <div className="space-y-6">
            {/* Storage Overview */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="animate-fade-in animate-stagger-1 border border-border/50 shadow-sm rounded-2xl card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shrink-0">
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground tracking-wider uppercase">Total Penyimpanan</p>
                      <p className="text-xl font-bold">{storageStats ? formatBytes(storageStats.total.totalSize) : '...'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in animate-stagger-2 border border-border/50 shadow-sm rounded-2xl card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0">
                      <Paperclip className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground tracking-wider uppercase">Total File</p>
                      <p className="text-xl font-bold">{storageStats?.total.count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in animate-stagger-3 border border-border/50 shadow-sm rounded-2xl card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shrink-0">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground tracking-wider uppercase">Hemat Kompresi</p>
                      <p className="text-xl font-bold">{formatBytes(compressStats.totalSaved)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Storage Breakdown */}
            <Card className="animate-fade-in animate-stagger-2 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-teal-500" />
                  Detail Penyimpanan Blob
                </CardTitle>
                <CardDescription>Semua file tersimpan langsung di database (Blob Store) — tidak memerlukan konfigurasi filesystem saat deploy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {storageStats ? (
                  <div className="space-y-3">
                    {/* Progress bar for total storage */}
                    <div className="rounded-xl border border-border/50 p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Penggunaan Total</span>
                        <span className="text-sm font-bold">{formatBytes(storageStats.total.totalSize)}</span>
                      </div>
                      <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                        {storageStats.serviceDocs.totalSize > 0 && (
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-500"
                            style={{ width: `${(storageStats.serviceDocs.totalSize / Math.max(storageStats.total.totalSize, 1)) * 100}%` }}
                            title={`Dokumen Service: ${formatBytes(storageStats.serviceDocs.totalSize)}`}
                          />
                        )}
                        {storageStats.servicePhotos.totalSize > 0 && (
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                            style={{ width: `${(storageStats.servicePhotos.totalSize / Math.max(storageStats.total.totalSize, 1)) * 100}%` }}
                            title={`Foto Service: ${formatBytes(storageStats.servicePhotos.totalSize)}`}
                          />
                        )}
                        {storageStats.workshopDocs.totalSize > 0 && (
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                            style={{ width: `${(storageStats.workshopDocs.totalSize / Math.max(storageStats.total.totalSize, 1)) * 100}%` }}
                            title={`Dokumen Bengkel: ${formatBytes(storageStats.workshopDocs.totalSize)}`}
                          />
                        )}
                        {storageStats.vehicleDocs.totalSize > 0 && (
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                            style={{ width: `${(storageStats.vehicleDocs.totalSize / Math.max(storageStats.total.totalSize, 1)) * 100}%` }}
                            title={`Dokumen Kendaraan: ${formatBytes(storageStats.vehicleDocs.totalSize)}`}
                          />
                        )}
                        {storageStats.blobFiles.totalSize > 0 && (
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500"
                            style={{ width: `${(storageStats.blobFiles.totalSize / Math.max(storageStats.total.totalSize, 1)) * 100}%` }}
                            title={`Logo & Favicon: ${formatBytes(storageStats.blobFiles.totalSize)}`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Category breakdown */}
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-teal-500" />
                          <div>
                            <p className="text-sm font-medium">Dokumen Service</p>
                            <p className="text-xs text-muted-foreground">Nota, kwitansi, faktur</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatBytes(storageStats.serviceDocs.totalSize)}</p>
                          <p className="text-xs text-muted-foreground">{storageStats.serviceDocs.count} file</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                        <div className="flex items-center gap-2">
                          <ImagePlus className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">Foto Item Service</p>
                            <p className="text-xs text-muted-foreground">Foto perbaikan & service</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatBytes(storageStats.servicePhotos.totalSize)}</p>
                          <p className="text-xs text-muted-foreground">{storageStats.servicePhotos.count} file</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                        <div className="flex items-center gap-2">
                          <FileArchive className="h-4 w-4 text-amber-500" />
                          <div>
                            <p className="text-sm font-medium">Dokumen Bengkel</p>
                            <p className="text-xs text-muted-foreground">KTP, NPWP, NIB, dll.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatBytes(storageStats.workshopDocs.totalSize)}</p>
                          <p className="text-xs text-muted-foreground">{storageStats.workshopDocs.count} file</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-purple-500" />
                          <div>
                            <p className="text-sm font-medium">Dokumen Kendaraan</p>
                            <p className="text-xs text-muted-foreground">BPKB, STNK, dll.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatBytes(storageStats.vehicleDocs.totalSize)}</p>
                          <p className="text-xs text-muted-foreground">{storageStats.vehicleDocs.count} file</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-rose-500" />
                          <div>
                            <p className="text-sm font-medium">Logo & Favicon</p>
                            <p className="text-xs text-muted-foreground">Aset identitas aplikasi</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatBytes(storageStats.blobFiles.totalSize)}</p>
                          <p className="text-xs text-muted-foreground">{storageStats.blobFiles.count} file</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  </div>
                )}

                <Separator />

                {/* Info about Blob Store */}
                <div className="rounded-xl border border-teal-500/20 bg-teal-50 dark:bg-teal-950/20 p-4">
                  <div className="flex gap-3">
                    <HardDrive className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Blob Store — Penyimpanan Database</p>
                      <p className="text-xs text-teal-600 dark:text-teal-400">
                        Semua file yang diupload tersimpan langsung di database sebagai Blob. Ini memudahkan deployment karena tidak memerlukan konfigurasi filesystem, volume mount, atau cloud storage. File secara otomatis dikompresi sebelum disimpan untuk menghemat ruang penyimpanan.
                      </p>
                      <ul className="text-xs text-teal-600 dark:text-teal-400 space-y-1 ml-3">
                        <li>✅ Tidak perlu konfigurasi filesystem saat deploy</li>
                        <li>✅ File otomatis ter-backup bersama database</li>
                        <li>✅ Kompresi otomatis untuk gambar</li>
                        <li>✅ Portabel — cukup salin file database</li>
                        <li>✅ Aman — file tidak bisa diakses langsung via URL</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Backup & Restore */}
        <TabsContent value="backup" className="mt-4">
          <div className="space-y-6">
            {/* Database Stats */}
            <Card className="animate-fade-in animate-stagger-1 border border-border/50 shadow-sm rounded-2xl card-hover overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                    <Database className="h-4 w-4" />
                  </div>
                  Informasi Database
                </CardTitle>
                <CardDescription>Status dan statistik database saat ini</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingBackup ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-border/50 p-3 bg-gradient-to-br from-teal-50 to-transparent dark:from-teal-950/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="h-3.5 w-3.5 text-teal-600" />
                        <p className="text-[11px] text-muted-foreground">Ukuran Database</p>
                      </div>
                      <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{backupInfo?.stats?.dbSizeFormatted || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-border/50 p-3 bg-gradient-to-br from-sky-50 to-transparent dark:from-sky-950/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-3.5 w-3.5 text-sky-600" />
                        <p className="text-[11px] text-muted-foreground">Total User</p>
                      </div>
                      <p className="text-lg font-bold text-sky-700 dark:text-sky-400">{backupInfo?.stats?.users || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border/50 p-3 bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-950/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-3.5 w-3.5 text-amber-600" />
                        <p className="text-[11px] text-muted-foreground">Total Kendaraan</p>
                      </div>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{backupInfo?.stats?.vehicles || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border/50 p-3 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-950/20">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        <p className="text-[11px] text-muted-foreground">Total Service</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{backupInfo?.stats?.services || 0}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Backup Section */}
            <Card className="animate-fade-in animate-stagger-2 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                    <Download className="h-4 w-4" />
                  </div>
                  Backup Database
                </CardTitle>
                <CardDescription>Unduh cadangan database sistem dalam format SQLite</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border/50 p-4 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                      <Clock className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Backup Terakhir</p>
                      <p className="text-xs text-muted-foreground">
                        {backupInfo?.lastBackup
                          ? formatDate(backupInfo.lastBackup)
                          : 'Belum pernah dibackup'}
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleBackup} className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-500/20">
                    <Download className="h-4 w-4 mr-1.5" /> Backup Sekarang
                  </Button>
                </div>
                <div className="rounded-xl border border-dashed border-border/50 p-4 bg-muted/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold mt-0.5">i</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>File backup berisi salinan lengkap database dalam format SQLite (.db).</p>
                      <p>Disarankan untuk melakukan backup secara berkala untuk keamanan data.</p>
                      <p>File backup dapat digunakan untuk memulihkan data melalui fitur Restore di bawah.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Restore Section */}
            <Card className="animate-fade-in animate-stagger-3 border border-border/50 shadow-sm rounded-2xl card-hover overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-600 text-white">
                    <Upload className="h-4 w-4" />
                  </div>
                  Restore Database
                </CardTitle>
                <CardDescription>Pulihkan database dari file backup yang telah diunduh sebelumnya</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Warning */}
                <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <Shield className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-destructive">Peringatan!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Restore akan menimpa seluruh data yang ada saat ini. Pastikan Anda sudah membuat backup sebelum melakukan restore. Tindakan ini TIDAK DAPAT dibatalkan.</p>
                  </div>
                </div>

                {/* File Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Pilih File Backup (.db)</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".db"
                      className="hidden"
                      id="restore-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setRestoreFile(file)
                        }
                        e.target.value = ''
                      }}
                    />
                    <div
                      className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border/50 p-4 cursor-pointer hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-200"
                      onClick={() => document.getElementById('restore-file-input')?.click()}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {restoreFile ? (
                          <>
                            <p className="text-sm font-medium truncate">{restoreFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(restoreFile.size / 1024).toFixed(1)} KB</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">Klik untuk memilih file</p>
                            <p className="text-xs text-muted-foreground">Format .db (SQLite database backup)</p>
                          </>
                        )}
                      </div>
                      {restoreFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRestoreFile(null)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Restore Actions */}
                <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      restoreFile ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )} />
                    <span className="text-xs text-muted-foreground">
                      {restoreFile ? 'File siap untuk di-restore' : 'Pilih file backup terlebih dahulu'}
                    </span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={!restoreFile || isRestoring} className="rounded-xl">
                        {isRestoring ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-1.5" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-1.5" /> Restore Database
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                            <Shield className="h-4 w-4 text-destructive" />
                          </div>
                          Konfirmasi Restore Database
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini akan menimpa seluruh database yang ada. Data yang sudah ada akan hilang dan diganti dengan data dari file backup. Tindakan ini TIDAK DAPAT dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      {restoreFile && (
                        <div className="rounded-lg border bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">File yang akan di-restore:</p>
                          <p className="text-sm font-medium mt-0.5">{restoreFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(restoreFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      )}
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white hover:bg-destructive/90"
                          onClick={handleRestore}
                        >
                          Ya, Restore Database
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Penomoran Surat */}
        <TabsContent value="penomoran" className="mt-4">
          <div className="space-y-6">
            <Card className="animate-scale-in border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" /> Penomoran Surat</CardTitle>
                    <CardDescription>Kelola format dan penomoran surat otomatis untuk setiap jenis dokumen</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingDocNum(null)
                      setDocNumForm({ code: '', name: '', prefix: 'BKAD', digitCount: 3, isActive: true })
                      setDocNumDialogOpen(true)
                    }}
                    className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Tambah Jenis Surat
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Format Info */}
                <div className="mb-4 p-4 bg-muted/50 rounded-xl border border-border/50">
                  <div className="flex items-start gap-3">
                    <FileSignature className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Format Nomor Surat</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{prefix}'}/{'{kode}'}/{'{nomor}'}/{'{bulan}'}/{'{tahun}'}</code>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Contoh: <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">BKAD/SRV/001/03/2026</code> atau <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">bkad/srv/001/03/2026</code>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Prefix dan kode bebas menggunakan huruf kecil maupun kapital sesuai pengaturan admin. Nomor akan bertambah otomatis setiap kali dokumen dicetak. Counter reset setiap tahun baru.
                      </p>
                    </div>
                  </div>
                </div>

                {loadingDocNums ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : docNumberings.length === 0 ? (
                  <div className="text-center py-12">
                    <Hash className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada jenis surat yang dikonfigurasi</p>
                    <p className="text-xs text-muted-foreground mt-1">Klik "Tambah Jenis Surat" untuk memulai</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">No</TableHead>
                          <TableHead>Kode</TableHead>
                          <TableHead>Nama Surat</TableHead>
                          <TableHead>Prefix</TableHead>
                          <TableHead className="text-center">Digit</TableHead>
                          <TableHead className="text-center">Counter</TableHead>
                          <TableHead className="text-center">Tahun</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Preview</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {docNumberings.map((doc: any, idx: number) => {
                          const previewNum = String(doc.currentNumber + 1).padStart(doc.digitCount, '0')
                          const previewMonth = String(new Date().getMonth() + 1).padStart(2, '0')
                          const previewYear = new Date().getFullYear()
                          const preview = `${doc.prefix}/${doc.code}/${previewNum}/${previewMonth}/${previewYear}`
                          return (
                            <TableRow key={doc.id}>
                              <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell><Badge variant="outline" className="font-mono text-xs">{doc.code}</Badge></TableCell>
                              <TableCell className="font-medium">{doc.name}</TableCell>
                              <TableCell className="text-muted-foreground font-mono text-xs">{doc.prefix}</TableCell>
                              <TableCell className="text-center">{doc.digitCount}</TableCell>
                              <TableCell className="text-center font-mono font-semibold">{doc.currentNumber}</TableCell>
                              <TableCell className="text-center text-muted-foreground">{doc.lastYear}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={doc.isActive ? 'default' : 'secondary'} className="text-xs">
                                  {doc.isActive ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-teal-700 dark:text-teal-400">{preview}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Reset Counter" onClick={() => resetDocNum.mutate({ id: doc.id, currentNumber: 0 })}>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => handleEditDocNum(doc)}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Hapus">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Hapus Jenis Surat</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Yakin ingin menghapus jenis surat <strong>{doc.name}</strong> ({doc.code})? Tindakan ini tidak dapat dibatalkan.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteDocNum.mutate(doc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Numbering Dialog */}
            <Dialog open={docNumDialogOpen} onOpenChange={setDocNumDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    {editingDocNum ? 'Edit Jenis Surat' : 'Tambah Jenis Surat'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDocNum ? 'Ubah konfigurasi jenis surat' : 'Tambahkan jenis surat baru untuk penomoran otomatis'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="doc_code">Kode Surat *</Label>
                      <Input
                        id="doc_code"
                        placeholder="SRV"
                        value={docNumForm.code}
                        onChange={(e) => setDocNumForm(s => ({ ...s, code: e.target.value.replace(/\s/g, '') }))}
                        disabled={!!editingDocNum}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">Kode unik (bebas huruf kecil/besar, tanpa spasi)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc_name">Nama Surat *</Label>
                      <Input
                        id="doc_name"
                        placeholder="Surat Service Kendaraan"
                        value={docNumForm.name}
                        onChange={(e) => setDocNumForm(s => ({ ...s, name: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="doc_prefix">Prefix</Label>
                      <Input
                        id="doc_prefix"
                        placeholder="bkad"
                        value={docNumForm.prefix}
                        onChange={(e) => setDocNumForm(s => ({ ...s, prefix: e.target.value.replace(/\s/g, '') }))}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">Awalan nomor surat (bebas huruf kecil/besar, tanpa spasi)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc_digits">Jumlah Digit</Label>
                      <Select value={docNumForm.digitCount.toString()} onValueChange={(v) => setDocNumForm(s => ({ ...s, digitCount: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 digit (01-99)</SelectItem>
                          <SelectItem value="3">3 digit (001-999)</SelectItem>
                          <SelectItem value="4">4 digit (0001-9999)</SelectItem>
                          <SelectItem value="5">5 digit (00001-99999)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Status Aktif</Label>
                      <p className="text-xs text-muted-foreground">Aktifkan penomoran otomatis untuk jenis surat ini</p>
                    </div>
                    <Switch
                      checked={docNumForm.isActive}
                      onCheckedChange={(checked) => setDocNumForm(s => ({ ...s, isActive: checked }))}
                    />
                  </div>
                  {/* Preview */}
                  <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Preview nomor surat berikutnya:</p>
                    <p className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-400">
                      {docNumForm.prefix || 'BKAD'}/{docNumForm.code || 'XXX'}/{String(1).padStart(docNumForm.digitCount, '0')}/{String(new Date().getMonth() + 1).padStart(2, '0')}/{new Date().getFullYear()}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDocNumDialogOpen(false)}>Batal</Button>
                  <Button
                    onClick={handleDocNumFormSubmit}
                    disabled={!docNumForm.code || !docNumForm.name || createDocNum.isPending || updateDocNum.isPending}
                    className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {editingDocNum ? 'Simpan Perubahan' : 'Tambah Jenis Surat'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* Tab: Pergantian Tahun */}
        <TabsContent value="tahun" className="mt-4">
          <div className="space-y-6">
            <Card className="animate-fade-in animate-stagger-1 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Pergantian Tahun Anggaran</CardTitle>
                <CardDescription>Kelola pergantian tahun dan inisialisasi anggaran baru</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-medium">Tahun Aktif Saat Ini</p>
                    <p className="text-3xl font-bold text-primary">{localSettings.tahun_aktif || new Date().getFullYear()}</p>
                  </div>
                  <Badge variant="outline" className="text-sm">Aktif</Badge>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Generate Tahun Baru</h3>
                    <p className="text-xs text-muted-foreground">Buat anggaran dan data untuk tahun baru berdasarkan data tahun sebelumnya</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch id="copy-budget" defaultChecked />
                        <Label htmlFor="copy-budget" className="text-sm">Salin Anggaran</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">Salin total anggaran dari tahun sebelumnya ke tahun baru</p>
                    </div>
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch id="reset-stats" />
                        <Label htmlFor="reset-stats" className="text-sm">Reset Statistik</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">Reset realisasi anggaran menjadi 0 untuk tahun baru</p>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" variant="outline">
                        <Calendar className="h-4 w-4 mr-1" /> Generate Tahun {parseInt(localSettings.tahun_aktif || '2025') + 1}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Generate Tahun Baru</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini akan membuat data anggaran baru untuk tahun {parseInt(localSettings.tahun_aktif || '2025') + 1}.
                          Tahun aktif akan diubah menjadi {parseInt(localSettings.tahun_aktif || '2025') + 1}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction>Generate</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in animate-stagger-2 border border-border/50 shadow-sm rounded-2xl card-hover">
              <CardHeader>
                <CardTitle>Informasi Tahun {localSettings.tahun_aktif || new Date().getFullYear()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/50 p-3 text-center bg-muted/30">
                    <p className="text-xs text-muted-foreground">Kendaraan Terdaftar</p>
                    <p className="text-2xl font-bold">{backupInfo?.stats?.vehicles || 0}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 p-3 text-center bg-muted/30">
                    <p className="text-xs text-muted-foreground">Service Dilakukan</p>
                    <p className="text-2xl font-bold">{backupInfo?.stats?.services || 0}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 p-3 text-center bg-muted/30">
                    <p className="text-xs text-muted-foreground">Bengkel Aktif</p>
                    <p className="text-2xl font-bold">{backupInfo?.stats?.workshops || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* E-Signature Dialog */}
      <ESignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        userId={authUser?.id || ''}
        userName={authUser?.name}
        showTTEOption={true}
        onSaveSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['user-signature', authUser?.id] })
          queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
        }}
      />
    </div>
  )
}
