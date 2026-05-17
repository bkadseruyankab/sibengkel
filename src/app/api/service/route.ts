import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendNotificationToBengkel } from '@/lib/notifications'

// GET /api/service - List services with pagination, search, and filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const statusService = searchParams.get('statusService')
    const bengkelId = searchParams.get('bengkelId')
    const vehicleId = searchParams.get('vehicleId')
    const jenisService = searchParams.get('jenisService')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { isDeleted: false }

    if (search) {
      where.OR = [
        { nomorService: { contains: search } },
        { keterangan: { contains: search } },
        { vehicle: { nomorPolisi: { contains: search } } },
        { vehicle: { namaPengguna: { contains: search } } },
        { vehicle: { merk: { contains: search } } },
        { bengkel: { namaBengkel: { contains: search } } },
      ]
    }

    if (statusService) {
      where.statusService = statusService
    }
    if (bengkelId) {
      where.bengkelId = bengkelId
    }
    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    if (jenisService) {
      where.jenisService = jenisService
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo)
      where.tanggalService = dateFilter
    }

    const [services, total] = await Promise.all([
      db.service.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              nomorPolisi: true,
              namaPengguna: true,
              merk: true,
              type: true,
              jenisKendaraan: true,
            },
          },
          bengkel: {
            select: {
              id: true,
              namaBengkel: true,
              alamat: true,
              noTelepon: true,
            },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.service.count({ where }),
    ])

    return NextResponse.json({
      data: services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Gagal mengambil data service' }, { status: 500 })
  }
}

// Generate nomorService format: SVC-YYYYMM-XXXX
async function generateNomorService(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `SVC-${year}${month}-`

  const lastService = await db.service.findFirst({
    where: { nomorService: { startsWith: prefix } },
    orderBy: { nomorService: 'desc' },
    select: { nomorService: true },
  })

  let nextNumber = 1
  if (lastService) {
    const lastNumber = parseInt(lastService.nomorService.split('-').pop() || '0')
    nextNumber = lastNumber + 1
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`
}

// POST /api/service - Create new service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tanggalService,
      vehicleId,
      bengkelId,
      jenisService,
      keterangan,
      kilometerService,
      estimasiBiaya,
      estimasiLamaPerbaikan,
      prioritas,
      items,
    } = body

    // Validate required fields
    if (!tanggalService || !vehicleId || !bengkelId || !jenisService) {
      return NextResponse.json(
        { error: 'Tanggal service, kendaraan, bengkel, dan jenis service wajib diisi' },
        { status: 400 }
      )
    }

    const nomorService = await generateNomorService()

    // Generate document number from penomoran surat system
    let documentNumber: string | null = null
    try {
      const docType = await db.documentNumbering.findFirst({
        where: { isActive: true, code: { contains: 'SRV' } },
      })
      if (docType) {
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1

        // Reset counter if year has changed
        let newNum: number
        if (docType.lastYear !== currentYear) {
          newNum = 1
        } else {
          newNum = docType.currentNumber + 1
        }

        // Update the counter
        await db.documentNumbering.update({
          where: { id: docType.id },
          data: { currentNumber: newNum, lastYear: currentYear },
        })

        const paddedNumber = String(newNum).padStart(docType.digitCount, '0')
        const paddedMonth = String(currentMonth).padStart(2, '0')
        documentNumber = `${docType.prefix}/${docType.code}/${paddedNumber}/${paddedMonth}/${currentYear}`
      }
    } catch (error) {
      console.error('Error generating document number:', error)
      // Non-fatal: service can still be created without documentNumber
    }

    // Calculate total from items
    const totalBiaya = items
      ? items.reduce((sum: number, item: { totalHarga?: number; hargaSatuan?: number; quantity?: number }) => 
          sum + (item.totalHarga || (item.hargaSatuan || 0) * (item.quantity || 1)), 0)
      : estimasiBiaya || 0

    const service = await db.service.create({
      data: {
        nomorService,
        documentNumber,
        tanggalService: new Date(tanggalService),
        vehicleId,
        bengkelId,
        jenisService,
        keterangan: keterangan || null,
        kilometerService: kilometerService || 0,
        estimasiBiaya: estimasiBiaya || 0,
        totalBiaya,
        prioritas: prioritas || 'NORMAL',
        estimasiLamaPerbaikan: estimasiLamaPerbaikan || null,
        statusService: 'DIAJUKAN',
        progress: 0,
        items: items
          ? {
              create: items.map((item: { itemName: string; quantity: number; hargaSatuan: number; keterangan?: string }) => ({
                itemName: item.itemName,
                quantity: item.quantity || 1,
                hargaSatuan: item.hargaSatuan || 0,
                totalHarga: (item.quantity || 1) * (item.hargaSatuan || 0),
                keterangan: item.keterangan || null,
              })),
            }
          : undefined,
      },
      include: {
        vehicle: true,
        bengkel: true,
        items: true,
      },
    })

    // Update vehicle kilometer if provided
    if (kilometerService && kilometerService > 0) {
      const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } })
      if (vehicle && kilometerService > vehicle.kilometerTerakhir) {
        await db.vehicle.update({
          where: { id: vehicleId },
          data: { kilometerTerakhir: kilometerService },
        })
      }
    }

    // Create service history
    await db.serviceHistory.create({
      data: {
        serviceId: service.id,
        vehicleId,
        status: 'DIAJUKAN',
        keterangan: 'Service baru diajukan',
      },
    })

    // Send notification to bengkel users about the new service assignment
    const displayNumber = documentNumber || nomorService
    await sendNotificationToBengkel(
      bengkelId,
      'Service Baru Ditugaskan',
      `Service ${displayNumber} untuk kendaraan ${service.vehicle?.nomorPolisi || '-'} telah ditugaskan ke bengkel Anda. Silakan proses pengajuan.`,
      'INFO',
    )

    return NextResponse.json({ data: service }, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Gagal membuat service baru' }, { status: 500 })
  }
}
