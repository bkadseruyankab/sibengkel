import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const statusAktif = searchParams.get('statusAktif') || ''

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { namaBengkel: { contains: search } },
        { picBengkel: { contains: search } },
        { alamat: { contains: search } },
      ]
    }

    if (statusAktif !== '') {
      where.statusAktif = statusAktif === 'true'
    }

    const [data, total] = await Promise.all([
      db.workshop.findMany({
        where,
        include: {
          _count: {
            select: { services: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.workshop.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching workshops:', error)
    return NextResponse.json({ error: 'Gagal mengambil data bengkel' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { namaBengkel, alamat, noTelepon, picBengkel, email, statusAktif, canAddService } = body

    if (!namaBengkel) {
      return NextResponse.json({ error: 'Nama bengkel wajib diisi' }, { status: 400 })
    }

    const workshop = await db.workshop.create({
      data: {
        namaBengkel,
        alamat: alamat || null,
        noTelepon: noTelepon || null,
        picBengkel: picBengkel || null,
        email: email || null,
        statusAktif: statusAktif !== undefined ? statusAktif : true,
        canAddService: canAddService !== undefined ? canAddService : false,
      },
    })

    return NextResponse.json(workshop, { status: 201 })
  } catch (error) {
    console.error('Error creating workshop:', error)
    return NextResponse.json({ error: 'Gagal membuat bengkel' }, { status: 500 })
  }
}
