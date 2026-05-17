'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileBarChart, Download, Printer, Filter, Calendar, DollarSign, Wrench, Car,
  CheckCircle, XCircle, Clock, BarChart3, PieChart as PieChartIcon,
  Bike, Truck, TrendingUp, Wallet, FileText, Stamp, Shield, ScrollText, Eye,
  Building2, Hash, ClipboardCheck, Archive, ImageIcon, ListChecks
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { generateQRDataURL } from '@/lib/qrcode-helper'

const STATUS_COLORS: Record<string, string> = {
  DIAJUKAN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DISETUJUI: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  DITOLAK: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  DIPROSES: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PENDING: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  SELESAI: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PENGAJUAN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  MENUNGGU_PERSETUJUAN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
}

const STATUS_LABELS: Record<string, string> = {
  DIAJUKAN: 'Diajukan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  DIPROSES: 'Diproses',
  PENDING: 'Pending',
  SELESAI: 'Selesai',
  PENGAJUAN: 'Pengajuan',
  MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan',
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#6366f1']

const JENIS_KENDARAAN_COLORS: Record<string, string> = {
  RODA_2: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  RODA_4: 'text-amber-600 bg-amber-50 border-amber-200',
}

const months = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
  { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
]

type KategoriLaporan = 'semua' | 'per_nopol' | 'per_bengkel' | 'per_skpd' | 'per_jenis_kendaraan' | 'per_status'

const KATEGORI_OPTIONS: { value: KategoriLaporan; label: string; icon: React.ReactNode }[] = [
  { value: 'semua', label: 'Semua', icon: <FileText className="h-4 w-4" /> },
  { value: 'per_nopol', label: 'Per Nopol', icon: <Car className="h-4 w-4" /> },
  { value: 'per_bengkel', label: 'Per Bengkel', icon: <Building2 className="h-4 w-4" /> },
  { value: 'per_skpd', label: 'Per SKPD/Bidang', icon: <Hash className="h-4 w-4" /> },
  { value: 'per_jenis_kendaraan', label: 'Per Jenis Kendaraan', icon: <Bike className="h-4 w-4" /> },
  { value: 'per_status', label: 'Per Status', icon: <ClipboardCheck className="h-4 w-4" /> },
]

export function LaporanPage() {
  const [reportType, setReportType] = useState('tahunan')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString())
  const [triwulan, setTriwulan] = useState('1')
  const [semester, setSemester] = useState('1')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [filterBengkel, setFilterBengkel] = useState('all')
  const [filterJenisKendaraan, setFilterJenisKendaraan] = useState('all')
  const [filterStatusService, setFilterStatusService] = useState('all')
  const [filterJenisService, setFilterJenisService] = useState('all')
  const [filterSkpd, setFilterSkpd] = useState('all')
  const [activeTab, setActiveTab] = useState('preview')
  const [kategoriLaporan, setKategoriLaporan] = useState<KategoriLaporan>('semua')
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printItemsDialogOpen, setPrintItemsDialogOpen] = useState(false)
  const [printItemsSignature, setPrintItemsSignature] = useState(true)
  const [printSections, setPrintSections] = useState({
    summary: true,
    budget: true,
    detailTable: true,
    photos: true,
    signature: true,
  })

  // Fetch vehicles and workshops for filters
  const { data: vehiclesRaw } = useQuery({
    queryKey: ['vehicles-laporan'],
    queryFn: async () => { const res = await fetch('/api/kendaraan?limit=100'); return res.json() },
  })
  const vehicles = Array.isArray(vehiclesRaw?.data) ? vehiclesRaw.data : []

  const { data: workshopsRaw } = useQuery({
    queryKey: ['workshops-laporan'],
    queryFn: async () => { const res = await fetch('/api/bengkel?limit=100'); return res.json() },
  })
  const workshops = Array.isArray(workshopsRaw?.data) ? workshopsRaw.data : []

  // Fetch app settings for kop surat and signatures
  const { data: settingsRaw } = useQuery({
    queryKey: ['settings-laporan'],
    queryFn: async () => { const res = await fetch('/api/pengaturan'); return res.json() },
  })
  const settings = (settingsRaw || {}) as Record<string, string>

  // Fetch Kepala BKAD signature for print documents
  const [kepalaSignature, setKepalaSignature] = useState<string | null>(null)
  const kepalaSigFetched = useRef(false)
  useEffect(() => {
    if (kepalaSigFetched.current) return
    kepalaSigFetched.current = true
    // Fetch all users with PIMPINAN role to find Kepala BKAD's signature
    fetch('/api/pengaturan/users')
      .then(r => r.json())
      .then(users => {
        const pimpinanUsers = Array.isArray(users) ? users.filter((u: any) => u.role === 'PIMPINAN') : []
        // Also check for SUPER_ADMIN/ADMIN as fallback
        const sigCandidates = pimpinanUsers.length > 0 ? pimpinanUsers : (Array.isArray(users) ? users.filter((u: any) => ['SUPER_ADMIN', 'ADMIN'].includes(u.role)) : [])
        if (sigCandidates.length > 0) {
          // Try to get signature for the first eligible user
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

  // Generate QR code data URL for print documents
  // (will be regenerated at print time with actual document verification URL)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  useEffect(() => {
    // Default QR pointing to app origin (placeholder until print generates specific one)
    generateQRDataURL(window.location.origin, 150).then(setQrDataUrl).catch(() => {})
  }, [])

  // Extract unique SKPD/Bidang from vehicles
  const skpdOptions = useMemo(() => {
    const skpds = new Set<string>()
    vehicles.forEach((v: any) => {
      if (v.skpdBidang) skpds.add(v.skpdBidang)
    })
    return Array.from(skpds).sort()
  }, [vehicles])

  // Auto-set filters based on kategori
  const effectiveVehicleId = kategoriLaporan === 'per_nopol' && filterVehicle !== 'all' ? filterVehicle : undefined
  const effectiveBengkelId = kategoriLaporan === 'per_bengkel' && filterBengkel !== 'all' ? filterBengkel : undefined
  const effectiveJenisKendaraan = kategoriLaporan === 'per_jenis_kendaraan' && filterJenisKendaraan !== 'all' ? filterJenisKendaraan : (filterJenisKendaraan !== 'all' ? filterJenisKendaraan : undefined)
  const effectiveStatusService = kategoriLaporan === 'per_status' && filterStatusService !== 'all' ? filterStatusService : (filterStatusService !== 'all' ? filterStatusService : undefined)
  const effectiveSkpd = kategoriLaporan === 'per_skpd' && filterSkpd !== 'all' ? filterSkpd : undefined

  // Fetch report data
  const { data, isLoading } = useQuery({
    queryKey: ['laporan', reportType, year, month, triwulan, semester, dateFrom, dateTo, effectiveVehicleId, effectiveBengkelId, effectiveJenisKendaraan, effectiveStatusService, filterJenisService, effectiveSkpd, kategoriLaporan],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('type', reportType)
      params.set('year', year)
      if (reportType === 'bulanan') params.set('month', month)
      if (reportType === 'triwulan') params.set('triwulan', triwulan)
      if (reportType === 'semester') params.set('semester', semester)
      if (reportType === 'custom') {
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
      }
      if (effectiveVehicleId) params.set('vehicleId', effectiveVehicleId)
      if (effectiveBengkelId) params.set('bengkelId', effectiveBengkelId)
      if (effectiveJenisKendaraan) params.set('jenisKendaraan', effectiveJenisKendaraan)
      if (effectiveStatusService) params.set('statusService', effectiveStatusService)
      if (filterJenisService !== 'all') params.set('jenisService', filterJenisService)
      if (effectiveSkpd) params.set('skpdBidang', effectiveSkpd)
      const res = await fetch(`/api/laporan?${params}`)
      return res.json()
    },
  })

  const formatRupiah = useCallback((value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value), [])

  const formatDate = useCallback((date: string) =>
    new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), [])

  const formatShortDate = useCallback((date: string) =>
    new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }), [])

  // Pie chart data for status distribution
  const statusPieData = useMemo(() => {
    if (!data?.statistics?.statusDistribution) return []
    return Object.entries(data.statistics.statusDistribution).map(([name, value]) => ({ name, value: value as number }))
  }, [data])

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    if (!Array.isArray(data?.statistics?.monthlyBreakdown)) return []
    return data.statistics.monthlyBreakdown.map((m: any) => ({
      ...m,
      monthLabel: new Date(m.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
    }))
  }, [data])

  // Budget comparison chart data (Roda 2 vs Roda 4)
  const budgetComparisonData = useMemo(() => {
    if (!data?.statistics?.budgetByType) return []
    const { RODA_2, RODA_4 } = data.statistics.budgetByType
    return [
      { name: 'Anggaran', roda2: RODA_2.totalAnggaran, roda4: RODA_4.totalAnggaran },
      { name: 'Realisasi', roda2: RODA_2.realisasi, roda4: RODA_4.realisasi },
      { name: 'Sisa', roda2: RODA_2.sisaAnggaran, roda4: RODA_4.sisaAnggaran },
    ]
  }, [data])

  // Monthly by type chart data
  const monthlyByTypeData = useMemo(() => {
    if (!Array.isArray(data?.statistics?.monthlyByType)) return []
    return data.statistics.monthlyByType.map((m: any) => ({
      ...m,
      monthLabel: new Date(m.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
    }))
  }, [data])

  // Filter services by SKPD if needed
  const filteredServices = useMemo(() => {
    const services = Array.isArray(data?.services) ? data.services : []
    if (kategoriLaporan === 'per_skpd' && filterSkpd !== 'all') {
      return services.filter((s: any) => s.vehicle?.skpdBidang === filterSkpd)
    }
    return services
  }, [data?.services, kategoriLaporan, filterSkpd])

  // Get report title based on kategori
  const getReportTitle = useCallback(() => {
    const base = 'LAPORAN SERVICE KENDARAAN OPERASIONAL'
    switch (kategoriLaporan) {
      case 'per_nopol': {
        const v = vehicles.find((v: any) => v.id === filterVehicle)
        return v ? `${base} PER NOPOL (${v.nomorPolisi})` : `${base} PER NOPOL`
      }
      case 'per_bengkel': {
        const w = workshops.find((w: any) => w.id === filterBengkel)
        return w ? `${base} PER BENGKEL (${w.namaBengkel})` : `${base} PER BENGKEL`
      }
      case 'per_skpd': {
        return filterSkpd !== 'all' ? `${base} PER SKPD/BIDANG (${filterSkpd})` : `${base} PER SKPD/BIDANG`
      }
      case 'per_jenis_kendaraan': {
        const jenis = filterJenisKendaraan === 'RODA_2' ? 'Roda 2' : filterJenisKendaraan === 'RODA_4' ? 'Roda 4' : 'Semua Jenis'
        return `${base} PER JENIS KENDARAAN (${jenis})`
      }
      case 'per_status': {
        const status = filterStatusService !== 'all' ? STATUS_LABELS[filterStatusService] || filterStatusService : 'Semua Status'
        return `${base} PER STATUS (${status})`
      }
      default:
        return base
    }
  }, [kategoriLaporan, filterVehicle, filterBengkel, filterSkpd, filterJenisKendaraan, filterStatusService, vehicles, workshops])

  // Generate document number from API
  const generateDocNumber = useCallback(async (code: string) => {
    try {
      const res = await fetch('/api/document-numbering/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.documentNumber as string
      }
    } catch {}
    // Fallback
    const now = new Date()
    const yr = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const seq = String(Math.floor(Math.random() * 900) + 100)
    return `${seq}/BKAD/${code}/${mo}/${yr}`
  }, [])

  // Get period label
  const getPeriodLabel = useCallback(() => {
    const yearLabel = `Tahun ${year}`
    switch (reportType) {
      case 'bulanan': return `${months.find(m => m.value === month)?.label || ''} ${yearLabel}`
      case 'triwulan': return `Triwulan ${triwulan} ${yearLabel}`
      case 'semester': return `Semester ${semester} ${yearLabel}`
      case 'custom': {
        if (dateFrom && dateTo) return `${formatShortDate(dateFrom)} s/d ${formatShortDate(dateTo)}`
        return yearLabel
      }
      default: return yearLabel
    }
  }, [reportType, year, month, triwulan, semester, dateFrom, dateTo, formatShortDate])

  const handleExport = async (format: string) => {
    try {
      toast.loading(`Mengunduh laporan ${format.toUpperCase()}...`, { id: 'export' })
      const res = await fetch('/api/laporan/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          filters: {
            type: reportType, year, month, triwulan, semester, dateFrom, dateTo,
            vehicleId: effectiveVehicleId,
            bengkelId: effectiveBengkelId,
            jenisKendaraan: effectiveJenisKendaraan,
            statusService: effectiveStatusService,
            jenisService: filterJenisService !== 'all' ? filterJenisService : undefined,
            skpdBidang: effectiveSkpd,
          },
        }),
      })

      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisp = res.headers.get('Content-Disposition')
      a.download = contentDisp ? contentDisp.split('filename=')[1]?.replace(/"/g, '') : `laporan-service.${format === 'excel' ? 'csv' : 'html'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Laporan ${format.toUpperCase()} berhasil diunduh`, { id: 'export' })
    } catch (error) {
      toast.error('Gagal mengunduh laporan', { id: 'export' })
    }
  }

  const handlePrintReport = useCallback(async () => {
    const stats = data?.statistics
    const services = filteredServices
    const docNumber = await generateDocNumber('LAP')
    const reportTitle = getReportTitle()
    const periodLabel = getPeriodLabel()
    const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    // Generate QR code dynamically with verification URL
    const verifyUrl = `${window.location.origin}/verify`
    let printQrDataUrl = qrDataUrl
    try {
      const generated = await generateQRDataURL(verifyUrl, 150)
      if (generated) printQrDataUrl = generated
    } catch {}

    const totalBiayaService = services.reduce((sum: number, s: any) => sum + (s.totalBiaya || 0), 0)
    const selesaiCount = services.filter((s: any) => s.statusService === 'SELESAI').length
    const prosesCount = services.filter((s: any) => ['DIPROSES', 'DISETUJUI', 'DIAJUKAN', 'PENGAJUAN', 'MENUNGGU_PERSETUJUAN'].includes(s.statusService)).length
    const ditolakCount = services.filter((s: any) => s.statusService === 'DITOLAK').length

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${reportTitle}</title>
<style>
  @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; position: relative; }

  /* KOP SURAT */
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

  /* DOCUMENT INFO */
  .doc-info { text-align: center; margin: 18px 0 14px 0; }
  .doc-title { font-size: 13pt; font-weight: bold; letter-spacing: 1px; margin-bottom: 6px; }
  .doc-meta { font-size: 9.5pt; color: #444; line-height: 1.6; }
  .doc-meta span { margin: 0 8px; }

  /* SUMMARY CARDS */
  .summary-section { margin: 14px 0; }
  .summary-title { font-size: 10pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
  .summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; text-align: center; background: #fafafa; }
  .summary-card-icon { width: 28px; height: 28px; border-radius: 50%; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; font-size: 12pt; font-weight: bold; }
  .summary-card-label { font-size: 7.5pt; color: #666; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
  .summary-card-value { font-size: 11pt; font-weight: bold; color: #1a1a1a; }

  /* BUDGET CARDS */
  .budget-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .budget-card { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; background: #fafafa; }
  .budget-card-title { font-size: 9pt; font-weight: bold; margin-bottom: 4px; padding-bottom: 3px; border-bottom: 1px solid #eee; }
  .budget-row { display: flex; justify-content: space-between; font-size: 9pt; padding: 2px 0; }
  .budget-row-label { color: #555; }
  .budget-row-value { font-weight: 600; }

  /* TABLE */
  .data-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9pt; }
  .data-table thead th { background: #2c3e50; color: #fff; padding: 7px 6px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; }
  .data-table thead th.right { text-align: right; }
  .data-table thead th.center { text-align: center; }
  .data-table tbody td { padding: 5px 6px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  .data-table tbody tr:nth-child(even) { background: #f8f9fa; }
  .data-table tbody tr:nth-child(odd) { background: #fff; }
  .data-table tfoot td { padding: 7px 6px; font-weight: bold; border-top: 2px solid #2c3e50; background: #ecf0f1; font-size: 9pt; }
  .status-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; font-weight: 600; }
  .status-SELESAI { background: #d4edda; color: #155724; }
  .status-DIPROSES { background: #fff3cd; color: #856404; }
  .status-DIAJUKAN { background: #cce5ff; color: #004085; }
  .status-DISETUJUI { background: #d1ecf1; color: #0c5460; }
  .status-DITOLAK { background: #f8d7da; color: #721c24; }
  .status-PENDING { background: #ffeaa7; color: #6c5ce7; }
  .status-PENGAJUAN { background: #e8daef; color: #6c3483; }
  .status-MENUNGGU_PERSETUJUAN { background: #d6eaf8; color: #2e4053; }
  .jenis-badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 7.5pt; font-weight: 600; }
  .jenis-RODA_2 { background: #d5f5e3; color: #1e8449; }
  .jenis-RODA_4 { background: #fdebd0; color: #b9770e; }

  /* SIGNATURE */
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

  /* PHOTOS */
  .photo-section { margin: 14px 0; }
  .photo-section-title { font-size: 10pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .photo-service-block { page-break-inside: avoid; margin-bottom: 16px; border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px; background: #fafafa; }
  .photo-service-header { font-size: 9.5pt; font-weight: bold; margin-bottom: 8px; color: #2c3e50; border-bottom: 1px dashed #ccc; padding-bottom: 4px; }
  .photo-item-block { margin-bottom: 8px; margin-left: 12px; }
  .photo-item-name { font-size: 8.5pt; font-weight: 600; color: #444; margin-bottom: 4px; }
  .photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .photo-thumb { text-align: center; }
  .photo-thumb img { width: 120px; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; }
  .photo-caption { font-size: 7pt; color: #888; margin-top: 2px; }

  /* FOOTER */
  .doc-footer { margin-top: 30px; padding-top: 8px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 7.5pt; color: #888; }
  .doc-footer-center { text-align: center; font-style: italic; }

  @media print {
    body { margin: 0; padding: 0; background: #fff; }
    .page { margin: 0; width: 100%; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- KOP SURAT -->
  <div class="kop-surat">
    <div class="kop-content">
      <div class="kop-logo">
        ${(settings.app_print_logo || settings.app_logo) ? `<img src="${window.location.origin}${settings.app_print_logo || settings.app_logo}" style="width:60px;height:60px;border-radius:0;object-fit:contain;" />` : `<div class="kop-logo-inner">LOGO</div>`}
      </div>
      <div class="kop-text">
        <div class="kop-line1">${settings.app_kop_line1 || 'PEMERINTAH KABUPATEN/KOTA'}</div>
        <div class="kop-line2">${settings.app_kop_line2 || 'BADAN KEUANGAN DAN ASET DAERAH'}</div>
        <div class="kop-line3">${settings.app_kop_line3 || 'UNIT LAYANAN PENGADAAN'}</div>
        <div class="kop-address">${settings.app_address || 'Jl. Merdeka No. 1, Kota Selatan | Telp. (021) 123-4567 | Email: bkad@pemda.go.id'}</div>
      </div>
    </div>
    <div class="kop-border"><div class="kop-border-inner"></div></div>
  </div>

  <!-- DOCUMENT INFO -->
  <div class="doc-info">
    <div class="doc-title">${reportTitle}</div>
    <div class="doc-meta">
      Nomor Surat: ${docNumber}<span>|</span>Periode: ${periodLabel}<br/>
      Tanggal Cetak: ${printDate}
    </div>
  </div>

  ${printSections.summary ? `
  <!-- RINGKASAN -->
  <div class="summary-section">
    <div class="summary-title">Ringkasan</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-icon" style="background:#e8f5e9;color:#2e7d32;">$</div>
        <div class="summary-card-label">Total Biaya</div>
        <div class="summary-card-value">${formatRupiah(stats?.totalBiaya || totalBiayaService)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-icon" style="background:#e3f2fd;color:#1565c0;">&#9881;</div>
        <div class="summary-card-label">Total Service</div>
        <div class="summary-card-value">${services.length}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-icon" style="background:#e8f5e9;color:#2e7d32;">&#10003;</div>
        <div class="summary-card-label">Selesai</div>
        <div class="summary-card-value">${selesaiCount}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-icon" style="background:#fff8e1;color:#f57f17;">&#8635;</div>
        <div class="summary-card-label">Dalam Proses</div>
        <div class="summary-card-value">${prosesCount}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-icon" style="background:#ffebee;color:#c62828;">&#10007;</div>
        <div class="summary-card-label">Ditolak</div>
        <div class="summary-card-value">${ditolakCount}</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${printSections.budget ? `
  <!-- RINGKASAN ANGGARAN -->
  <div class="summary-section">
    <div class="summary-title">Ringkasan Anggaran Tahun ${year}</div>
    <div class="budget-grid">
      <div class="budget-card">
        <div class="budget-card-title" style="color:#b9770e;">&#128663; Roda 4</div>
        <div class="budget-row"><span class="budget-row-label">Anggaran</span><span class="budget-row-value">${formatRupiah(stats?.budgetByType?.RODA_4?.totalAnggaran || 0)}</span></div>
        <div class="budget-row"><span class="budget-row-label">Realisasi</span><span class="budget-row-value" style="color:#b9770e;">${formatRupiah(stats?.budgetByType?.RODA_4?.realisasi || 0)}</span></div>
        <div class="budget-row"><span class="budget-row-label">Sisa</span><span class="budget-row-value" style="color:${(stats?.budgetByType?.RODA_4?.sisaAnggaran || 0) >= 0 ? '#2e7d32' : '#c62828'};">${formatRupiah(stats?.budgetByType?.RODA_4?.sisaAnggaran || 0)}</span></div>
      </div>
      <div class="budget-card">
        <div class="budget-card-title" style="color:#1e8449;">&#128663; Roda 2</div>
        <div class="budget-row"><span class="budget-row-label">Anggaran</span><span class="budget-row-value">${formatRupiah(stats?.budgetByType?.RODA_2?.totalAnggaran || 0)}</span></div>
        <div class="budget-row"><span class="budget-row-label">Realisasi</span><span class="budget-row-value" style="color:#1e8449;">${formatRupiah(stats?.budgetByType?.RODA_2?.realisasi || 0)}</span></div>
        <div class="budget-row"><span class="budget-row-label">Sisa</span><span class="budget-row-value" style="color:${(stats?.budgetByType?.RODA_2?.sisaAnggaran || 0) >= 0 ? '#2e7d32' : '#c62828'};">${formatRupiah(stats?.budgetByType?.RODA_2?.sisaAnggaran || 0)}</span></div>
      </div>
      <div class="budget-card">
        <div class="budget-card-title">Total Keseluruhan</div>
        <div class="budget-row"><span class="budget-row-label">Anggaran</span><span class="budget-row-value">${formatRupiah(stats?.totalAnggaran || 0)}</span></div>
        <div class="budget-row"><span class="budget-row-label">Realisasi</span><span class="budget-row-value">${formatRupiah(stats?.totalRealisasi || 0)}</span></div>
        <div class="budget-row"><span class="budget-row-label">Sisa</span><span class="budget-row-value" style="color:${(stats?.sisaAnggaran || 0) >= 0 ? '#2e7d32' : '#c62828'};">${formatRupiah(stats?.sisaAnggaran || 0)}</span></div>
      </div>
    </div>
  </div>
  ` : ''}

  ${printSections.detailTable ? `
  <!-- DATA TABLE -->
  <div class="summary-section">
    <div class="summary-title">Data Service Kendaraan</div>
    <table class="data-table">
      <thead>
        <tr>
          <th class="center" style="width:30px;">No</th>
          <th>Nomor Service</th>
          <th>Tanggal</th>
          <th>Nopol</th>
          <th>Kendaraan</th>
          <th class="center">Jenis</th>
          <th class="center">Jns Kend.</th>
          <th>SKPD/Bidang</th>
          <th>Bengkel</th>
          <th class="right">Biaya</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>
        ${services.length === 0 ? `
          <tr><td colspan="11" style="text-align:center;padding:20px;color:#888;">Tidak ada data service untuk periode ini</td></tr>
        ` : services.map((s: any, i: number) => `
          <tr>
            <td class="center">${i + 1}</td>
            <td>${s.nomorService || '-'}</td>
            <td>${s.tanggalService ? new Date(s.tanggalService).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
            <td>${s.vehicle?.nomorPolisi || '-'}</td>
            <td>${s.vehicle?.merk || ''} ${s.vehicle?.type || ''}</td>
            <td class="center">${s.jenisService || '-'}</td>
            <td class="center"><span class="jenis-badge jenis-${s.vehicle?.jenisKendaraan || ''}">${s.vehicle?.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}</span></td>
            <td>${s.vehicle?.skpdBidang || '-'}</td>
            <td>${s.bengkel?.namaBengkel || '-'}</td>
            <td class="right" style="font-weight:600;">${formatRupiah(s.totalBiaya || 0)}</td>
            <td class="center"><span class="status-badge status-${s.statusService}">${STATUS_LABELS[s.statusService] || s.statusService}</span></td>
          </tr>
        `).join('')}
      </tbody>
      ${services.length > 0 ? `
      <tfoot>
        <tr>
          <td colspan="9" style="text-align:right;font-weight:bold;">TOTAL</td>
          <td class="right" style="font-weight:bold;">${formatRupiah(totalBiayaService)}</td>
          <td></td>
        </tr>
      </tfoot>
      ` : ''}
    </table>
  </div>
  ` : ''}

  ${printSections.photos ? `
  <!-- FOTO PERBAIKAN ITEM -->
  <div class="photo-section">
    <div class="photo-section-title">Foto Perbaikan Item</div>
    ${services.filter((s: any) => {
      const items = Array.isArray(s.items) ? s.items : []
      return items.some((item: any) => Array.isArray(item.photos) && item.photos.length > 0)
    }).length === 0 ? `
      <div style="text-align:center;padding:16px;color:#888;font-size:9pt;">Tidak ada foto perbaikan item pada periode ini</div>
    ` : ''}
    ${services.filter((s: any) => {
      const items = Array.isArray(s.items) ? s.items : []
      return items.some((item: any) => Array.isArray(item.photos) && item.photos.length > 0)
    }).map((s: any, svcIdx: number) => {
      const items = Array.isArray(s.items) ? s.items : []
      const itemsWithPhotos = items.filter((item: any) => Array.isArray(item.photos) && item.photos.length > 0)
      return `
    <div class="photo-service-block">
      <div class="photo-service-header">${svcIdx + 1}. ${s.vehicle?.nomorPolisi || '-'} — ${s.nomorService || '-'}</div>
      ${itemsWithPhotos.map((item: any) => `
        <div class="photo-item-block">
          <div class="photo-item-name">&#8226; ${item.itemName || 'Item'}</div>
          <div class="photo-grid">
            ${item.photos.map((photo: any) => `
              <div class="photo-thumb">
                <img src="${window.location.origin}${photo.filePath}" alt="${photo.fileName || 'Foto'}" />
                <div class="photo-caption">${s.nomorService || ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    `}).join('')}
  </div>
  ` : ''}

  ${printSections.signature ? `
  <!-- SIGNATURE -->
  <div class="signature-section">
    <div class="sig-qr">
      ${printQrDataUrl ? `<img src="${printQrDataUrl}" alt="QR Code Verifikasi" style="width:120px;height:120px;" />` : `<div style="width:120px;height:120px;border:1px solid #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#888;">QR Code</div>`}
      <div class="sig-qr-label">Scan untuk verifikasi dokumen</div>
    </div>
    <div class="sig-block">
      <div class="sig-date">${settings.app_kabupaten_kota || settings.app_tempat_ttd || 'Kabupaten/Kota'}, ${printDate}</div>
      <div class="sig-jabatan">${settings.app_kepala_jabatan || 'Kepala BKAD'}</div>
      ${settings.app_tte_image 
        ? `<div style="height:70px;display:flex;align-items:flex-end;justify-content:center;"><img src="${window.location.origin}${settings.app_tte_image}" alt="Tanda Tangan Elektronik" style="max-height:70px;max-width:200px;object-fit:contain;" /></div>`
        : kepalaSignature 
          ? `<div style="height:60px;display:flex;align-items:flex-end;justify-content:center;"><img src="${kepalaSignature}" alt="Tanda Tangan" style="max-height:55px;max-width:180px;object-fit:contain;" /></div>`
          : `<div style="height:60px;"></div>`}
      <div class="sig-name">${settings.app_kepala_nama || '________________________'}</div>
      <div class="sig-nip">NIP. ${settings.app_kepala_nip || '________________________'}</div>
      ${settings.app_tte_image ? `<div class="sig-tte-label">Tanda Tangan Elektronik</div>` : ''}
    </div>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="doc-footer">
    <div>Dicetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</div>
    <div class="doc-footer-center">Dokumen ini merupakan laporan resmi dinas yang sah dan dapat dipertanggungjawabkan</div>
    <div>Halaman 1 dari 1</div>
  </div>

</div>
</body>
</html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
    toast.success('Laporan resmi berhasil dicetak')
    setPrintDialogOpen(false)
  }, [data, filteredServices, generateDocNumber, getReportTitle, getPeriodLabel, formatRupiah, printSections, settings, kepalaSignature, qrDataUrl])

  const handleDownloadPDF = useCallback(() => {
    // Use the same HTML for PDF download
    handlePrintReport()
  }, [handlePrintReport])

  const handlePrintItemsReport = useCallback(async () => {
    const services = filteredServices
    const docNumber = await generateDocNumber('LAP')
    const periodLabel = getPeriodLabel()
    const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    // Generate QR code dynamically with verification URL
    const verifyUrl = `${window.location.origin}/verify`
    let printQrDataUrl = qrDataUrl
    try {
      const generated = await generateQRDataURL(verifyUrl, 150)
      if (generated) printQrDataUrl = generated
    } catch {}

    // Filter services that have items
    const servicesWithItems = services.filter((s: any) => Array.isArray(s.items) && s.items.length > 0)

    // Calculate grand total
    const grandTotal = servicesWithItems.reduce((sum: number, s: any) => {
      const svcTotal = (Array.isArray(s.items) ? s.items : []).reduce((itemSum: number, item: any) => itemSum + (item.totalHarga || 0), 0)
      return sum + svcTotal
    }, 0)

    // Build KOP SURAT HTML
    const kopLogoHtml = (settings.app_print_logo || settings.app_logo)
      ? `<img src="${window.location.origin}${settings.app_print_logo || settings.app_logo}" style="width:60px;height:60px;border-radius:0;object-fit:contain;" />`
      : `<div class="kop-logo-inner">LOGO</div>`
    const kopHtml = `<div class="kop-surat"><div class="kop-content"><div class="kop-logo">${kopLogoHtml}</div><div class="kop-text"><div class="kop-line1">${settings.app_kop_line1 || 'PEMERINTAH KABUPATEN/KOTA'}</div><div class="kop-line2">${settings.app_kop_line2 || 'BADAN KEUANGAN DAN ASET DAERAH'}</div><div class="kop-line3">${settings.app_kop_line3 || 'UNIT LAYANAN PENGADAAN'}</div><div class="kop-address">${settings.app_address || 'Jl. Merdeka No. 1, Kota Selatan | Telp. (021) 123-4567 | Email: bkad@pemda.go.id'}</div></div></div><div class="kop-border"><div class="kop-border-inner"></div></div></div>`

    // Build service blocks HTML
    const serviceBlocksHtml = servicesWithItems.length === 0
      ? `<div style="text-align:center;padding:20px;color:#888;font-size:9pt;">Tidak ada data item perbaikan untuk periode ini</div>`
      : servicesWithItems.map((s: any, svcIdx: number) => {
          const items = Array.isArray(s.items) ? s.items : []
          const svcSubtotal = items.reduce((itemSum: number, item: any) => itemSum + (item.totalHarga || 0), 0)
          const itemRows = items.map((item: any, idx: number) =>
            `<tr><td class="center">${idx + 1}</td><td>${item.itemName || '-'}</td><td class="right">${item.quantity || 0}</td><td class="right">${formatRupiah(item.hargaSatuan || 0)}</td><td class="right" style="font-weight:600;">${formatRupiah(item.totalHarga || 0)}</td></tr>`
          ).join('')
          return `<div class="service-block"><div class="service-header"><span class="service-number">${svcIdx + 1}. ${s.nomorService || '-'}</span><span class="service-meta">${s.vehicle?.nomorPolisi || '-'} | ${s.vehicle?.merk || ''} ${s.vehicle?.type || ''} | ${s.bengkel?.namaBengkel || '-'} | ${STATUS_LABELS[s.statusService] || s.statusService} | ${s.tanggalService ? new Date(s.tanggalService).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} | Total: ${formatRupiah(s.totalBiaya || 0)}</span></div><table class="items-table"><thead><tr><th class="center" style="width:30px;">No</th><th>Nama Item</th><th class="right">Qty</th><th class="right">Harga Satuan</th><th class="right">Total Harga</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr><td colspan="4" style="text-align:right;">Subtotal</td><td class="right">${formatRupiah(svcSubtotal)}</td></tr></tfoot></table></div>`
        }).join('')

    // Build signature HTML
    const sigHtml = printItemsSignature
      ? `<div class="signature-section"><div class="sig-qr">${printQrDataUrl ? `<img src="${printQrDataUrl}" alt="QR Code Verifikasi" style="width:120px;height:120px;" />` : `<div style="width:120px;height:120px;border:1px solid #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#888;">QR Code</div>`}<div style="font-size:7.5pt;color:#555;margin-top:4px;line-height:1.3;">Scan untuk verifikasi dokumen</div></div><div class="sig-block"><div class="sig-date">${settings.app_kabupaten_kota || settings.app_tempat_ttd || 'Kabupaten/Kota'}, ${printDate}</div><div class="sig-jabatan">${settings.app_kepala_jabatan || 'Kepala BKAD'}</div>${settings.app_tte_image ? `<div style="height:70px;display:flex;align-items:flex-end;justify-content:center;"><img src="${window.location.origin}${settings.app_tte_image}" alt="Tanda Tangan Elektronik" style="max-height:70px;max-width:200px;object-fit:contain;" /></div>` : kepalaSignature ? `<div style="height:60px;display:flex;align-items:flex-end;justify-content:center;"><img src="${kepalaSignature}" alt="Tanda Tangan" style="max-height:55px;max-width:180px;object-fit:contain;" /></div>` : `<div style="height:60px;"></div>`}<div class="sig-name">${settings.app_kepala_nama || '________________________'}</div><div class="sig-nip">NIP. ${settings.app_kepala_nip || '________________________'}</div>${settings.app_tte_image ? `<div class="sig-tte-label">Tanda Tangan Elektronik</div>` : ''}</div></div>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laporan Detail Item Perbaikan Kendaraan</title>
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
  .service-block { page-break-inside: avoid; margin-bottom: 20px; border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; }
  .service-header { background: #f8f9fa; padding: 8px 12px; border-bottom: 1px solid #e5e5e5; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .service-number { font-size: 9.5pt; font-weight: bold; color: #2c3e50; }
  .service-meta { font-size: 8pt; color: #666; }
  .items-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .items-table thead th { background: #2c3e50; color: #fff; padding: 7px 6px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; }
  .items-table thead th.right { text-align: right; }
  .items-table thead th.center { text-align: center; }
  .items-table tbody td { padding: 5px 6px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  .items-table tbody tr:nth-child(even) { background: #f8f9fa; }
  .items-table tbody tr:nth-child(odd) { background: #fff; }
  .items-table tfoot td { padding: 7px 6px; font-weight: bold; border-top: 2px solid #2c3e50; background: #ecf0f1; font-size: 9pt; }
  .grand-total { margin-top: 16px; padding: 10px 12px; background: #2c3e50; color: #fff; border-radius: 6px; display: flex; justify-content: space-between; font-size: 11pt; font-weight: bold; }
  .signature-section { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
  .sig-block { text-align: center; width: 220px; }
  .sig-date { font-size: 9pt; margin-bottom: 4px; }
  .sig-name { font-size: 9pt; border-bottom: 1px solid #1a1a1a; padding-bottom: 2px; margin-bottom: 2px; font-weight: bold; min-height: 16px; }
  .sig-jabatan { font-size: 8.5pt; font-weight: bold; }
  .sig-title { font-size: 8.5pt; font-weight: bold; }
  .sig-nip { font-size: 8pt; color: #555; }
  .sig-tte-label { font-size: 7.5pt; color: #888; font-style: italic; }
  .doc-footer { margin-top: 30px; padding-top: 8px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 7.5pt; color: #888; }
  @media print { body { margin: 0; padding: 0; background: #fff; } .page { margin: 0; width: 100%; } }
</style>
</head>
<body>
<div class="page">
  ${kopHtml}
  <div class="doc-info">
    <div class="doc-title">LAPORAN DETAIL ITEM PERBAIKAN KENDARAAN</div>
    <div class="doc-meta">Nomor Surat: ${docNumber}<br/>Periode: ${periodLabel}<br/>Tanggal Cetak: ${printDate}</div>
  </div>
  ${serviceBlocksHtml}
  ${servicesWithItems.length > 0 ? `<div class="grand-total"><span>Grand Total Seluruh Item Perbaikan</span><span>${formatRupiah(grandTotal)}</span></div>` : ''}
  ${sigHtml}
  <div class="doc-footer">
    <div>Dicetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</div>
    <div style="font-style:italic;">Dokumen ini merupakan laporan resmi dinas yang sah</div>
    <div>Halaman 1 dari 1</div>
  </div>
</div>
</body>
</html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
    toast.success('Laporan item perbaikan berhasil dicetak')
    setPrintItemsDialogOpen(false)
  }, [filteredServices, generateDocNumber, getPeriodLabel, formatRupiah, printItemsSignature, settings, kepalaSignature, qrDataUrl])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const stats = data?.statistics

  return (
    <div className="space-y-6">
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
              <FileBarChart className="h-5 w-5" />
            </div>
            Laporan Service Kendaraan
          </h1>
          <p className="text-muted-foreground mt-1">Buat dan ekspor laporan service kendaraan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)} className="gap-1.5 rounded-xl border-border/50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 dark:hover:bg-teal-900/20 dark:hover:text-teal-400 transition-all duration-200">
            <ScrollText className="h-4 w-4" /> Cetak Laporan Resmi
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPrintItemsDialogOpen(true)} className="gap-1.5 rounded-xl border-border/50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-all duration-200">
            <ListChecks className="h-4 w-4" /> Cetak Laporan Item Perbaikan
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-1.5 rounded-xl border-border/50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-all duration-200">
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="gap-1.5 rounded-xl border-border/50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-all duration-200">
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Kategori Laporan Selector */}
      <Card className="no-print animate-slide-up animate-stagger-1 border border-border/50 shadow-sm rounded-2xl card-hover">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
              <Stamp className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium">Kategori Laporan</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {KATEGORI_OPTIONS.map(opt => (
              <Badge
                key={opt.value}
                variant="outline"
                className={cn(
                  'cursor-pointer px-3 py-1.5 text-sm transition-all duration-200 flex items-center gap-1.5 rounded-xl',
                  kategoriLaporan === opt.value
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-600 shadow-lg shadow-teal-500/20'
                    : 'hover:bg-muted hover:border-border/80'
                )}
                onClick={() => {
                  setKategoriLaporan(opt.value)
                  // Reset sub-filters when changing category
                  if (opt.value !== 'per_nopol') setFilterVehicle('all')
                  if (opt.value !== 'per_bengkel') setFilterBengkel('all')
                  if (opt.value !== 'per_skpd') setFilterSkpd('all')
                  if (opt.value !== 'per_jenis_kendaraan') setFilterJenisKendaraan('all')
                  if (opt.value !== 'per_status') setFilterStatusService('all')
                }}
              >
                {opt.icon} {opt.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Type Filter Badges */}
      {kategoriLaporan !== 'per_jenis_kendaraan' && (
        <div className="animate-slide-up animate-stagger-2 flex flex-wrap gap-2 no-print">
          <Badge
            variant="outline"
            className={cn(
              'cursor-pointer px-3 py-1 text-sm transition-colors',
              filterJenisKendaraan === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted'
            )}
            onClick={() => setFilterJenisKendaraan('all')}
          >
            <Car className="h-3.5 w-3.5 mr-1" /> Semua Kendaraan
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'cursor-pointer px-3 py-1 text-sm transition-colors',
              filterJenisKendaraan === 'RODA_2'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'hover:bg-muted'
            )}
            onClick={() => setFilterJenisKendaraan(filterJenisKendaraan === 'RODA_2' ? 'all' : 'RODA_2')}
          >
            <Bike className="h-3.5 w-3.5 mr-1" /> Roda 2
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'cursor-pointer px-3 py-1 text-sm transition-colors',
              filterJenisKendaraan === 'RODA_4'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'hover:bg-muted'
            )}
            onClick={() => setFilterJenisKendaraan(filterJenisKendaraan === 'RODA_4' ? 'all' : 'RODA_4')}
          >
            <Truck className="h-3.5 w-3.5 mr-1" /> Roda 4
          </Badge>
        </div>
      )}

      {/* Report Configuration */}
      <Card className="no-print animate-slide-up animate-stagger-3 border border-border/50 shadow-sm rounded-2xl card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Konfigurasi Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Jenis Laporan</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tahunan">Tahunan</SelectItem>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                  <SelectItem value="triwulan">Triwulan</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Tahun</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reportType === 'bulanan' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Bulan</label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportType === 'triwulan' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Triwulan</label>
                <Select value={triwulan} onValueChange={setTriwulan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Triwulan I (Jan-Mar)</SelectItem>
                    <SelectItem value="2">Triwulan II (Apr-Jun)</SelectItem>
                    <SelectItem value="3">Triwulan III (Jul-Sep)</SelectItem>
                    <SelectItem value="4">Triwulan IV (Okt-Des)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportType === 'semester' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Semester</label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester I (Jan-Jun)</SelectItem>
                    <SelectItem value="2">Semester II (Jul-Des)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportType === 'custom' && (
              <>
                <div>
                  <label className="text-xs font-medium mb-1 block">Dari Tanggal</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Sampai Tanggal</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </>
            )}

            {/* Conditional filters based on kategori */}
            {kategoriLaporan === 'per_nopol' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Nopol (Plat Kendaraan)</label>
                <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                  <SelectTrigger><SelectValue placeholder="Pilih Nopol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Nopol</SelectItem>
                    {vehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.nomorPolisi} - {v.merk} {v.type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {kategoriLaporan === 'per_bengkel' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Bengkel</label>
                <Select value={filterBengkel} onValueChange={setFilterBengkel}>
                  <SelectTrigger><SelectValue placeholder="Pilih Bengkel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Bengkel</SelectItem>
                    {workshops.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>{w.namaBengkel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {kategoriLaporan === 'per_skpd' && (
              <div>
                <label className="text-xs font-medium mb-1 block">SKPD/Bidang</label>
                <Select value={filterSkpd} onValueChange={setFilterSkpd}>
                  <SelectTrigger><SelectValue placeholder="Pilih SKPD/Bidang" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua SKPD/Bidang</SelectItem>
                    {skpdOptions.map(skpd => (
                      <SelectItem key={skpd} value={skpd}>{skpd}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {kategoriLaporan === 'per_jenis_kendaraan' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Jenis Kendaraan</label>
                <Select value={filterJenisKendaraan} onValueChange={setFilterJenisKendaraan}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    <SelectItem value="RODA_2">Roda 2</SelectItem>
                    <SelectItem value="RODA_4">Roda 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {kategoriLaporan === 'per_status' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Status Service</label>
                <Select value={filterStatusService} onValueChange={setFilterStatusService}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="DIAJUKAN">Diajukan</SelectItem>
                    <SelectItem value="DISETUJUI">Disetujui</SelectItem>
                    <SelectItem value="DIPROSES">Diproses</SelectItem>
                    <SelectItem value="SELESAI">Selesai</SelectItem>
                    <SelectItem value="DITOLAK">Ditolak</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PENGAJUAN">Pengajuan</SelectItem>
                    <SelectItem value="MENUNGGU_PERSETUJUAN">Menunggu Persetujuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* General filters always available */}
            {kategoriLaporan !== 'per_jenis_kendaraan' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Jenis Kendaraan</label>
                <Select value={filterJenisKendaraan} onValueChange={setFilterJenisKendaraan}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    <SelectItem value="RODA_2">Roda 2</SelectItem>
                    <SelectItem value="RODA_4">Roda 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block">Jenis Service</label>
              <Select value={filterJenisService} onValueChange={setFilterJenisService}>
                <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="RUTIN">Rutin</SelectItem>
                  <SelectItem value="PERBAIKAN">Perbaikan</SelectItem>
                  <SelectItem value="DARURAT">Darurat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kategoriLaporan !== 'per_status' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Status Service</label>
                <Select value={filterStatusService} onValueChange={setFilterStatusService}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="DIAJUKAN">Diajukan</SelectItem>
                    <SelectItem value="DISETUJUI">Disetujui</SelectItem>
                    <SelectItem value="DIPROSES">Diproses</SelectItem>
                    <SelectItem value="SELESAI">Selesai</SelectItem>
                    <SelectItem value="DITOLAK">Ditolak</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {kategoriLaporan !== 'per_bengkel' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Bengkel</label>
                <Select value={filterBengkel} onValueChange={setFilterBengkel}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Bengkel</SelectItem>
                    {workshops.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>{w.namaBengkel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {kategoriLaporan !== 'per_nopol' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Nopol</label>
                <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Nopol</SelectItem>
                    {vehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.nomorPolisi} - {v.merk} {v.type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="animate-slide-up animate-stagger-1 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground tracking-wider uppercase">Total Biaya</p>
                <p className="text-sm font-bold">{formatRupiah(stats?.totalBiaya || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-slide-up animate-stagger-2 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground tracking-wider uppercase">Total Service</p>
                <p className="text-sm font-bold">{filteredServices.length || stats?.serviceCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-slide-up animate-stagger-3 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground tracking-wider uppercase">Selesai</p>
                <p className="text-sm font-bold">{stats?.completedCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-slide-up animate-stagger-4 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-lg shadow-yellow-500/20">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground tracking-wider uppercase">Dalam Proses</p>
                <p className="text-sm font-bold">{stats?.inProgressCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-slide-up animate-stagger-5 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground tracking-wider uppercase">Ditolak</p>
                <p className="text-sm font-bold">{stats?.rejectedCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Summary - Separate Roda 2 / Roda 4 */}
      <Card className="animate-slide-up animate-stagger-6 border border-border/50 shadow-sm rounded-2xl card-hover">
        <CardHeader className="pb-3 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/30 dark:to-emerald-950/20 rounded-t-2xl border-b border-border/30">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-teal-700 dark:text-teal-400">
            <Wallet className="h-4 w-4" /> Ringkasan Anggaran Tahun {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Roda 4 Budget */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20 p-4 space-y-3 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/50">
                  <Truck className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Roda 4</p>
                  <p className="text-xs text-muted-foreground">{stats?.budgetByType?.RODA_4?.vehicleCount || 0} kendaraan</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anggaran</span>
                  <span className="font-medium">{formatRupiah(stats?.budgetByType?.RODA_4?.totalAnggaran || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Realisasi</span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">{formatRupiah(stats?.budgetByType?.RODA_4?.realisasi || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa</span>
                  <span className={cn(
                    'font-bold',
                    (stats?.budgetByType?.RODA_4?.sisaAnggaran || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatRupiah(stats?.budgetByType?.RODA_4?.sisaAnggaran || 0)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Penggunaan</span>
                  <span className="font-medium">{(stats?.budgetByType?.RODA_4?.persentase || 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-amber-100 dark:bg-amber-900/50 rounded-full h-2.5">
                  <div
                    className={cn(
                      'rounded-full h-2.5 transition-all',
                      (stats?.budgetByType?.RODA_4?.persentase || 0) >= 90 ? 'bg-red-500' :
                      (stats?.budgetByType?.RODA_4?.persentase || 0) >= 70 ? 'bg-amber-500' : 'bg-amber-600'
                    )}
                    style={{ width: `${Math.min(stats?.budgetByType?.RODA_4?.persentase || 0, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats?.budgetByType?.RODA_4?.serviceCount || 0} service • {formatRupiah(stats?.vehicleTypeBreakdown?.RODA_4?.total || 0)} biaya service
              </div>
            </div>

            {/* Roda 2 Budget */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20 p-4 space-y-3 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/50">
                  <Bike className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Roda 2</p>
                  <p className="text-xs text-muted-foreground">{stats?.budgetByType?.RODA_2?.vehicleCount || 0} kendaraan</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anggaran</span>
                  <span className="font-medium">{formatRupiah(stats?.budgetByType?.RODA_2?.totalAnggaran || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Realisasi</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{formatRupiah(stats?.budgetByType?.RODA_2?.realisasi || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa</span>
                  <span className={cn(
                    'font-bold',
                    (stats?.budgetByType?.RODA_2?.sisaAnggaran || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatRupiah(stats?.budgetByType?.RODA_2?.sisaAnggaran || 0)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Penggunaan</span>
                  <span className="font-medium">{(stats?.budgetByType?.RODA_2?.persentase || 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-emerald-100 dark:bg-emerald-900/50 rounded-full h-2.5">
                  <div
                    className={cn(
                      'rounded-full h-2.5 transition-all',
                      (stats?.budgetByType?.RODA_2?.persentase || 0) >= 90 ? 'bg-red-500' :
                      (stats?.budgetByType?.RODA_2?.persentase || 0) >= 70 ? 'bg-yellow-500' : 'bg-emerald-600'
                    )}
                    style={{ width: `${Math.min(stats?.budgetByType?.RODA_2?.persentase || 0, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats?.budgetByType?.RODA_2?.serviceCount || 0} service • {formatRupiah(stats?.vehicleTypeBreakdown?.RODA_2?.total || 0)} biaya service
              </div>
            </div>

            {/* Overall Total */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">Total Keseluruhan</p>
                  <p className="text-xs text-muted-foreground">Roda 2 + Roda 4</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anggaran</span>
                  <span className="font-medium">{formatRupiah(stats?.totalAnggaran || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Realisasi</span>
                  <span className="font-medium text-primary">{formatRupiah(stats?.totalRealisasi || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa</span>
                  <span className={cn(
                    'font-bold',
                    (stats?.sisaAnggaran || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatRupiah(stats?.sisaAnggaran || 0)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Penggunaan</span>
                  <span className="font-medium">{(stats?.persentaseRealisasi || 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className={cn(
                      'rounded-full h-2.5 transition-all',
                      (stats?.persentaseRealisasi || 0) >= 90 ? 'bg-red-500' :
                      (stats?.persentaseRealisasi || 0) >= 70 ? 'bg-yellow-500' : 'bg-primary'
                    )}
                    style={{ width: `${Math.min(stats?.persentaseRealisasi || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview">Tabel Data</TabsTrigger>
          <TabsTrigger value="charts">Grafik</TabsTrigger>
          <TabsTrigger value="anggaran">Anggaran</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Data Service</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">No</TableHead>
                      <TableHead>Nomor Service</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nopol</TableHead>
                      <TableHead>Kendaraan</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Jenis Kendaraan</TableHead>
                      <TableHead>SKPD/Bidang</TableHead>
                      <TableHead>Bengkel</TableHead>
                      <TableHead className="text-right">Biaya</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          Tidak ada data service untuk periode ini
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredServices.map((s: any, i: number) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{s.nomorService}</TableCell>
                          <TableCell className="text-xs">{formatDate(s.tanggalService)}</TableCell>
                          <TableCell className="text-xs">{s.vehicle?.nomorPolisi}</TableCell>
                          <TableCell className="text-xs">{s.vehicle?.merk} {s.vehicle?.type}</TableCell>
                          <TableCell className="text-xs">{s.jenisService}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px]', JENIS_KENDARAAN_COLORS[s.vehicle?.jenisKendaraan] || '')}>
                              {s.vehicle?.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{s.vehicle?.skpdBidang || '-'}</TableCell>
                          <TableCell className="text-xs">{s.bengkel?.namaBengkel}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{formatRupiah(s.totalBiaya)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[s.statusService] || ''}`}>
                              {STATUS_LABELS[s.statusService] || s.statusService}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Biaya Service per Bulan (Roda 2 vs Roda 4)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyByTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyByTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                      <Tooltip formatter={(value: number) => formatRupiah(value)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="roda2" fill="#10b981" radius={[4, 4, 0, 0]} name="Roda 2" />
                      <Bar dataKey="roda4" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Roda 4" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Belum ada data</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" /> Distribusi Status Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {statusPieData.map((_entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Belum ada data</div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Total Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Total Biaya per Bulan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                      <Tooltip formatter={(value: number) => formatRupiah(value)} />
                      <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Biaya" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Belum ada data</div>
                )}
              </CardContent>
            </Card>

            {/* Bengkel distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribusi per Bengkel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.isArray(stats?.bengkelDistribution) && stats.bengkelDistribution.map((b: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.count} service</p>
                      </div>
                      <p className="text-sm font-bold">{formatRupiah(b.total)}</p>
                    </div>
                  ))}
                  {(!stats?.bengkelDistribution || !Array.isArray(stats.bengkelDistribution) || stats.bengkelDistribution.length === 0) && (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-4">Belum ada data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="anggaran" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Budget Comparison Chart */}
            <Card className="lg:col-span-2 border border-border/50 shadow-sm rounded-2xl card-hover animate-fade-in">
              <CardHeader className="pb-2 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/30 dark:to-emerald-950/20 rounded-t-2xl border-b border-border/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-teal-700 dark:text-teal-400">
                  <BarChart3 className="h-4 w-4" /> Perbandingan Anggaran Roda 2 vs Roda 4
                </CardTitle>
              </CardHeader>
              <CardContent>
                {budgetComparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={budgetComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                      <Tooltip formatter={(value: number) => formatRupiah(value)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="roda2" fill="#10b981" radius={[4, 4, 0, 0]} name="Roda 2" />
                      <Bar dataKey="roda4" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Roda 4" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground text-sm">Belum ada data anggaran</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Print Preview Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                <ScrollText className="h-4 w-4" />
              </div>
              Cetak Laporan Resmi Dinas
            </DialogTitle>
            <DialogDescription>
              Preview dan cetak laporan resmi dinas dengan kop surat dan tanda tangan
            </DialogDescription>
          </DialogHeader>

          {/* Section toggles */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium">Pilih Bagian yang Dicetak:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-summary"
                  checked={printSections.summary}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, summary: !!checked }))}
                />
                <Label htmlFor="print-summary" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <FileBarChart className="h-3.5 w-3.5" /> Ringkasan
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-budget"
                  checked={printSections.budget}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, budget: !!checked }))}
                />
                <Label htmlFor="print-budget" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Ringkasan Anggaran
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-detail"
                  checked={printSections.detailTable}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, detailTable: !!checked }))}
                />
                <Label htmlFor="print-detail" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Table className="h-3.5 w-3.5" /> Tabel Detail
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-photos"
                  checked={printSections.photos}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, photos: !!checked }))}
                />
                <Label htmlFor="print-photos" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Foto Perbaikan Item
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-signature"
                  checked={printSections.signature}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, signature: !!checked }))}
                />
                <Label htmlFor="print-signature" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Stamp className="h-3.5 w-3.5" /> Tanda Tangan
                </Label>
              </div>
            </div>
          </div>

          {/* Mini Preview */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Preview Laporan
              </p>
            </div>
            <div className="p-4 bg-white" style={{ fontFamily: 'Times New Roman, serif', fontSize: '9pt', color: '#1a1a1a' }}>
              {/* Mini Kop Surat */}
              <div style={{ textAlign: 'center', paddingBottom: '6px', borderBottom: '3px double #1a1a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  {settings.app_logo ? (
                    <img src={settings.app_logo} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'contain' }} alt="Logo" />
                  ) : (
                    <div style={{ width: '40px', height: '40px', border: '1.5px solid #1a1a1a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7pt', fontWeight: 'bold' }}>LOGO</div>
                  )}
                  <div>
                    <div style={{ fontSize: '8pt', letterSpacing: '0.5px' }}>{settings.app_kop_line1 || 'PEMERINTAH KABUPATEN/KOTA'}</div>
                    <div style={{ fontSize: '10pt', fontWeight: 'bold', letterSpacing: '1px' }}>{settings.app_kop_line2 || 'BADAN KEUANGAN DAN ASET DAERAH'}</div>
                  </div>
                </div>
              </div>
              <div style={{ borderBottom: '1px solid #1a1a1a', marginTop: '1px' }}></div>

              {/* Mini Document Info */}
              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <div style={{ fontSize: '9pt', fontWeight: 'bold', letterSpacing: '0.5px' }}>{getReportTitle()}</div>
                <div style={{ fontSize: '7pt', color: '#666', marginTop: '2px' }}>
                  Nomor: - | Periode: {getPeriodLabel()}
                </div>
              </div>

              {/* Mini Summary */}
              {printSections.summary && (
                <div style={{ margin: '6px 0' }}>
                  <div style={{ fontSize: '7pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px', textTransform: 'uppercase' }}>Ringkasan</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {[
                      { label: 'Total Biaya', value: formatRupiah(stats?.totalBiaya || 0), bg: '#e8f5e9', color: '#2e7d32' },
                      { label: 'Total Service', value: String(filteredServices.length || 0), bg: '#e3f2fd', color: '#1565c0' },
                      { label: 'Selesai', value: String(stats?.completedCount || 0), bg: '#e8f5e9', color: '#2e7d32' },
                      { label: 'Dalam Proses', value: String(stats?.inProgressCount || 0), bg: '#fff8e1', color: '#f57f17' },
                      { label: 'Ditolak', value: String(stats?.rejectedCount || 0), bg: '#ffebee', color: '#c62828' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ border: '1px solid #eee', borderRadius: '4px', padding: '4px', textAlign: 'center', background: '#fafafa' }}>
                        <div style={{ fontSize: '5pt', color: '#666', textTransform: 'uppercase' }}>{item.label}</div>
                        <div style={{ fontSize: '8pt', fontWeight: 'bold' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini Budget */}
              {printSections.budget && (
                <div style={{ margin: '6px 0' }}>
                  <div style={{ fontSize: '7pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px', textTransform: 'uppercase' }}>Ringkasan Anggaran</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    {[
                      { title: 'Roda 4', anggaran: stats?.budgetByType?.RODA_4?.totalAnggaran || 0, realisasi: stats?.budgetByType?.RODA_4?.realisasi || 0 },
                      { title: 'Roda 2', anggaran: stats?.budgetByType?.RODA_2?.totalAnggaran || 0, realisasi: stats?.budgetByType?.RODA_2?.realisasi || 0 },
                      { title: 'Total', anggaran: stats?.totalAnggaran || 0, realisasi: stats?.totalRealisasi || 0 },
                    ].map((item, idx) => (
                      <div key={idx} style={{ border: '1px solid #eee', borderRadius: '4px', padding: '4px', background: '#fafafa' }}>
                        <div style={{ fontSize: '6pt', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '2px', marginBottom: '2px' }}>{item.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '6pt' }}>
                          <span style={{ color: '#555' }}>Anggaran:</span>
                          <span style={{ fontWeight: 600 }}>{formatRupiah(item.anggaran)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '6pt' }}>
                          <span style={{ color: '#555' }}>Realisasi:</span>
                          <span style={{ fontWeight: 600 }}>{formatRupiah(item.realisasi)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini Table */}
              {printSections.detailTable && (
                <div style={{ margin: '6px 0' }}>
                  <div style={{ fontSize: '7pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px', textTransform: 'uppercase' }}>Data Service</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6pt' }}>
                    <thead>
                      <tr style={{ background: '#2c3e50', color: '#fff' }}>
                        <th style={{ padding: '3px 4px', textAlign: 'center' }}>No</th>
                        <th style={{ padding: '3px 4px' }}>Nopol</th>
                        <th style={{ padding: '3px 4px' }}>Kendaraan</th>
                        <th style={{ padding: '3px 4px' }}>Bengkel</th>
                        <th style={{ padding: '3px 4px', textAlign: 'right' }}>Biaya</th>
                        <th style={{ padding: '3px 4px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServices.slice(0, 5).map((s: any, i: number) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                          <td style={{ padding: '2px 4px', textAlign: 'center' }}>{i + 1}</td>
                          <td style={{ padding: '2px 4px' }}>{s.vehicle?.nomorPolisi}</td>
                          <td style={{ padding: '2px 4px' }}>{s.vehicle?.merk} {s.vehicle?.type}</td>
                          <td style={{ padding: '2px 4px' }}>{s.bengkel?.namaBengkel}</td>
                          <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 600 }}>{formatRupiah(s.totalBiaya)}</td>
                          <td style={{ padding: '2px 4px', textAlign: 'center' }}>{STATUS_LABELS[s.statusService] || s.statusService}</td>
                        </tr>
                      ))}
                      {filteredServices.length > 5 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3px', color: '#888', fontStyle: 'italic' }}>... dan {filteredServices.length - 5} data lainnya</td></tr>
                      )}
                      {filteredServices.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '6px', color: '#888' }}>Tidak ada data</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mini Signature */}
              {printSections.photos && (() => {
                const servicesWithPhotos = filteredServices.filter((s: any) => {
                  const items = Array.isArray(s.items) ? s.items : []
                  return items.some((item: any) => Array.isArray(item.photos) && item.photos.length > 0)
                })
                return servicesWithPhotos.length > 0 ? (
                  <div style={{ margin: '6px 0' }}>
                    <div style={{ fontSize: '7pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px', textTransform: 'uppercase' }}>Foto Perbaikan Item</div>
                    {servicesWithPhotos.slice(0, 2).map((s: any, idx: number) => (
                      <div key={idx} style={{ marginBottom: '4px', padding: '3px', background: '#fafafa', borderRadius: '3px', border: '1px solid #eee' }}>
                        <div style={{ fontSize: '6.5pt', fontWeight: 'bold', color: '#2c3e50' }}>{s.vehicle?.nomorPolisi} — {s.nomorService}</div>
                        <div style={{ display: 'flex', gap: '3px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {(Array.isArray(s.items) ? s.items : []).filter((item: any) => Array.isArray(item.photos) && item.photos.length > 0).flatMap((item: any) => item.photos).slice(0, 4).map((photo: any, pIdx: number) => (
                            <img key={pIdx} src={photo.filePath} alt={photo.fileName || 'Foto'} style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #ddd' }} />
                          ))}
                        </div>
                      </div>
                    ))}
                    {servicesWithPhotos.length > 2 && (
                      <div style={{ fontSize: '5.5pt', color: '#888', fontStyle: 'italic' }}>... dan {servicesWithPhotos.length - 2} service lainnya</div>
                    )}
                  </div>
                ) : null
              })()}

              {/* Mini Signature */}
              {printSections.signature && (
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '7pt' }}>
                  <div style={{ textAlign: 'center', width: '80px' }}>
                    <div style={{ width: '50px', height: '50px', border: '1px solid #ccc', borderRadius: '2px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5pt', color: '#888' }}>QR</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '160px' }}>
                    <div>{settings.app_kabupaten_kota || settings.app_tempat_ttd || 'Kabupaten/Kota'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '6pt' }}>{settings.app_kepala_jabatan || 'Kepala BKAD'}</div>
                    <div style={{ height: '30px' }}></div>
                    <div style={{ fontWeight: 'bold', borderBottom: '1px solid #1a1a1a', display: 'inline-block', minWidth: '120px' }}>{settings.app_kepala_nama || '\u00A0'}</div>
                    <div style={{ color: '#555', fontSize: '6pt' }}>NIP. {settings.app_kepala_nip || '________________'}</div>
                    {settings.app_tte_image && <div style={{ fontSize: '5pt', color: '#888', fontStyle: 'italic' }}>Tanda Tangan Elektronik</div>}
                  </div>
                </div>
              )}

              {/* Mini Footer */}
              <div style={{ marginTop: '8px', paddingTop: '4px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: '5pt', color: '#888' }}>
                <span>Dicetak: {new Date().toLocaleString('id-ID')}</span>
                <span style={{ fontStyle: 'italic' }}>Dokumen resmi dinas</span>
                <span>Hal. 1/1</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-1" /> Unduh PDF
            </Button>
            <Button onClick={handlePrintReport} className="w-full sm:w-auto">
              <Printer className="h-4 w-4 mr-1" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Items Report Dialog */}
      <Dialog open={printItemsDialogOpen} onOpenChange={setPrintItemsDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <ListChecks className="h-4 w-4" />
              </div>
              Cetak Laporan Item Perbaikan
            </DialogTitle>
            <DialogDescription>
              Cetak laporan detail item perbaikan kendaraan dengan kop surat dan tanda tangan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="print-items-signature"
                checked={printItemsSignature}
                onCheckedChange={(checked) => setPrintItemsSignature(!!checked)}
              />
              <Label htmlFor="print-items-signature" className="text-sm cursor-pointer flex items-center gap-1.5">
                <Stamp className="h-3.5 w-3.5" /> Tanda Tangan
              </Label>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-gradient-to-br from-muted/30 to-muted/10">
            <p className="text-xs font-medium text-muted-foreground mb-2">Ringkasan data yang akan dicetak:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center p-3 rounded-xl bg-background/80 border border-border/30">
                <p className="text-lg font-bold">{filteredServices.filter((s: any) => Array.isArray(s.items) && s.items.length > 0).length}</p>
                <p className="text-xs text-muted-foreground">Service dengan Item</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/80 border border-border/30">
                <p className="text-lg font-bold">{filteredServices.reduce((sum: number, s: any) => sum + (Array.isArray(s.items) ? s.items.length : 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Total Item</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPrintItemsDialogOpen(false)} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button onClick={handlePrintItemsReport} className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              <Printer className="h-4 w-4 mr-1" /> Cetak Laporan Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
