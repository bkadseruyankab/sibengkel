import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const jenisKendaraan = searchParams.get('jenisKendaraan') || ''
    const statusKendaraan = searchParams.get('statusKendaraan') || ''
    const skpdBidang = searchParams.get('skpdBidang') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { nomorPolisi: { contains: search } },
        { namaPengguna: { contains: search } },
        { merk: { contains: search } },
      ]
    }

    if (jenisKendaraan) {
      where.jenisKendaraan = jenisKendaraan
    }

    if (statusKendaraan) {
      where.statusKendaraan = statusKendaraan
    }

    if (skpdBidang) {
      where.skpdBidang = { contains: skpdBidang }
    }

    const [data, total] = await Promise.all([
      db.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          documents: {
            select: { id: true, jenisDokumen: true, fileName: true },
          },
          _count: {
            select: { services: true },
          },
        },
      }),
      db.vehicle.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data kendaraan' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if nomorPolisi already exists
    const existing = await db.vehicle.findUnique({
      where: { nomorPolisi: body.nomorPolisi },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Nomor polisi sudah terdaftar' },
        { status: 400 }
      )
    }

    const vehicle = await db.vehicle.create({
      data: {
        nomorPolisi: body.nomorPolisi,
        namaPengguna: body.namaPengguna,
        skpdBidang: body.skpdBidang,
        jenisKendaraan: body.jenisKendaraan,
        merk: body.merk,
        type: body.type,
        tahun: body.tahun,
        nomorRangka: body.nomorRangka || null,
        nomorMesin: body.nomorMesin || null,
        warna: body.warna || null,
        statusKendaraan: body.statusKendaraan || 'AKTIF',
        kondisiKendaraan: body.kondisiKendaraan || 'BAIK',
        kilometerTerakhir: body.kilometerTerakhir || 0,
        fotoUrl: body.fotoUrl || null,
      },
      include: {
        documents: true,
      },
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    console.error('Error creating vehicle:', error)
    return NextResponse.json(
      { error: 'Gagal membuat kendaraan baru' },
      { status: 500 }
    )
  }
}
