import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahun = parseInt(searchParams.get('tahun') || new Date().getFullYear().toString())
    const bulan = searchParams.get('bulan') || ''
    const jenisKendaraan = searchParams.get('jenisKendaraan') || ''

    // Role-based filtering parameters
    const role = searchParams.get('role') || 'ADMIN'
    const bengkelId = searchParams.get('bengkelId') || ''
    const userId = searchParams.get('userId') || ''

    const isBengkel = role === 'BENGKEL' && bengkelId
    const isPimpinan = role === 'PIMPINAN'

    // ---------------------------------------------------------------------------
    // Build where clauses with role-based filters
    // ---------------------------------------------------------------------------

    // Base service filter
    const serviceWhere: Record<string, unknown> = { isDeleted: false }
    if (jenisKendaraan) {
      serviceWhere.vehicle = { jenisKendaraan }
    }
    if (bulan) {
      const monthInt = parseInt(bulan)
      const startDate = new Date(tahun, monthInt - 1, 1)
      const endDate = new Date(tahun, monthInt, 1)
      serviceWhere.tanggalService = { gte: startDate, lt: endDate }
    }
    // BENGKEL role: only their own services
    if (isBengkel) {
      serviceWhere.bengkelId = bengkelId
    }

    // Base vehicle filter
    const vehicleWhere: Record<string, unknown> = { isActive: true }
    if (jenisKendaraan) vehicleWhere.jenisKendaraan = jenisKendaraan

    // Base workshop filter
    const workshopWhere: Record<string, unknown> = { statusAktif: true }
    if (isBengkel) {
      workshopWhere.id = bengkelId
    }

    // Base budget filter
    const budgetWhere: Record<string, unknown> = { tahun }
    if (isBengkel) {
      // Only show budgets for vehicles that have been serviced by this bengkel
      budgetWhere.vehicle = {
        services: {
          some: { bengkelId, isDeleted: false },
        },
      }
    }

    // Notification filter
    const notificationWhere: Record<string, unknown> = { isRead: false }
    if (userId) {
      notificationWhere.userId = userId
    }

    // ---------------------------------------------------------------------------
    // Fetch data in parallel
    // ---------------------------------------------------------------------------
    const [vehicles, services, workshops, budgets, notifications] = await Promise.all([
      db.vehicle.findMany({ where: vehicleWhere }),
      db.service.findMany({
        where: serviceWhere,
        include: { vehicle: true, bengkel: true, items: true, history: true },
      }),
      db.workshop.findMany({ where: workshopWhere }),
      db.budget.findMany({
        where: budgetWhere,
        include: { vehicle: true },
      }),
      db.notification.findMany({
        where: notificationWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // ---------------------------------------------------------------------------
    // BENGKEL role: further filter vehicles to only those with services at this bengkel
    // ---------------------------------------------------------------------------
    let filteredVehicles = vehicles
    if (isBengkel) {
      const vehicleIdsWithBengkelServices = new Set(
        services.map(s => s.vehicleId)
      )
      filteredVehicles = vehicles.filter(v => vehicleIdsWithBengkelServices.has(v.id))
    }

    // ---------------------------------------------------------------------------
    // Compute statistics
    // ---------------------------------------------------------------------------

    // Vehicle stats
    const totalKendaraanRoda2 = filteredVehicles.filter(v => v.jenisKendaraan === 'RODA_2').length
    const totalKendaraanRoda4 = filteredVehicles.filter(v => v.jenisKendaraan === 'RODA_4').length

    // Service stats — PENGAJUAN is now included in the active service count
    const kendaraanAktifService = services.filter(s =>
      ['DIAJUKAN', 'PENGAJUAN', 'DISETUJUI', 'DIPROSES'].includes(s.statusService)
    ).length
    const kendaraanSelesaiService = services.filter(s => s.statusService === 'SELESAI').length

    // Per-status counts for bengkel dashboard
    const statusCounts = {
      diajukan: services.filter(s => s.statusService === 'DIAJUKAN').length,
      pengajuan: services.filter(s => s.statusService === 'PENGAJUAN').length,
      disetujui: services.filter(s => s.statusService === 'DISETUJUI').length,
      ditolak: services.filter(s => s.statusService === 'DITOLAK').length,
      diproses: services.filter(s => s.statusService === 'DIPROSES').length,
      menungguPersetujuan: services.filter(s => s.statusService === 'MENUNGGU_PERSETUJUAN').length,
      selesai: services.filter(s => s.statusService === 'SELESAI').length,
      pending: services.filter(s => s.statusService === 'PENDING').length,
    }

    // Budget stats
    const totalAnggaran = budgets.reduce((s, b) => s + b.totalAnggaran, 0)
    const totalAnggaranTerpakai = budgets.reduce((s, b) => s + b.realisasi, 0)
    const sisaAnggaran = totalAnggaran - totalAnggaranTerpakai

    // Monthly spending chart (last 12 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
    const pengeluaranBulanan = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(tahun, new Date().getMonth() - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const monthServices = services.filter(s => {
        const sd = new Date(s.tanggalService)
        return sd.getMonth() === m && sd.getFullYear() === y && s.statusService === 'SELESAI'
      })
      const total = monthServices.reduce((sum, s) => sum + s.totalBiaya, 0)
      pengeluaranBulanan.push({ bulan: `${monthNames[m]} ${y}`, total })
    }

    // Most serviced vehicles (top 5)
    const vehicleServiceCount: Record<string, { nomorPolisi: string; merk: string; total: number }> = {}
    services.forEach(s => {
      const vid = s.vehicleId
      if (!vehicleServiceCount[vid]) {
        vehicleServiceCount[vid] = {
          nomorPolisi: s.vehicle?.nomorPolisi || '-',
          merk: s.vehicle?.merk || '-',
          total: 0,
        }
      }
      vehicleServiceCount[vid].total++
    })
    const kendaraanSeringService = Object.values(vehicleServiceCount)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Workshop stats
    const statistikBengkel = workshops.map(w => {
      const count = services.filter(s => s.bengkelId === w.id).length
      return { nama: w.namaBengkel, total: count }
    }).sort((a, b) => b.total - a.total)

    // Over budget alerts
    const alertOverBudget = budgets
      .filter(b => b.realisasi > b.totalAnggaran * 0.7)
      .map(b => {
        // Budget query includes { vehicle: true }, so b.vehicle is available
        const vehicle = (b as Record<string, unknown> & { vehicle?: { nomorPolisi?: string } }).vehicle
          || filteredVehicles.find(v => v.id === b.vehicleId)
        return {
          nomorPolisi: vehicle?.nomorPolisi || '-',
          total: b.realisasi,
          anggaran: b.totalAnggaran,
          persen: Math.round((b.realisasi / b.totalAnggaran) * 100),
        }
      })

    // Late service alerts
    const alertTerlambat = services
      .filter(s => {
        if (s.statusService === 'SELESAI' || !s.estimasiLamaPerbaikan) return false
        const estDate = new Date(s.tanggalService)
        estDate.setDate(estDate.getDate() + s.estimasiLamaPerbaikan)
        return new Date() > estDate
      })
      .map(s => ({
        nomorPolisi: s.vehicle?.nomorPolisi || '-',
        estimasi: s.estimasiLamaPerbaikan ? `${s.estimasiLamaPerbaikan} hari` : '-',
        hariTerlambat: Math.ceil((new Date().getTime() - new Date(s.tanggalService).getTime()) / (1000 * 60 * 60 * 24)),
      }))

    // In-progress services — include PENGAJUAN so bengkel sees their submissions
    const progressPerbaikan = services
      .filter(s => ['DIPROSES', 'DISETUJUI', 'PENGAJUAN'].includes(s.statusService))
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        nomorService: s.nomorService,
        nomorPolisi: s.vehicle?.nomorPolisi || '-',
        merk: s.vehicle?.merk || '-',
        bengkel: s.bengkel?.namaBengkel || '-',
        progress: s.progress,
        statusService: s.statusService,
        tanggalService: s.tanggalService,
        estimasiLamaPerbaikan: s.estimasiLamaPerbaikan,
      }))

    // ---------------------------------------------------------------------------
    // Notification count for bengkel user
    // ---------------------------------------------------------------------------
    let notifikasiCount = 0
    if (userId) {
      notifikasiCount = await db.notification.count({
        where: { userId, isRead: false },
      })
    }

    // ---------------------------------------------------------------------------
    // Build response with role context
    // ---------------------------------------------------------------------------
    return NextResponse.json({
      // Role context for the frontend
      userRole: role,
      bengkelId: isBengkel ? bengkelId : null,
      readOnly: isPimpinan,

      // Stats
      totalKendaraanRoda2,
      totalKendaraanRoda4,
      kendaraanAktifService,
      kendaraanSelesaiService,
      totalAnggaranTahun: totalAnggaran,
      totalAnggaranTerpakai,
      sisaAnggaran,

      // Per-status breakdown (useful for bengkel dashboard)
      statusCounts,

      // Charts & lists
      pengeluaranBulanan,
      kendaraanSeringService,
      statistikBengkel,

      // Notifications
      notifikasiTerbaru: notifications,
      notifikasiCount,

      // Alerts
      alertOverBudget,
      alertTerlambat,
      progressPerbaikan,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
