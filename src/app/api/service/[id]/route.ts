import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendNotificationToAdmins } from '@/lib/notifications'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/service/[id] - Get service detail with items
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const service = await db.service.findUnique({
      where: { id },
      include: {
        vehicle: true,
        bengkel: true,
        items: {
          include: { photos: true },
        },
        documents: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ data: service })
  } catch (error) {
    console.error('Error fetching service detail:', error)
    return NextResponse.json({ error: 'Gagal mengambil detail service' }, { status: 500 })
  }
}

// PUT /api/service/[id] - Update service
// Allowed statuses: DIAJUKAN (admin/bengkel edit), DITOLAK (bengkel can fix and resubmit)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const existingService = await db.service.findUnique({ where: { id } })
    if (!existingService || existingService.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    // Handle documentNumber update separately (can be done at any status)
    if (body.documentNumber !== undefined && Object.keys(body).filter(k => k !== 'documentNumber').length === 0) {
      const service = await db.service.update({
        where: { id },
        data: { documentNumber: body.documentNumber },
      })
      return NextResponse.json({ data: service })
    }

    // Allow editing for DIAJUKAN and DITOLAK status
    // DITOLAK: bengkel can fix and resubmit their pengajuan
    if (existingService.statusService !== 'DIAJUKAN' && existingService.statusService !== 'DITOLAK') {
      return NextResponse.json(
        { error: 'Service hanya dapat diedit pada status DIAJUKAN atau DITOLAK' },
        { status: 400 }
      )
    }

    const wasDitolak = existingService.statusService === 'DITOLAK'

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

    // Calculate total from items
    const totalBiaya = items
      ? items.reduce((sum: number, item: { totalHarga?: number; hargaSatuan?: number; quantity?: number }) => 
          sum + (item.totalHarga || (item.hargaSatuan || 0) * (item.quantity || 1)), 0)
      : estimasiBiaya || existingService.estimasiBiaya

    // Delete existing items and recreate
    if (items) {
      await db.serviceItem.deleteMany({ where: { serviceId: id } })
    }

    const service = await db.service.update({
      where: { id },
      data: {
        tanggalService: tanggalService ? new Date(tanggalService) : undefined,
        vehicleId: vehicleId || undefined,
        bengkelId: bengkelId || undefined,
        jenisService: jenisService || undefined,
        keterangan: keterangan !== undefined ? keterangan : undefined,
        kilometerService: kilometerService !== undefined ? kilometerService : undefined,
        estimasiBiaya: estimasiBiaya !== undefined ? estimasiBiaya : undefined,
        totalBiaya,
        estimasiLamaPerbaikan: estimasiLamaPerbaikan !== undefined ? estimasiLamaPerbaikan : undefined,
        prioritas: prioritas || undefined,
        // When editing after DITOLAK, reset to DIAJUKAN so bengkel can resubmit via "Kirim Pengajuan"
        statusService: 'DIAJUKAN',
        rejectedReason: wasDitolak ? null : undefined,
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
        items: {
          include: { photos: true },
        },
      },
    })

    // Create history
    const historyKeterangan = wasDitolak
      ? 'Service diperbarui setelah penolakan, menunggu pengajuan ulang dari bengkel'
      : 'Service diperbarui'
    await db.serviceHistory.create({
      data: {
        serviceId: id,
        vehicleId: service.vehicleId,
        status: 'DIAJUKAN',
        keterangan: historyKeterangan,
      },
    })

    // If service was previously DITOLAK and now being revised, notify admins
    if (wasDitolak) {
      await sendNotificationToAdmins(
        'Service Diperbarui Setelah Penolakan',
        `Service ${service.nomorService} yang sebelumnya ditolak telah diperbarui oleh bengkel dan menunggu pengajuan ulang.`,
        'INFO',
      )
    }

    return NextResponse.json({ data: service })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Gagal mengupdate service' }, { status: 500 })
  }
}

// DELETE /api/service/[id] - Soft delete
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const existingService = await db.service.findUnique({ where: { id } })
    if (!existingService || existingService.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    await db.service.update({
      where: { id },
      data: { isDeleted: true },
    })

    await db.serviceHistory.create({
      data: {
        serviceId: id,
        vehicleId: existingService.vehicleId,
        status: 'DELETED',
        keterangan: 'Service dihapus',
      },
    })

    return NextResponse.json({ message: 'Service berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Gagal menghapus service' }, { status: 500 })
  }
}
