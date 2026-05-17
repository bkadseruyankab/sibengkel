import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params

    const vehicle = await db.vehicle.findUnique({
      where: { qrCodeHash: hash },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        services: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            bengkel: {
              select: { id: true, namaBengkel: true },
            },
          },
        },
        budgets: {
          orderBy: { tahun: 'desc' },
          take: 1,
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Kendaraan tidak ditemukan', found: false },
        { status: 404 }
      )
    }

    if (!vehicle.isActive) {
      return NextResponse.json(
        { error: 'Kendaraan ini sudah tidak aktif', found: false, inactive: true },
        { status: 404 }
      )
    }

    // Calculate service stats
    const totalServiceCount = vehicle.services.length
    const activeServiceCount = vehicle.services.filter(
      s => !['SELESAI', 'DITOLAK'].includes(s.statusService)
    ).length
    const totalBiayaService = vehicle.services.reduce(
      (sum, s) => sum + s.totalBiaya,
      0
    )

    // Get current active service if any
    const activeService = vehicle.services.find(
      s => !['SELESAI', 'DITOLAK'].includes(s.statusService)
    )

    return NextResponse.json({
      found: true,
      vehicle: {
        id: vehicle.id,
        nomorPolisi: vehicle.nomorPolisi,
        namaPengguna: vehicle.namaPengguna,
        skpdBidang: vehicle.skpdBidang,
        jenisKendaraan: vehicle.jenisKendaraan,
        merk: vehicle.merk,
        type: vehicle.type,
        tahun: vehicle.tahun,
        nomorRangka: vehicle.nomorRangka,
        nomorMesin: vehicle.nomorMesin,
        warna: vehicle.warna,
        statusKendaraan: vehicle.statusKendaraan,
        kondisiKendaraan: vehicle.kondisiKendaraan,
        kilometerTerakhir: vehicle.kilometerTerakhir,
        qrCodeHash: vehicle.qrCodeHash,
      },
      serviceSummary: {
        totalServiceCount,
        activeServiceCount,
        totalBiayaService,
        activeService: activeService ? {
          id: activeService.id,
          nomorService: activeService.nomorService,
          jenisService: activeService.jenisService,
          statusService: activeService.statusService,
          progress: activeService.progress,
          bengkel: activeService.bengkel?.namaBengkel,
        } : null,
      },
      recentServices: vehicle.services.slice(0, 5).map(s => ({
        id: s.id,
        nomorService: s.nomorService,
        jenisService: s.jenisService,
        statusService: s.statusService,
        tanggalService: s.tanggalService,
        totalBiaya: s.totalBiaya,
        progress: s.progress,
        bengkel: s.bengkel?.namaBengkel,
      })),
      currentBudget: vehicle.budgets[0] ? {
        tahun: vehicle.budgets[0].tahun,
        totalAnggaran: vehicle.budgets[0].totalAnggaran,
        realisasi: vehicle.budgets[0].realisasi,
        sisaAnggaran: vehicle.budgets[0].sisaAnggaran,
        statusAnggaran: vehicle.budgets[0].statusAnggaran,
      } : null,
    })
  } catch (error) {
    console.error('Error fetching vehicle by QR hash:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data kendaraan', found: false },
      { status: 500 }
    )
  }
}
