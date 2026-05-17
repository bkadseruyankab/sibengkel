import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/anggaran/validate - Validate budget for service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vehicleId, biaya, serviceId } = body

    if (!vehicleId || biaya === undefined || biaya === null) {
      return NextResponse.json(
        { error: 'vehicleId dan biaya wajib diisi' },
        { status: 400 }
      )
    }

    // Get current year budget for the vehicle
    const currentYear = new Date().getFullYear()
    const budget = await db.budget.findUnique({
      where: {
        tahun_vehicleId: {
          tahun: currentYear,
          vehicleId,
        },
      },
    })

    // If no budget set, return INFO level
    if (!budget) {
      // Get vehicle jenisKendaraan for context
      const vehicle = await db.vehicle.findUnique({
        where: { id: vehicleId },
        select: { jenisKendaraan: true },
      })

      return NextResponse.json({
        data: {
          level: 'INFO',
          message: 'Belum ada anggaran yang ditetapkan untuk kendaraan ini pada tahun ini',
          anggaranTotal: 0,
          anggaranTerpakai: 0,
          prediksiSetelahService: biaya,
          sisaAnggaran: 0,
          kekuranganDana: biaya,
          canSave: true,
          jenisKendaraan: vehicle?.jenisKendaraan || null,
        },
      })
    }

    // Calculate current usage (total of all non-deleted, non-rejected services for this vehicle this year)
    const startOfYear = new Date(currentYear, 0, 1)
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)

    const usedServices = await db.service.findMany({
      where: {
        vehicleId,
        isDeleted: false,
        statusService: { notIn: ['DITOLAK'] },
        tanggalService: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      select: { id: true, totalBiaya: true },
    })

    let anggaranTerpakai = usedServices.reduce((sum, s) => sum + s.totalBiaya, 0)

    // For edit mode, subtract the old service cost
    if (serviceId) {
      const oldService = usedServices.find((s) => s.id === serviceId)
      if (oldService) {
        anggaranTerpakai -= oldService.totalBiaya
      }
    }

    const prediksiSetelahService = anggaranTerpakai + biaya
    const sisaAnggaran = budget.totalAnggaran - prediksiSetelahService
    const kekuranganDana = Math.max(0, -sisaAnggaran)

    const usagePercent = budget.totalAnggaran > 0
      ? (prediksiSetelahService / budget.totalAnggaran) * 100
      : biaya > 0 ? 100 : 0

    let level: 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR'
    let message: string
    let canSave: boolean

    if (usagePercent < 80) {
      level = 'INFO'
      message = `Anggaran masih mencukupi. Penggunaan ${usagePercent.toFixed(1)}% dari total anggaran.`
      canSave = true
    } else if (usagePercent < 90) {
      level = 'WARNING'
      message = `Perhatian! Penggunaan anggaran已达 ${usagePercent.toFixed(1)}%. Sisa anggaran terbatas.`
      canSave = true
    } else if (usagePercent < 100) {
      level = 'CRITICAL'
      message = `PERINGATAN KRITIS! Penggunaan anggaran已达 ${usagePercent.toFixed(1)}%. Anggaran hampir habis!`
      canSave = true
    } else {
      level = 'ERROR'
      message = `ANGGARAN TIDAK MENCUKUPI! Penggunaan已达 ${usagePercent.toFixed(1)}%. Kekurangan Rp ${kekuranganDana.toLocaleString('id-ID')}.`
      canSave = false
    }

    return NextResponse.json({
      data: {
        level,
        message,
        anggaranTotal: budget.totalAnggaran,
        anggaranTerpakai,
        prediksiSetelahService,
        sisaAnggaran,
        kekuranganDana,
        canSave,
        jenisKendaraan: budget.jenisKendaraan,
      },
    })
  } catch (error) {
    console.error('Error validating budget:', error)
    return NextResponse.json({ error: 'Gagal memvalidasi anggaran' }, { status: 500 })
  }
}
