import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const budget = await db.budget.findUnique({
      where: { id },
      include: {
        vehicle: true,
        history: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedByUser: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!budget) {
      return NextResponse.json({ error: 'Anggaran tidak ditemukan' }, { status: 404 })
    }

    // Get related services
    const relatedServices = await db.service.findMany({
      where: {
        vehicleId: budget.vehicleId,
        statusService: 'SELESAI',
        tanggalService: {
          gte: new Date(`${budget.tahun}-01-01`),
          lte: new Date(`${budget.tahun}-12-31`),
        }
      },
      include: {
        bengkel: { select: { namaBengkel: true } },
      },
      orderBy: { tanggalService: 'desc' },
      take: 10,
    })

    return NextResponse.json({ ...budget, relatedServices })
  } catch (error) {
    console.error('Error fetching budget detail:', error)
    return NextResponse.json({ error: 'Gagal mengambil detail anggaran' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tahun, vehicleId, totalAnggaran, realisasi, statusAnggaran, jenisKendaraan } = body

    const existing = await db.budget.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Anggaran tidak ditemukan' }, { status: 404 })
    }

    // Calculate sisaAnggaran
    const newTotalAnggaran = totalAnggaran !== undefined ? parseFloat(totalAnggaran) : existing.totalAnggaran
    const newRealisasi = realisasi !== undefined ? parseFloat(realisasi) : existing.realisasi
    const sisaAnggaran = newTotalAnggaran - newRealisasi

    // Auto-update status
    let finalStatus = statusAnggaran || existing.statusAnggaran
    if (sisaAnggaran <= 0) {
      finalStatus = 'HABIS'
    } else if (finalStatus === 'HABIS' && sisaAnggaran > 0) {
      finalStatus = 'AKTIF'
    }

    // Auto-detect jenisKendaraan from vehicle if vehicleId changed
    let finalJenisKendaraan = jenisKendaraan || existing.jenisKendaraan
    if (vehicleId && vehicleId !== existing.vehicleId) {
      const vehicle = await db.vehicle.findUnique({
        where: { id: vehicleId },
        select: { jenisKendaraan: true }
      })
      finalJenisKendaraan = vehicle?.jenisKendaraan || existing.jenisKendaraan
    }

    const budget = await db.budget.update({
      where: { id },
      data: {
        ...(tahun !== undefined && { tahun: parseInt(tahun) }),
        ...(vehicleId !== undefined && { vehicleId }),
        jenisKendaraan: finalJenisKendaraan,
        totalAnggaran: newTotalAnggaran,
        realisasi: newRealisasi,
        sisaAnggaran: parseFloat(sisaAnggaran.toFixed(2)),
        statusAnggaran: finalStatus,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            nomorPolisi: true,
            namaPengguna: true,
            jenisKendaraan: true,
          }
        }
      }
    })

    // Create budget history entry
    const perubahan = newTotalAnggaran - existing.totalAnggaran
    if (perubahan !== 0 || newRealisasi !== existing.realisasi) {
      await db.budgetHistory.create({
        data: {
          budgetId: id,
          perubahan: perubahan !== 0 ? perubahan : newRealisasi - existing.realisasi,
          keterangan: perubahan !== 0 
            ? `Anggaran diubah dari ${existing.totalAnggaran} ke ${newTotalAnggaran}`
            : `Realisasi diubah dari ${existing.realisasi} ke ${newRealisasi}`,
        }
      })
    }

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json({ error: 'Gagal mengupdate anggaran' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const existing = await db.budget.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Anggaran tidak ditemukan' }, { status: 404 })
    }

    // Delete history first (cascade should handle this, but explicit is safer)
    await db.budgetHistory.deleteMany({ where: { budgetId: id } })
    await db.budget.delete({ where: { id } })

    return NextResponse.json({ message: 'Anggaran berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json({ error: 'Gagal menghapus anggaran' }, { status: 500 })
  }
}
