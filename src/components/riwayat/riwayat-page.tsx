'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  History, Search, Filter, Car, Bike, Wrench, Calendar,
  ChevronDown, ChevronUp, TrendingUp, BarChart3, PieChart as PieChartIcon,
  ArrowRight, Printer, ScrollText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateQRDataURL } from '@/lib/qrcode-helper'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { toast } from 'sonner'

const COLORS = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#f59e0b', '#ef4444', '#8b5cf6']

const statusColors: Record<string, string> = {
  DIAJUKAN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DISETUJUI: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  DITOLAK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DIPROSES: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SELESAI: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PENGAJUAN: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  MENUNGGU_PERSETUJUAN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

export function RiwayatPage() {
  const [search, setSearch] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [bengkelFilter, setBengkelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printSections, setPrintSections] = useState({
    summary: true,
    timeline: true,
    items: true,
    photos: true,
    signature: true,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['riwayat', search, vehicleFilter, bengkelFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (vehicleFilter !== 'all') params.set('vehicleId', vehicleFilter)
      if (bengkelFilter !== 'all') params.set('bengkelId', bengkelFilter)
      if (statusFilter !== 'all') params.set('statusService', statusFilter)
      const res = await fetch(`/api/riwayat?${params}`)
      return res.json()
    },
  })

  // Fetch vehicles and workshops for filter dropdowns
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const res = await fetch('/api/kendaraan?limit=100')
      return res.json()
    },
  })

  const { data: bengkelData } = useQuery({
    queryKey: ['bengkel-list'],
    queryFn: async () => {
      const res = await fetch('/api/bengkel?limit=50')
      return res.json()
    },
  })

  // Fetch app settings for kop surat and signatures
  const { data: settingsRaw } = useQuery({
    queryKey: ['settings-riwayat'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan')
      return res.json()
    },
  })
  const settings = (settingsRaw || {}) as Record<string, string>

  // Fetch Kepala BKAD signature for print documents
  const [kepalaSignature, setKepalaSignature] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
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

  // Generate QR code data URL for print documents
  // (will be regenerated at print time with actual document verification URL)
  useEffect(() => {
    generateQRDataURL(window.location.origin, 150).then(setQrDataUrl).catch(() => {})
  }, [])

  const services = data?.services || []
  const summary = data?.summary || {}
  const chartData = data?.chartData || []
  const pieData = data?.pieData || []
  const vehicles = vehiclesData?.data || []
  const bengkels = bengkelData?.data || []

  // Print timeline function
  const handlePrintTimeline = useCallback(async () => {
    const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const docNumber = `${String(Math.floor(Math.random() * 900) + 100)}/BKAD/TIMELINE/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`

    // Generate QR code dynamically with verification URL
    const verifyUrl = `${window.location.origin}/verify`
    let printQrDataUrl = qrDataUrl
    try {
      const generated = await generateQRDataURL(verifyUrl, 150)
      if (generated) printQrDataUrl = generated
    } catch {}

    // Build filter description
    let filterDesc = 'Semua Data'
    const filters: string[] = []
    if (search) filters.push(`Pencarian: ${search}`)
    if (vehicleFilter !== 'all') {
      const v = vehicles.find((v: any) => v.id === vehicleFilter)
      if (v) filters.push(`Nopol: ${v.nomorPolisi}`)
    }
    if (bengkelFilter !== 'all') {
      const b = bengkels.find((b: any) => b.id === bengkelFilter)
      if (b) filters.push(`Bengkel: ${b.namaBengkel}`)
    }
    if (statusFilter !== 'all') filters.push(`Status: ${STATUS_LABELS[statusFilter] || statusFilter}`)
    if (filters.length > 0) filterDesc = filters.join(' | ')

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Timeline Riwayat Perbaikan</title>
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

  /* SUMMARY */
  .summary-section { margin: 14px 0; }
  .summary-title { font-size: 10pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
  .summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; text-align: center; background: #fafafa; }
  .summary-card-label { font-size: 7.5pt; color: #666; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
  .summary-card-value { font-size: 11pt; font-weight: bold; color: #1a1a1a; }

  /* TIMELINE */
  .timeline-section { margin: 14px 0; }
  .timeline-title { font-size: 10pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .timeline-item { page-break-inside: avoid; margin-bottom: 14px; border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; }
  .timeline-header { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f8f9fa; border-bottom: 1px solid #e5e5e5; }
  .timeline-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .dot-SELESAI { background: #8b5cf6; }
  .dot-DIPROSES { background: #f59e0b; }
  .dot-DISETUJUI { background: #10b981; }
  .dot-DITOLAK { background: #ef4444; }
  .dot-DIAJUKAN { background: #3b82f6; }
  .dot-PENDING { background: #eab308; }
  .dot-PENGAJUAN { background: #8b5cf6; }
  .dot-MENUNGGU_PERSETUJUAN { background: #6366f1; }
  .timeline-header-info { flex: 1; }
  .timeline-nomor { font-size: 9pt; font-weight: bold; color: #1a1a1a; }
  .timeline-vehicle { font-size: 8pt; color: #666; }
  .timeline-meta { font-size: 7.5pt; color: #888; margin-top: 1px; }
  .timeline-header-right { text-align: right; }
  .timeline-biaya { font-size: 9pt; font-weight: bold; }
  .status-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; font-weight: 600; }
  .status-SELESAI { background: #e8daef; color: #6c3483; }
  .status-DIPROSES { background: #fff3cd; color: #856404; }
  .status-DISETUJUI { background: #d1ecf1; color: #0c5460; }
  .status-DITOLAK { background: #f8d7da; color: #721c24; }
  .status-DIAJUKAN { background: #cce5ff; color: #004085; }
  .status-PENDING { background: #ffeaa7; color: #6c5ce7; }
  .status-PENGAJUAN { background: #e8daef; color: #6c3483; }
  .status-MENUNGGU_PERSETUJUAN { background: #d6eaf8; color: #2e4053; }

  /* ITEM DETAIL */
  .timeline-body { padding: 8px 12px; }
  .detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px; font-size: 8pt; }
  .detail-label { color: #888; }
  .detail-value { font-weight: 600; }
  .items-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 6px; }
  .items-table th { background: #f0f0f0; padding: 4px 6px; text-align: left; font-weight: 600; border-bottom: 1px solid #ddd; }
  .items-table th.right { text-align: right; }
  .items-table td { padding: 3px 6px; border-bottom: 1px solid #eee; }
  .items-table td.right { text-align: right; }

  /* PHOTOS */
  .photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 6px; }
  .photo-thumb { text-align: center; }
  .photo-thumb img { width: 100px; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
  .photo-caption { font-size: 6.5pt; color: #888; margin-top: 2px; }

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

  /* FOOTER */
  .doc-footer { margin-top: 30px; padding-top: 8px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 7.5pt; color: #888; }

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
    <div class="doc-title">TIMELINE RIWAYAT PERBAIKAN KENDARAAN</div>
    <div class="doc-meta">
      Nomor: ${docNumber}<br/>
      Filter: ${filterDesc}<br/>
      Tanggal Cetak: ${printDate}
    </div>
  </div>

  ${printSections.summary ? `
  <!-- RINGKASAN -->
  <div class="summary-section">
    <div class="summary-title">Ringkasan</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-label">Total Biaya</div>
        <div class="summary-card-value">${formatCurrency(summary.totalBiaya || 0)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Jumlah Service</div>
        <div class="summary-card-value">${summary.serviceCount || 0}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Rata-rata Biaya</div>
        <div class="summary-card-value">${formatCurrency(summary.avgCost || 0)}</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${printSections.timeline ? `
  <!-- TIMELINE SERVICE -->
  <div class="timeline-section">
    <div class="timeline-title">Timeline Service</div>
    ${services.length === 0 ? `
      <div style="text-align:center;padding:20px;color:#888;font-size:9pt;">Tidak ada data service</div>
    ` : services.map((s: any, i: number) => `
    <div class="timeline-item">
      <div class="timeline-header">
        <div class="timeline-dot dot-${s.statusService}"></div>
        <div class="timeline-header-info">
          <div class="timeline-nomor">${i + 1}. ${s.nomorService || '-'}</div>
          <div class="timeline-vehicle">${s.vehicle?.nomorPolisi || '-'} &bull; ${s.vehicle?.merk || ''} ${s.vehicle?.type || ''} ${s.vehicle?.jenisKendaraan === 'RODA_2' ? '(Roda 2)' : '(Roda 4)'}</div>
          <div class="timeline-meta">
            ${new Date(s.tanggalService).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            &rarr; ${s.bengkel?.namaBengkel || '-'}
            ${s.vehicle?.skpdBidang ? ` | SKPD: ${s.vehicle.skpdBidang}` : ''}
          </div>
        </div>
        <div class="timeline-header-right">
          <div class="timeline-biaya">${formatCurrency(s.totalBiaya || 0)}</div>
          <span class="status-badge status-${s.statusService}">${STATUS_LABELS[s.statusService] || s.statusService}</span>
        </div>
      </div>
      <div class="timeline-body">
        <div class="detail-grid">
          <div><span class="detail-label">Jenis</span><br/><span class="detail-value">${s.jenisService || '-'}</span></div>
          <div><span class="detail-label">Prioritas</span><br/><span class="detail-value">${s.prioritas || '-'}</span></div>
          <div><span class="detail-label">Kilometer</span><br/><span class="detail-value">${s.kilometerService?.toLocaleString() || '-'} km</span></div>
          <div><span class="detail-label">Progress</span><br/><span class="detail-value">${s.progress || 0}%</span></div>
        </div>
        ${s.keterangan ? `<div style="font-size:8pt;color:#666;margin-bottom:6px;">Keterangan: ${s.keterangan}</div>` : ''}
        ${printSections.items && s.items?.length > 0 ? `
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="right">Qty</th>
              <th class="right">Harga Satuan</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${s.items.map((item: any) => `
            <tr>
              <td>${item.itemName}</td>
              <td class="right">${item.quantity}</td>
              <td class="right">${formatCurrency(item.hargaSatuan)}</td>
              <td class="right" style="font-weight:600;">${formatCurrency(item.totalHarga)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
        ${printSections.photos && s.items?.some((item: any) => Array.isArray(item.photos) && item.photos.length > 0) ? `
        <div style="margin-top:6px;">
          ${s.items.filter((item: any) => Array.isArray(item.photos) && item.photos.length > 0).map((item: any) => `
          <div style="margin-bottom:4px;">
            <div style="font-size:7.5pt;font-weight:600;color:#444;">&bull; ${item.itemName}</div>
            <div class="photo-grid">
              ${item.photos.map((photo: any) => `
              <div class="photo-thumb">
                <img src="${window.location.origin}${photo.filePath}" alt="${photo.fileName || 'Foto'}" />
                <div class="photo-caption">${photo.fileName || ''}</div>
              </div>
              `).join('')}
            </div>
          </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
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
    toast.success('Timeline berhasil dicetak')
    setPrintDialogOpen(false)
  }, [services, summary, search, vehicleFilter, bengkelFilter, statusFilter, vehicles, bengkels, settings, printSections, kepalaSignature, qrDataUrl])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
              <History className="h-5 w-5" />
            </div>
            Riwayat Perbaikan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Histori service dan perbaikan kendaraan dinas</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)} className="gap-2 rounded-xl border-border/50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 dark:hover:bg-teal-900/20 dark:hover:text-teal-400 transition-all duration-200">
          <Printer className="h-4 w-4" /> Cetak Timeline
        </Button>
      </div>

      {/* Filters */}
      <div className="animate-slide-up animate-stagger-1 flex flex-col sm:flex-row gap-3 bg-muted/30 backdrop-blur-sm rounded-2xl p-3 border border-border/30">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor polisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-border/50 bg-background/80"
          />
        </div>
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-[180px] rounded-xl border-border/50"><SelectValue placeholder="Kendaraan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kendaraan</SelectItem>
            {vehicles.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.nomorPolisi} - {v.merk}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bengkelFilter} onValueChange={setBengkelFilter}>
          <SelectTrigger className="w-[180px] rounded-xl border-border/50"><SelectValue placeholder="Bengkel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bengkel</SelectItem>
            {bengkels.map((b: any) => (
              <SelectItem key={b.id} value={b.id}>{b.namaBengkel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] rounded-xl border-border/50"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="DIAJUKAN">Diajukan</SelectItem>
            <SelectItem value="DISETUJUI">Disetujui</SelectItem>
            <SelectItem value="DIPROSES">Diproses</SelectItem>
            <SelectItem value="SELESAI">Selesai</SelectItem>
            <SelectItem value="DITOLAK">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="animate-slide-up animate-stagger-1 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="rounded-2xl p-3 bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase">Total Biaya Service</p>
              <p className="text-lg font-bold">{formatCurrency(summary.totalBiaya || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-slide-up animate-stagger-2 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="rounded-2xl p-3 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase">Jumlah Service</p>
              <p className="text-lg font-bold">{summary.serviceCount || 0} <span className="text-xs font-normal text-muted-foreground">kali</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-slide-up animate-stagger-3 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="rounded-2xl p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase">Rata-rata Biaya</p>
              <p className="text-lg font-bold">{formatCurrency(summary.avgCost || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up animate-stagger-4 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardHeader className="pb-2 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/30 dark:to-emerald-950/20 rounded-t-2xl border-b border-border/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <BarChart3 className="h-4 w-4" /> Biaya Service Bulanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#0f766e" radius={[4, 4, 0, 0]} name="Biaya" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up animate-stagger-5 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardHeader className="pb-2 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/30 dark:to-emerald-950/20 rounded-t-2xl border-b border-border/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <PieChartIcon className="h-4 w-4" /> Distribusi Item Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Common Items */}
      {summary.commonItems?.length > 0 && (
        <Card className="animate-slide-up animate-stagger-5 border border-border/50 shadow-sm card-hover rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Item Service Paling Sering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.commonItems.map((item: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs gap-1 rounded-lg hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/30 dark:hover:text-teal-400 transition-colors duration-200 cursor-default">
                  {item.name} <span className="text-muted-foreground">({item.count}x)</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Timeline */}
      <Card className="animate-slide-up animate-stagger-6 border border-border/50 shadow-sm rounded-2xl">
        <CardHeader className="pb-3 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/30 dark:to-emerald-950/20 rounded-t-2xl border-b border-border/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-teal-700 dark:text-teal-400">
            <Calendar className="h-4 w-4" /> Timeline Service
          </CardTitle>
          <CardDescription className="text-xs">Klik untuk melihat detail item service</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Tidak ada riwayat service</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto thin-scrollbar">
              {services.map((s: any, idx: number) => (
                <div key={s.id} className={`animate-fade-in border border-border/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-sm ${idx < 8 ? `animate-stagger-${idx + 1}` : ''}`}>
                  <div
                    className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors duration-200 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  >
                    {/* Timeline dot */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      s.statusService === 'SELESAI' ? 'bg-purple-500' :
                      s.statusService === 'DIPROSES' ? 'bg-amber-500' :
                      s.statusService === 'DISETUJUI' ? 'bg-emerald-500' :
                      s.statusService === 'DITOLAK' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{s.nomorService}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.vehicle?.nomorPolisi} • {s.vehicle?.merk}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.tanggalService).toLocaleDateString('id-ID')}
                        <ArrowRight className="h-3 w-3" />
                        {s.bengkel?.namaBengkel}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold">{formatCurrency(s.totalBiaya)}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[s.statusService] || ''}`}>
                        {STATUS_LABELS[s.statusService] || s.statusService}
                      </span>
                      {expandedId === s.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedId === s.id && (
                    <div className="border-t bg-muted/20 p-3 animate-scale-in">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                        <div><span className="text-muted-foreground">Jenis</span><p className="font-medium">{s.jenisService}</p></div>
                        <div><span className="text-muted-foreground">Prioritas</span><p className="font-medium">{s.prioritas}</p></div>
                        <div><span className="text-muted-foreground">Kilometer</span><p className="font-medium">{s.kilometerService?.toLocaleString()} km</p></div>
                        <div><span className="text-muted-foreground">Progress</span><p className="font-medium">{s.progress}%</p></div>
                      </div>
                      {s.keterangan && (
                        <p className="text-xs text-muted-foreground mb-3">Keterangan: {s.keterangan}</p>
                      )}
                      {s.items?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2">Item Service:</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-1.5 font-medium">Item</th>
                                  <th className="text-right p-1.5 font-medium">Qty</th>
                                  <th className="text-right p-1.5 font-medium">Harga</th>
                                  <th className="text-right p-1.5 font-medium">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.items.map((item: any) => (
                                  <tr key={item.id} className="border-b border-border/30">
                                    <td className="p-1.5">
                                      {item.itemName}
                                      {item.photos?.length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                          {item.photos.map((photo: any, pIdx: number) => (
                                            <img key={pIdx} src={photo.filePath} alt={photo.fileName} className="w-10 h-10 rounded object-cover border" />
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-1.5 text-right">{item.quantity}</td>
                                    <td className="p-1.5 text-right">{formatCurrency(item.hargaSatuan)}</td>
                                    <td className="p-1.5 text-right font-medium">{formatCurrency(item.totalHarga)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                <ScrollText className="h-4 w-4" />
              </div>
              Cetak Timeline Riwayat Perbaikan
            </DialogTitle>
            <DialogDescription>
              Pilih bagian yang ingin dicetak pada laporan timeline riwayat perbaikan
            </DialogDescription>
          </DialogHeader>

          {/* Section toggles */}
          <div className="space-y-3 border border-border/50 rounded-2xl p-4 bg-muted/30">
            <p className="text-sm font-medium">Pilih Bagian yang Dicetak:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-riwayat-summary"
                  checked={printSections.summary}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, summary: !!checked }))}
                />
                <Label htmlFor="print-riwayat-summary" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Ringkasan
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-riwayat-timeline"
                  checked={printSections.timeline}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, timeline: !!checked }))}
                />
                <Label htmlFor="print-riwayat-timeline" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Timeline Service
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-riwayat-items"
                  checked={printSections.items}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, items: !!checked }))}
                />
                <Label htmlFor="print-riwayat-items" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" /> Detail Item
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-riwayat-photos"
                  checked={printSections.photos}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, photos: !!checked }))}
                />
                <Label htmlFor="print-riwayat-photos" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> Foto Perbaikan
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="print-riwayat-signature"
                  checked={printSections.signature}
                  onCheckedChange={(checked) => setPrintSections(prev => ({ ...prev, signature: !!checked }))}
                />
                <Label htmlFor="print-riwayat-signature" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <ScrollText className="h-3.5 w-3.5" /> Tanda Tangan
                </Label>
              </div>
            </div>
          </div>

          {/* Preview summary */}
          <div className="border border-border/50 rounded-2xl p-4 bg-gradient-to-br from-muted/30 to-muted/10">
            <p className="text-xs font-medium text-muted-foreground mb-2">Data yang akan dicetak:</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-3 rounded-xl bg-background/80 border border-border/30">
                <p className="text-lg font-bold">{services.length}</p>
                <p className="text-xs text-muted-foreground">Service</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/80 border border-border/30">
                <p className="text-lg font-bold">{formatCurrency(summary.totalBiaya || 0)}</p>
                <p className="text-xs text-muted-foreground">Total Biaya</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/80 border border-border/30">
                <p className="text-lg font-bold">{summary.serviceCount || 0}</p>
                <p className="text-xs text-muted-foreground">Jumlah</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)} className="rounded-xl">Batal</Button>
            <Button onClick={handlePrintTimeline} className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20">
              <Printer className="h-4 w-4 mr-1" /> Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
