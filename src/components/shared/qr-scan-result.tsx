'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Bike, Car, Wrench, CheckCircle2, AlertTriangle, Clock,
  RotateCcw, X, ArrowRight, Gauge, FileText, Wallet,
  Loader2, MapPin
} from 'lucide-react'
import { useNavigationStore } from '@/store/navigation'

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

const serviceStatusColors: Record<string, string> = {
  DIAJUKAN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  PENGAJUAN: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  DISETUJUI: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  DIPROSES: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  MENUNGGU_PERSETUJUAN: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  PENDING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  SELESAI: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  DITOLAK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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

const jenisLabels: Record<string, string> = {
  RODA_2: 'Roda 2',
  RODA_4: 'Roda 4',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface QrScanResultProps {
  data: {
    found: boolean
    vehicle: any
    serviceSummary: {
      totalServiceCount: number
      activeServiceCount: number
      totalBiayaService: number
      activeService: any | null
    }
    recentServices: any[]
    currentBudget: any | null
  }
  onRescan: () => void
  onClose: () => void
  loading: boolean
}

export function QrScanResult({ data, onRescan, onClose, loading }: QrScanResultProps) {
  const { setCurrentPage } = useNavigationStore()
  const v = data.vehicle

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Loading overlay */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-8 min-h-[280px]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Mengambil data kendaraan...</p>
        </div>
      )}

      {!loading && v && (
        <div className="space-y-4 p-4">
          {/* Vehicle Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shrink-0">
              {v.jenisKendaraan === 'RODA_2' ? <Bike className="h-5 w-5" /> : <Car className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold truncate">{v.nomorPolisi}</h3>
                <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                  {v.jenisKendaraan === 'RODA_2' ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                  {jenisLabels[v.jenisKendaraan] || v.jenisKendaraan}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{v.merk} {v.type} &bull; {v.tahun}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColors[v.statusKendaraan] || ''}`}>
                  {statusLabels[v.statusKendaraan] || v.statusKendaraan}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${kondisiColors[v.kondisiKendaraan] || ''}`}>
                  {kondisiLabels[v.kondisiKendaraan] || v.kondisiKendaraan}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Vehicle Details Grid */}
          <div className="grid grid-cols-2 gap-2">
            <DetailItem icon={FileText} label="Pengguna" value={v.namaPengguna} />
            <DetailItem icon={MapPin} label="SKPD/Bidang" value={v.skpdBidang} />
            <DetailItem icon={Gauge} label="Kilometer" value={`${v.kilometerTerakhir?.toLocaleString()} km`} />
            <DetailItem icon={v.jenisKendaraan === 'RODA_2' ? Bike : Car} label="Warna" value={v.warna || '-'} />
          </div>

          {/* Active Service Alert */}
          {data.serviceSummary.activeService && (
            <Card className="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
                    <Wrench className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">Service Aktif</p>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400">{data.serviceSummary.activeService.nomorService}</p>
                  </div>
                  <Badge className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0">
                    {data.serviceSummary.activeService.statusService}
                  </Badge>
                </div>
                {data.serviceSummary.activeService.bengkel && (
                  <p className="text-[11px] text-muted-foreground ml-9">
                    Bengkel: {data.serviceSummary.activeService.bengkel}
                  </p>
                )}
                <div className="mt-2 ml-9">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">{data.serviceSummary.activeService.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(data.serviceSummary.activeService.progress, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted/50 border border-border/30 p-3 text-center">
              <p className="text-xl font-bold">{data.serviceSummary.totalServiceCount}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Total Service</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border/30 p-3 text-center">
              <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{data.serviceSummary.activeServiceCount}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Aktif</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border/30 p-3 text-center">
              <p className="text-sm font-bold">{formatCurrency(data.serviceSummary.totalBiayaService)}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Total Biaya</p>
            </div>
          </div>

          {/* Recent Services */}
          {data.recentServices && data.recentServices.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Service Terbaru</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {data.recentServices.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 shrink-0">
                        <Wrench className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium truncate">{s.nomorService}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(s.tanggalService)} &bull; {s.bengkel}</p>
                      </div>
                    </div>
                    <Badge
                      className={`text-[9px] shrink-0 ${serviceStatusColors[s.statusService] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {s.statusService}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Info */}
          {data.currentBudget && (
            <Card className="border-border/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                    <Wallet className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs font-semibold">Anggaran {data.currentBudget.tahun}</p>
                  <Badge
                    className={`text-[9px] ml-auto ${
                      data.currentBudget.statusAnggaran === 'AKTIF'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : data.currentBudget.statusAnggaran === 'HABIS'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {data.currentBudget.statusAnggaran}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-muted-foreground">Anggaran</p>
                    <p className="font-semibold">{formatCurrency(data.currentBudget.totalAnggaran)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Terpakai</p>
                    <p className="font-semibold text-orange-600">{formatCurrency(data.currentBudget.realisisai || data.currentBudget.realisasi)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sisa</p>
                    <p className="font-semibold text-emerald-600">{formatCurrency(data.currentBudget.sisaAnggaran)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-9 text-xs gap-1.5"
              onClick={onRescan}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Scan Lagi
            </Button>
            <Button
              className="flex-1 rounded-xl h-9 text-xs gap-1.5"
              onClick={() => {
                setCurrentPage('kendaraan')
                onClose()
              }}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Lihat Kendaraan
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 shrink-0">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-xs font-semibold truncate">{value}</p>
      </div>
    </div>
  )
}
