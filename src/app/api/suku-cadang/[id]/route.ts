import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sparePart = await db.sparePart.findUnique({
      where: { id },
      include: {
        bengkel: {
          select: { id: true, namaBengkel: true },
        },
        serviceSpareParts: {
          include: {
            service: {
              select: {
                nomorService: true,
                statusService: true,
                vehicle: {
                  select: { nomorPolisi: true },
                },
              },
            },
          },
          orderBy: { service: { createdAt: 'desc' } },
          take: 10,
        },
      },
    })

    if (!sparePart) {
      return NextResponse.json({ error: 'Suku cadang tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(sparePart)
  } catch (error) {
    console.error('Error fetching spare part detail:', error)
    return NextResponse.json({ error: 'Gagal mengambil detail suku cadang' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { namaSukuCadang, qty, hargaSatuan, supplier, stok, keterangan, isActive, bengkelId } = body

    const existing = await db.sparePart.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Suku cadang tidak ditemukan' }, { status: 404 })
    }

    // If bengkelId is being changed, verify the new bengkel exists
    if (bengkelId && bengkelId !== existing.bengkelId) {
      const bengkel = await db.workshop.findUnique({ where: { id: bengkelId } })
      if (!bengkel) {
        return NextResponse.json({ error: 'Bengkel tidak ditemukan' }, { status: 404 })
      }
    }

    const sparePart = await db.sparePart.update({
      where: { id },
      data: {
        namaSukuCadang: namaSukuCadang !== undefined ? namaSukuCadang : existing.namaSukuCadang,
        qty: qty !== undefined ? parseInt(qty) : existing.qty,
        hargaSatuan: hargaSatuan !== undefined ? parseFloat(hargaSatuan) : existing.hargaSatuan,
        supplier: supplier !== undefined ? supplier : existing.supplier,
        stok: stok !== undefined ? parseInt(stok) : existing.stok,
        keterangan: keterangan !== undefined ? keterangan : existing.keterangan,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        bengkelId: bengkelId !== undefined ? bengkelId : existing.bengkelId,
      },
      include: {
        bengkel: {
          select: { id: true, namaBengkel: true },
        },
      },
    })

    return NextResponse.json(sparePart)
  } catch (error) {
    console.error('Error updating spare part:', error)
    return NextResponse.json({ error: 'Gagal mengupdate suku cadang' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.sparePart.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Suku cadang tidak ditemukan' }, { status: 404 })
    }

    // Check if it's being used in any services
    const usageCount = await db.serviceSparePart.count({
      where: { sparePartId: id },
    })

    if (usageCount > 0) {
      // Soft delete - just deactivate
      await db.sparePart.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({ message: 'Suku cadang dinonaktifkan karena masih digunakan dalam service' })
    }

    await db.sparePart.delete({ where: { id } })
    return NextResponse.json({ message: 'Suku cadang berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting spare part:', error)
    return NextResponse.json({ error: 'Gagal menghapus suku cadang' }, { status: 500 })
  }
}
