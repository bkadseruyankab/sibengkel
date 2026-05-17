import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const workshop = await db.workshop.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            vehicle: {
              select: {
                nomorPolisi: true,
                namaPengguna: true,
                merk: true,
                type: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        _count: {
          select: { services: true, users: true }
        }
      }
    })

    if (!workshop) {
      return NextResponse.json({ error: 'Bengkel tidak ditemukan' }, { status: 404 })
    }

    // Calculate statistics
    const completedServices = workshop.services.filter(s => s.statusService === 'SELESAI')
    const totalRevenue = completedServices.reduce((sum, s) => sum + s.totalBiaya, 0)
    const avgCompletionMs = completedServices
      .filter(s => s.tanggalSelesai)
      .map(s => new Date(s.tanggalSelesai!).getTime() - new Date(s.tanggalService).getTime())
    const avgCompletionDays = avgCompletionMs.length > 0
      ? avgCompletionMs.reduce((a, b) => a + b, 0) / avgCompletionMs.length / (1000 * 60 * 60 * 24)
      : 0

    return NextResponse.json({
      ...workshop,
      stats: {
        totalServices: workshop._count.services,
        totalRevenue,
        avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
        completedCount: completedServices.length,
        inProgressCount: workshop.services.filter(s => ['DIPROSES', 'PENDING'].includes(s.statusService)).length,
      }
    })
  } catch (error) {
    console.error('Error fetching workshop detail:', error)
    return NextResponse.json({ error: 'Gagal mengambil detail bengkel' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { namaBengkel, alamat, noTelepon, picBengkel, email, statusAktif, canAddService } = body

    const existing = await db.workshop.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Bengkel tidak ditemukan' }, { status: 404 })
    }

    const workshop = await db.workshop.update({
      where: { id },
      data: {
        namaBengkel: namaBengkel !== undefined ? namaBengkel : existing.namaBengkel,
        alamat: alamat !== undefined ? alamat : existing.alamat,
        noTelepon: noTelepon !== undefined ? noTelepon : existing.noTelepon,
        picBengkel: picBengkel !== undefined ? picBengkel : existing.picBengkel,
        email: email !== undefined ? email : existing.email,
        statusAktif: statusAktif !== undefined ? statusAktif : existing.statusAktif,
        canAddService: canAddService !== undefined ? canAddService : existing.canAddService,
      },
    })

    return NextResponse.json(workshop)
  } catch (error) {
    console.error('Error updating workshop:', error)
    return NextResponse.json({ error: 'Gagal mengupdate bengkel' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const existing = await db.workshop.findUnique({
      where: { id },
      include: { _count: { select: { services: true } } }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Bengkel tidak ditemukan' }, { status: 404 })
    }

    // Soft delete - just set statusAktif to false
    await db.workshop.update({
      where: { id },
      data: { statusAktif: false },
    })

    return NextResponse.json({ message: 'Bengkel berhasil dinonaktifkan' })
  } catch (error) {
    console.error('Error deleting workshop:', error)
    return NextResponse.json({ error: 'Gagal menghapus bengkel' }, { status: 500 })
  }
}
