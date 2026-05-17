import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/service/verify/[id] - Public verification endpoint (no auth required)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const service = await db.service.findUnique({
      where: { id },
      include: {
        vehicle: true,
        bengkel: true,
        items: true,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan', valid: false }, { status: 404 })
    }

    // Get app settings for organization info
    const settings = await db.systemSetting.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach(s => {
      settingsMap[s.key] = s.value || ''
    })

    const STATUS_LABELS: Record<string, string> = {
      MENUNGGU_PENGAJUAN: 'Menunggu Pengajuan',
      DIAJUKAN: 'Diajukan',
      DISETUJUI: 'Disetujui',
      DITOLAK: 'Ditolak',
      DIPROSES: 'Diproses',
      MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan',
      PENDING: 'Pending',
      SELESAI: 'Selesai',
    }

    const JENIS_SERVICE_LABELS: Record<string, string> = {
      RUTIN: 'Service Rutin',
      PERBAIKAN: 'Perbaikan',
      DARURAT: 'Darurat',
    }

    const PRIORITAS_LABELS: Record<string, string> = {
      RENDAH: 'Rendah',
      NORMAL: 'Normal',
      TINGGI: 'Tinggi',
      DARURAT: 'Darurat',
    }

    // Format currency
    const formatRupiah = (amount: number) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
    }

    // Build verification response
    const verificationData = {
      valid: true,
      document: {
        nomorService: service.nomorService,
        tanggalService: service.tanggalService,
        jenisService: JENIS_SERVICE_LABELS[service.jenisService] || service.jenisService,
        statusService: STATUS_LABELS[service.statusService] || service.statusService,
        statusRaw: service.statusService,
        prioritas: PRIORITAS_LABELS[service.prioritas] || service.prioritas,
        keterangan: service.keterangan,
        kilometerService: service.kilometerService,
        estimasiBiaya: formatRupiah(service.estimasiBiaya),
        totalBiaya: formatRupiah(service.totalBiaya),
        estimasiLamaPerbaikan: service.estimasiLamaPerbaikan,
        progress: service.progress,
        tanggalSelesai: service.tanggalSelesai,
        catatanAdmin: service.catatanAdmin,
        catatanBengkel: service.catatanBengkel,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      },
      vehicle: {
        nomorPolisi: service.vehicle.nomorPolisi,
        namaPengguna: service.vehicle.namaPengguna,
        skpdBidang: service.vehicle.skpdBidang,
        jenisKendaraan: service.vehicle.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4',
        merk: service.vehicle.merk,
        type: service.vehicle.type,
        tahun: service.vehicle.tahun,
        warna: service.vehicle.warna,
        kondisiKendaraan: service.vehicle.kondisiKendaraan,
      },
      bengkel: {
        namaBengkel: service.bengkel.namaBengkel,
        alamat: service.bengkel.alamat,
        noTelepon: service.bengkel.noTelepon,
      },
      items: service.items.map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
        hargaSatuan: formatRupiah(item.hargaSatuan),
        totalHarga: formatRupiah(item.totalHarga),
        keterangan: item.keterangan,
      })),
      history: service.history.map(h => ({
        status: STATUS_LABELS[h.status] || h.status,
        keterangan: h.keterangan,
        createdAt: h.createdAt,
      })),
      organization: {
        name: settingsMap.app_name || 'SIService BKAD',
        instansi: settingsMap.app_instansi || 'Badan Keuangan dan Aset Daerah',
        kepalaNama: settingsMap.app_kepala_nama,
        kepalaJabatan: settingsMap.app_kepala_jabatan || 'Kepala BKAD',
        kepalaNIP: settingsMap.app_kepala_nip,
      },
      verifiedAt: new Date().toISOString(),
    }

    return NextResponse.json(verificationData)
  } catch (error) {
    console.error('Error verifying document:', error)
    return NextResponse.json({ error: 'Gagal memverifikasi dokumen', valid: false }, { status: 500 })
  }
}
