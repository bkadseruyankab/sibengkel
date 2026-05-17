import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendNotificationToBengkel, sendNotificationToAdmins } from '@/lib/notifications'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/service/[id]/approve - Approve or reject service
// Supports three main flows:
// 1. PENGAJUAN → DISETUJUI / DITOLAK  (admin approves/rejects bengkel's item submission)
// 2. DIAJUKAN → DISETUJUI             (admin directly approves a new service)
// 3. MENUNGGU_PERSETUJUAN → SELESAI / DIPROSES  (admin approves/rejects completion)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { action, rejectedReason, approvedBy } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action harus approve atau reject' }, { status: 400 })
    }

    const service = await db.service.findUnique({
      where: { id },
      include: { vehicle: true, bengkel: true },
    })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    const isPengajuanFlow = service.statusService === 'PENGAJUAN'
    const isDiajukanFlow = service.statusService === 'DIAJUKAN'
    const isCompletionApproval = service.statusService === 'MENUNGGU_PERSETUJUAN'

    if (!isPengajuanFlow && !isDiajukanFlow && !isCompletionApproval) {
      return NextResponse.json(
        { error: 'Hanya service dengan status DIAJUKAN, PENGAJUAN, atau MENUNGGU_PERSETUJUAN yang dapat diproses' },
        { status: 400 }
      )
    }

    let newStatus: string
    let historyKeterangan: string
    let updateData: Record<string, unknown>

    if (isPengajuanFlow) {
      // --- PENGAJUAN flow: admin approves/rejects bengkel's submitted items ---
      if (action === 'approve') {
        // a. PENGAJUAN → DISETUJUI
        newStatus = 'DISETUJUI'
        historyKeterangan = 'Pengajuan service disetujui oleh admin. Bengkel dapat memulai pengerjaan.'
        updateData = {
          statusService: newStatus,
          approvedBy: approvedBy || 'admin',
          approvedAt: new Date(),
          rejectedReason: null,
        }
      } else {
        // b. PENGAJUAN → DITOLAK
        if (!rejectedReason) {
          return NextResponse.json(
            { error: 'Alasan penolakan wajib diisi' },
            { status: 400 }
          )
        }
        newStatus = 'DITOLAK'
        historyKeterangan = `Pengajuan service ditolak admin: ${rejectedReason}`
        updateData = {
          statusService: newStatus,
          approvedBy: null,
          approvedAt: null,
          rejectedReason,
        }
      }
    } else if (isDiajukanFlow) {
      // --- DIAJUKAN flow: admin directly approves/rejects new service ---
      if (action === 'approve') {
        // c. DIAJUKAN → DISETUJUI
        newStatus = 'DISETUJUI'
        historyKeterangan = 'Service disetujui oleh admin'
        updateData = {
          statusService: newStatus,
          approvedBy: approvedBy || 'admin',
          approvedAt: new Date(),
          rejectedReason: null,
          progress: 0,
        }
      } else {
        if (!rejectedReason) {
          return NextResponse.json(
            { error: 'Alasan penolakan wajib diisi' },
            { status: 400 }
          )
        }
        newStatus = 'DITOLAK'
        historyKeterangan = `Service ditolak: ${rejectedReason}`
        updateData = {
          statusService: newStatus,
          approvedBy: null,
          approvedAt: null,
          rejectedReason,
        }
      }
    } else {
      // --- MENUNGGU_PERSETUJUAN flow: admin approves/rejects completion ---
      if (action === 'approve') {
        // d. MENUNGGU_PERSETUJUAN → SELESAI
        newStatus = 'SELESAI'
        historyKeterangan = 'Pekerjaan bengkel disetujui. Service selesai.'
        updateData = {
          statusService: newStatus,
          tanggalSelesai: new Date(),
          progress: 100,
        }

        // Update vehicle condition to BAIK
        await db.vehicle.update({
          where: { id: service.vehicleId },
          data: { kondisiKendaraan: 'BAIK' },
        })

        // Update budget realisasi
        const currentYear = new Date().getFullYear()
        const budget = await db.budget.findFirst({
          where: { vehicleId: service.vehicleId, tahun: currentYear },
        })
        if (budget) {
          const newRealisasi = budget.realisasi + service.totalBiaya
          await db.budget.update({
            where: { id: budget.id },
            data: {
              realisasi: newRealisasi,
              sisaAnggaran: budget.totalAnggaran - newRealisasi,
              statusAnggaran: (budget.totalAnggaran - newRealisasi) <= 0 ? 'HABIS' : 'AKTIF',
            },
          })
          await db.budgetHistory.create({
            data: {
              budgetId: budget.id,
              perubahan: service.totalBiaya,
              keterangan: `Realisasi dari service ${service.nomorService}`,
              changedBy: approvedBy,
            },
          })
        }
      } else {
        // e. MENUNGGU_PERSETUJUAN → DIPROSES
        if (!rejectedReason) {
          return NextResponse.json(
            { error: 'Alasan penolakan wajib diisi' },
            { status: 400 }
          )
        }
        newStatus = 'DIPROSES'
        historyKeterangan = `Penyelesaian service ditolak admin: ${rejectedReason}. Service dikembalikan ke status DIPROSES.`
        updateData = {
          statusService: newStatus,
          rejectedReason,
          progress: Math.max(service.progress - 10, 50), // reduce progress slightly
        }
      }
    }

    const updatedService = await db.service.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: true,
        bengkel: true,
        items: true,
      },
    })

    await db.serviceHistory.create({
      data: {
        serviceId: id,
        vehicleId: service.vehicleId,
        status: newStatus,
        keterangan: historyKeterangan,
      },
    })

    // --- Send notifications ---
    if (isPengajuanFlow) {
      // Notify bengkel about pengajuan approval/rejection
      if (service.bengkelId) {
        if (action === 'approve') {
          await sendNotificationToBengkel(
            service.bengkelId,
            'Pengajuan Service Disetujui',
            `Pengajuan service ${service.nomorService} telah disetujui admin. Silakan mulai pengerjaan dengan klik "Update Progress".`,
            'SUCCESS',
          )
        } else {
          await sendNotificationToBengkel(
            service.bengkelId,
            'Pengajuan Service Ditolak',
            `Pengajuan service ${service.nomorService} ditolak admin. Alasan: ${rejectedReason}. Silakan perbaiki dan ajukan kembali.`,
            'ERROR',
          )
        }
      }
    } else if (isDiajukanFlow) {
      // Notify bengkel about direct approval/rejection
      if (service.bengkelId) {
        if (action === 'approve') {
          await sendNotificationToBengkel(
            service.bengkelId,
            'Service Disetujui',
            `Service ${service.nomorService} telah disetujui. Silakan mulai pengerjaan.`,
            'SUCCESS',
          )
        } else {
          await sendNotificationToBengkel(
            service.bengkelId,
            'Service Ditolak',
            `Service ${service.nomorService} ditolak. Alasan: ${rejectedReason}`,
            'ERROR',
          )
        }
      }
    } else {
      // Notify bengkel about completion approval/rejection
      if (service.bengkelId) {
        if (action === 'approve') {
          await sendNotificationToBengkel(
            service.bengkelId,
            'Service Selesai Disetujui',
            `Service ${service.nomorService} telah disetujui admin dan ditandai selesai.`,
            'SUCCESS',
          )
        } else {
          await sendNotificationToBengkel(
            service.bengkelId,
            'Penyelesaian Service Ditolak',
            `Penyelesaian service ${service.nomorService} ditolak admin. Alasan: ${rejectedReason}. Silakan perbaiki dan ajukan kembali.`,
            'ERROR',
          )
        }
      }
    }

    return NextResponse.json({ data: updatedService })
  } catch (error) {
    console.error('Error approving/rejecting service:', error)
    return NextResponse.json({ error: 'Gagal memproses persetujuan' }, { status: 500 })
  }
}
