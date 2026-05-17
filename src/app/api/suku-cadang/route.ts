import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive') || ''
    const bengkelId = searchParams.get('bengkelId') || ''

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { namaSukuCadang: { contains: search } },
        { supplier: { contains: search } },
      ]
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true'
    }

    // Filter by bengkelId (for Admin filtering or Bengkel's own stock)
    if (bengkelId) {
      where.bengkelId = bengkelId
    }

    const [data, total] = await Promise.all([
      db.sparePart.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          bengkel: {
            select: {
              id: true,
              namaBengkel: true,
            },
          },
        },
      }),
      db.sparePart.count({ where }),
    ])

    // Summary - based on the same filter context
    const summaryWhere: any = { isActive: true }
    if (bengkelId) summaryWhere.bengkelId = bengkelId

    const allParts = await db.sparePart.findMany({
      where: summaryWhere,
      select: { stok: true, hargaSatuan: true },
    })
    const totalItems = allParts.reduce((sum, p) => sum + p.stok, 0)
    const lowStockCount = allParts.filter(p => p.stok < 5).length

    // Bengkel summary for Admin view
    let bengkelSummary = null
    if (!bengkelId) {
      const bengkels = await db.workshop.findMany({
        where: { statusAktif: true },
        select: { id: true, namaBengkel: true },
      })

      const bengkelCounts = await Promise.all(
        bengkels.map(async (b) => {
          const count = await db.sparePart.count({
            where: { bengkelId: b.id, isActive: true },
          })
          const totalStok = await db.sparePart.aggregate({
            where: { bengkelId: b.id, isActive: true },
            _sum: { stok: true },
          })
          return {
            id: b.id,
            namaBengkel: b.namaBengkel,
            itemCount: count,
            totalStok: totalStok._sum.stok || 0,
          }
        })
      )

      bengkelSummary = bengkelCounts
    }

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalItems,
        lowStockCount,
      },
      bengkelSummary,
    })
  } catch (error) {
    console.error('Error fetching spare parts:', error)
    return NextResponse.json({ error: 'Gagal mengambil data suku cadang' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { namaSukuCadang, qty, hargaSatuan, supplier, stok, keterangan, isActive, bengkelId } = body

    if (!namaSukuCadang) {
      return NextResponse.json({ error: 'Nama suku cadang wajib diisi' }, { status: 400 })
    }

    if (!bengkelId) {
      return NextResponse.json({ error: 'Bengkel wajib dipilih' }, { status: 400 })
    }

    // Verify bengkel exists
    const bengkel = await db.workshop.findUnique({ where: { id: bengkelId } })
    if (!bengkel) {
      return NextResponse.json({ error: 'Bengkel tidak ditemukan' }, { status: 404 })
    }

    const sparePart = await db.sparePart.create({
      data: {
        namaSukuCadang,
        qty: qty !== undefined ? parseInt(qty) : 0,
        hargaSatuan: hargaSatuan !== undefined ? parseFloat(hargaSatuan) : 0,
        supplier: supplier || null,
        stok: stok !== undefined ? parseInt(stok) : 0,
        keterangan: keterangan || null,
        isActive: isActive !== undefined ? isActive : true,
        bengkelId,
      },
      include: {
        bengkel: {
          select: { id: true, namaBengkel: true },
        },
      },
    })

    return NextResponse.json(sparePart, { status: 201 })
  } catch (error) {
    console.error('Error creating spare part:', error)
    return NextResponse.json({ error: 'Gagal membuat suku cadang' }, { status: 500 })
  }
}
