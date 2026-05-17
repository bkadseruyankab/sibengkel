import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')
    const bengkelId = searchParams.get('bengkelId')
    const statusService = searchParams.get('statusService')
    const jenisKendaraan = searchParams.get('jenisKendaraan')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

    const where: any = { isDeleted: false }

    if (vehicleId) where.vehicleId = vehicleId
    if (bengkelId) where.bengkelId = bengkelId
    if (statusService) where.statusService = statusService
    if (dateFrom || dateTo) {
      where.tanggalService = {}
      if (dateFrom) where.tanggalService.gte = new Date(dateFrom)
      if (dateTo) where.tanggalService.lte = new Date(dateTo)
    }
    if (jenisKendaraan) {
      where.vehicle = { jenisKendaraan }
    }
    if (search) {
      where.vehicle = {
        ...where.vehicle,
        nomorPolisi: { contains: search },
      }
    }

    const services = await db.service.findMany({
      where,
      include: {
        vehicle: true,
        bengkel: true,
        items: {
          include: {
            photos: true,
          },
        },
        spareParts: {
          include: {
            sparePart: true,
          },
        },
        history: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { tanggalService: 'desc' },
    })

    // Calculate summary
    const totalBiaya = services.reduce((sum, s) => sum + s.totalBiaya, 0)
    const completedServices = services.filter(s => s.statusService === 'SELESAI')
    const serviceCount = services.length

    // Most common service items
    const itemCounts: Record<string, number> = {}
    services.forEach(s => {
      s.items.forEach(item => {
        itemCounts[item.itemName] = (itemCounts[item.itemName] || 0) + 1
      })
    })
    const commonItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    const avgCost = serviceCount > 0 ? totalBiaya / completedServices.length : 0

    // Monthly cost data for chart
    const monthlyCosts: Record<string, number> = {}
    services.forEach(s => {
      if (s.statusService === 'SELESAI') {
        const month = new Date(s.tanggalService).toISOString().slice(0, 7)
        monthlyCosts[month] = (monthlyCosts[month] || 0) + s.totalBiaya
      }
    })
    const chartData = Object.entries(monthlyCosts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total }))

    // Service item distribution for pie chart
    const itemDistribution: Record<string, number> = {}
    services.forEach(s => {
      s.items.forEach(item => {
        itemDistribution[item.itemName] = (itemDistribution[item.itemName] || 0) + item.totalHarga
      })
    })
    const pieData = Object.entries(itemDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))

    return NextResponse.json({
      services,
      summary: {
        totalBiaya,
        serviceCount,
        avgCost,
        commonItems,
      },
      chartData,
      pieData,
    })
  } catch (error) {
    console.error('Error fetching riwayat:', error)
    return NextResponse.json({ error: 'Failed to fetch service history' }, { status: 500 })
  }
}
