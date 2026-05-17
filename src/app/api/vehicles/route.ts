import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { nomorPolisi: { contains: search } },
        { namaPengguna: { contains: search } },
      ]
    }

    if (isActive === 'true') {
      where.isActive = true
    }

    const vehicles = await db.vehicle.findMany({
      where,
      select: {
        id: true,
        nomorPolisi: true,
        namaPengguna: true,
        merk: true,
        type: true,
        jenisKendaraan: true,
        statusKendaraan: true,
      },
      orderBy: { nomorPolisi: 'asc' },
      take: 100,
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json({ error: 'Gagal mengambil data kendaraan' }, { status: 500 })
  }
}
