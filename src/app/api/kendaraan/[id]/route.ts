import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        services: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            bengkel: {
              select: { id: true, namaBengkel: true },
            },
          },
        },
        budgets: {
          orderBy: { tahun: 'desc' },
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Kendaraan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Calculate total biaya service
    const totalBiayaService = vehicle.services.reduce(
      (sum, s) => sum + s.totalBiaya,
      0
    )

    return NextResponse.json({
      ...vehicle,
      totalBiayaService,
    })
  } catch (error) {
    console.error('Error fetching vehicle:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data kendaraan' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if vehicle exists
    const existing = await db.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Kendaraan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check nomorPolisi uniqueness if being changed
    if (body.nomorPolisi && body.nomorPolisi !== existing.nomorPolisi) {
      const duplicate = await db.vehicle.findUnique({
        where: { nomorPolisi: body.nomorPolisi },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Nomor polisi sudah digunakan kendaraan lain' },
          { status: 400 }
        )
      }
    }

    const vehicle = await db.vehicle.update({
      where: { id },
      data: {
        ...(body.nomorPolisi && { nomorPolisi: body.nomorPolisi }),
        ...(body.namaPengguna && { namaPengguna: body.namaPengguna }),
        ...(body.skpdBidang && { skpdBidang: body.skpdBidang }),
        ...(body.jenisKendaraan && { jenisKendaraan: body.jenisKendaraan }),
        ...(body.merk && { merk: body.merk }),
        ...(body.type && { type: body.type }),
        ...(body.tahun !== undefined && { tahun: body.tahun }),
        ...(body.nomorRangka !== undefined && { nomorRangka: body.nomorRangka || null }),
        ...(body.nomorMesin !== undefined && { nomorMesin: body.nomorMesin || null }),
        ...(body.warna !== undefined && { warna: body.warna || null }),
        ...(body.statusKendaraan && { statusKendaraan: body.statusKendaraan }),
        ...(body.kondisiKendaraan && { kondisiKendaraan: body.kondisiKendaraan }),
        ...(body.kilometerTerakhir !== undefined && { kilometerTerakhir: body.kilometerTerakhir }),
        ...(body.fotoUrl !== undefined && { fotoUrl: body.fotoUrl || null }),
      },
      include: {
        documents: true,
      },
    })

    return NextResponse.json(vehicle)
  } catch (error) {
    console.error('Error updating vehicle:', error)
    return NextResponse.json(
      { error: 'Gagal mengupdate kendaraan' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if vehicle exists
    const existing = await db.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Kendaraan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Soft delete
    const vehicle = await db.vehicle.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Kendaraan berhasil dihapus', vehicle })
  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus kendaraan' },
      { status: 500 }
    )
  }
}
