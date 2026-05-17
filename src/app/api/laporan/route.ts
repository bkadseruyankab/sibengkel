import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'tahunan'
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const month = searchParams.get('month')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const vehicleId = searchParams.get('vehicleId')
    const bengkelId = searchParams.get('bengkelId')
    const jenisKendaraan = searchParams.get('jenisKendaraan')
    const statusService = searchParams.get('statusService')
    const jenisService = searchParams.get('jenisService')
    const skpdBidang = searchParams.get('skpdBidang')

    const where: any = { isDeleted: false }

    // Date filtering based on report type
    const yearNum = parseInt(year)
    if (type === 'tahunan') {
      where.tanggalService = {
        gte: new Date(yearNum, 0, 1),
        lte: new Date(yearNum, 11, 31),
      }
    } else if (type === 'bulanan' && month) {
      const monthNum = parseInt(month) - 1
      where.tanggalService = {
        gte: new Date(yearNum, monthNum, 1),
        lte: new Date(yearNum, monthNum + 1, 0),
      }
    } else if (type === 'triwulan') {
      const triwulan = parseInt(searchParams.get('triwulan') || '1')
      const startMonth = (triwulan - 1) * 3
      where.tanggalService = {
        gte: new Date(yearNum, startMonth, 1),
        lte: new Date(yearNum, startMonth + 3, 0),
      }
    } else if (type === 'semester') {
      const semester = parseInt(searchParams.get('semester') || '1')
      const startMonth = (semester - 1) * 6
      where.tanggalService = {
        gte: new Date(yearNum, startMonth, 1),
        lte: new Date(yearNum, startMonth + 6, 0),
      }
    } else if (type === 'custom' && dateFrom && dateTo) {
      where.tanggalService = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      }
    }

    if (vehicleId) where.vehicleId = vehicleId
    if (bengkelId) where.bengkelId = bengkelId
    if (statusService) where.statusService = statusService
    if (jenisService) where.jenisService = jenisService
    if (jenisKendaraan) {
      where.vehicle = { jenisKendaraan }
    }
    if (skpdBidang) {
      where.vehicle = { ...(where.vehicle || {}), skpdBidang: { contains: skpdBidang } }
    }

    const services = await db.service.findMany({
      where,
      include: {
        vehicle: true,
        bengkel: true,
        items: {
          include: { photos: true },
        },
        spareParts: {
          include: { sparePart: true },
        },
      },
      orderBy: { tanggalService: 'desc' },
    })

    // Aggregate statistics
    const totalBiaya = services.reduce((sum, s) => sum + s.totalBiaya, 0)
    const totalEstimasi = services.reduce((sum, s) => sum + s.estimasiBiaya, 0)
    const completedCount = services.filter(s => s.statusService === 'SELESAI').length
    const inProgressCount = services.filter(s => ['DIPROSES', 'DISETUJUI', 'DIAJUKAN'].includes(s.statusService)).length
    const rejectedCount = services.filter(s => s.statusService === 'DITOLAK').length
    const pendingCount = services.filter(s => s.statusService === 'PENDING').length

    // Status distribution
    const statusDistribution: Record<string, number> = {}
    services.forEach(s => {
      statusDistribution[s.statusService] = (statusDistribution[s.statusService] || 0) + 1
    })

    // Jenis service distribution
    const jenisDistribution: Record<string, number> = {}
    services.forEach(s => {
      jenisDistribution[s.jenisService] = (jenisDistribution[s.jenisService] || 0) + 1
    })

    // Bengkel distribution
    const bengkelDistribution: Record<string, { name: string; count: number; total: number }> = {}
    services.forEach(s => {
      const name = s.bengkel?.namaBengkel || 'Tidak Ada Bengkel'
      if (!bengkelDistribution[s.bengkelId]) {
        bengkelDistribution[s.bengkelId] = { name, count: 0, total: 0 }
      }
      bengkelDistribution[s.bengkelId].count++
      bengkelDistribution[s.bengkelId].total += s.totalBiaya
    })

    // Monthly breakdown
    const monthlyBreakdown: Record<string, { count: number; total: number }> = {}
    services.forEach(s => {
      const month = new Date(s.tanggalService).toISOString().slice(0, 7)
      if (!monthlyBreakdown[month]) monthlyBreakdown[month] = { count: 0, total: 0 }
      monthlyBreakdown[month].count++
      monthlyBreakdown[month].total += s.totalBiaya
    })

    // Vehicle type breakdown
    const vehicleTypeBreakdown: Record<string, { count: number; total: number }> = {}
    services.forEach(s => {
      const type = s.vehicle?.jenisKendaraan || 'TIDAK_DIKETAHUI'
      if (!vehicleTypeBreakdown[type]) vehicleTypeBreakdown[type] = { count: 0, total: 0 }
      vehicleTypeBreakdown[type].count++
      vehicleTypeBreakdown[type].total += s.totalBiaya
    })

    // Budget info
    const budgets = await db.budget.findMany({
      where: { tahun: yearNum },
      include: { vehicle: true },
    })
    const totalAnggaran = budgets.reduce((sum, b) => sum + b.totalAnggaran, 0)
    const totalRealisasi = budgets.reduce((sum, b) => sum + b.realisasi, 0)

    // Budget breakdown by vehicle type
    const budgetByType = {
      RODA_2: {
        totalAnggaran: budgets.filter(b => b.jenisKendaraan === 'RODA_2').reduce((sum, b) => sum + b.totalAnggaran, 0),
        realisasi: budgets.filter(b => b.jenisKendaraan === 'RODA_2').reduce((sum, b) => sum + b.realisasi, 0),
        sisaAnggaran: 0,
        persentase: 0,
        serviceCount: services.filter(s => s.vehicle?.jenisKendaraan === 'RODA_2').length,
        vehicleCount: budgets.filter(b => b.jenisKendaraan === 'RODA_2').length,
      },
      RODA_4: {
        totalAnggaran: budgets.filter(b => b.jenisKendaraan === 'RODA_4').reduce((sum, b) => sum + b.totalAnggaran, 0),
        realisasi: budgets.filter(b => b.jenisKendaraan === 'RODA_4').reduce((sum, b) => sum + b.realisasi, 0),
        sisaAnggaran: 0,
        persentase: 0,
        serviceCount: services.filter(s => s.vehicle?.jenisKendaraan === 'RODA_4').length,
        vehicleCount: budgets.filter(b => b.jenisKendaraan === 'RODA_4').length,
      },
    }
    budgetByType.RODA_2.sisaAnggaran = budgetByType.RODA_2.totalAnggaran - budgetByType.RODA_2.realisasi
    budgetByType.RODA_2.persentase = budgetByType.RODA_2.totalAnggaran > 0
      ? (budgetByType.RODA_2.realisasi / budgetByType.RODA_2.totalAnggaran) * 100
      : 0
    budgetByType.RODA_4.sisaAnggaran = budgetByType.RODA_4.totalAnggaran - budgetByType.RODA_4.realisasi
    budgetByType.RODA_4.persentase = budgetByType.RODA_4.totalAnggaran > 0
      ? (budgetByType.RODA_4.realisasi / budgetByType.RODA_4.totalAnggaran) * 100
      : 0

    // Monthly breakdown by vehicle type for chart
    const monthlyByType: Record<string, { month: string; roda2: number; roda4: number }> = {}
    services.forEach(s => {
      const monthKey = new Date(s.tanggalService).toISOString().slice(0, 7)
      if (!monthlyByType[monthKey]) monthlyByType[monthKey] = { month: monthKey, roda2: 0, roda4: 0 }
      if (s.vehicle?.jenisKendaraan === 'RODA_2') {
        monthlyByType[monthKey].roda2 += s.totalBiaya
      } else {
        monthlyByType[monthKey].roda4 += s.totalBiaya
      }
    })

    return NextResponse.json({
      services,
      statistics: {
        totalBiaya,
        totalEstimasi,
        serviceCount: services.length,
        completedCount,
        inProgressCount,
        rejectedCount,
        pendingCount,
        statusDistribution,
        jenisDistribution,
        bengkelDistribution: Object.values(bengkelDistribution),
        monthlyBreakdown: Object.entries(monthlyBreakdown)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, data]) => ({ month, ...data })),
        vehicleTypeBreakdown,
        totalAnggaran,
        totalRealisasi,
        sisaAnggaran: totalAnggaran - totalRealisasi,
        persentaseRealisasi: totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0,
        budgetByType,
        monthlyByType: Object.values(monthlyByType).sort((a, b) => a.month.localeCompare(b.month)),
      },
      filters: { type, year, month, dateFrom, dateTo, vehicleId, bengkelId, jenisKendaraan, statusService, jenisService, skpdBidang },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
