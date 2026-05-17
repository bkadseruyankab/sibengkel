import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendNotificationToAdmins } from '@/lib/notifications'

type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/service/[id]/progress - Update service progress
// Supports multiple workflows:
// - submitPengajuan: true  → DIAJUKAN/DITOLAK → PENGAJUAN (bengkel submits items for admin approval)
// - DISETUJUI + progress > 0 → DIPROSES (bengkel starts working)
// - markAsSelesai / progress 100 → MENUNGGU_PERSETUJUAN (bengkel marks complete, waits for admin)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { progress, statusService, catatanBengkel, markAsSelesai, submitPengajuan } = body

    const service = await db.service.findUnique({
      where: { id },
      include: { vehicle: true },
    })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    // --- Handle PENGAJUAN submission (bengkel submits items for admin approval) ---
    if (submitPengajuan) {
      if (!['DIAJUKAN', 'DITOLAK'].includes(service.statusService)) {
        return NextResponse.json(
          { error: 'Pengajuan hanya dapat dikirim untuk service dengan status DIAJUKAN atau DITOLAK' },
          { status: 400 }
        )
      }

      const updatedService = await db.service.update({
        where: { id },
        data: {
          statusService: 'PENGAJUAN',
          catatanBengkel: catatanBengkel !== undefined ? catatanBengkel : service.catatanBengkel,
        },
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
          status: 'PENGAJUAN',
          keterangan: `Bengkel mengirim pengajuan service.${catatanBengkel ? ` Catatan: ${catatanBengkel}` : ''}`,
        },
      })

      // Notify admins about the new pengajuan
      await sendNotificationToAdmins(
        'Pengajuan Service Baru',
        `Bengkel telah mengirim pengajuan untuk service ${service.nomorService} (${service.vehicle?.nomorPolisi || '-'}). Silakan review dan setujui/tolak.`,
        'WARNING',
      )

      return NextResponse.json({ data: updatedService })
    }

    // --- Standard progress update flow ---
    if (!['DISETUJUI', 'DIPROSES', 'PENDING', 'MENUNGGU_PERSETUJUAN'].includes(service.statusService)) {
      return NextResponse.json(
        { error: 'Progress hanya dapat diupdate untuk service DISETUJUI, DIPROSES, PENDING, atau MENUNGGU_PERSETUJUAN' },
        { status: 400 }
      )
    }

    const progressValue = Math.min(100, Math.max(0, progress || 0))

    let newStatus = statusService || service.statusService

    // If bengkel marks as "selesai" (markAsSelesai flag), set to MENUNGGU_PERSETUJUAN
    if (markAsSelesai) {
      newStatus = 'MENUNGGU_PERSETUJUAN'
    } else if (progressValue === 100) {
      // If progress reaches 100 without markAsSelesai, set to MENUNGGU_PERSETUJUAN
      // (bengkel workflow: need admin approval)
      newStatus = 'MENUNGGU_PERSETUJUAN'
    } else if (progressValue > 0 && newStatus === 'DISETUJUI') {
      // When bengkel updates progress on DISETUJUI status, change to DIPROSES
      newStatus = 'DIPROSES'
    }

    const updateData: Record<string, unknown> = {
      progress: progressValue,
      statusService: newStatus,
      catatanBengkel: catatanBengkel !== undefined ? catatanBengkel : undefined,
    }

    // Don't set tanggalSelesai yet - wait for admin approval
    // Only set tanggalSelesai when status is SELESAI (approved by admin)

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
        keterangan: `Progress diupdate ke ${progressValue}%${catatanBengkel ? `. Catatan: ${catatanBengkel}` : ''}${markAsSelesai ? '. Bengkel menandai selesai, menunggu persetujuan admin.' : ''}`,
      },
    })

    // Create notification for admin when bengkel marks as complete
    if (newStatus === 'MENUNGGU_PERSETUJUAN') {
      await sendNotificationToAdmins(
        'Service Menunggu Persetujuan',
        `Service ${service.nomorService} (${updatedService.vehicle?.nomorPolisi || '-'}) telah selesai dikerjakan bengkel dan menunggu persetujuan Anda.`,
        'WARNING',
      )
    }

    return NextResponse.json({ data: updatedService })
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json({ error: 'Gagal mengupdate progress' }, { status: 500 })
  }
}
