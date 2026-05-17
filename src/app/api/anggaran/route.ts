import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const tahun = searchParams.get('tahun') || ''
    const vehicleId = searchParams.get('vehicleId') || ''
    const statusAnggaran = searchParams.get('statusAnggaran') || ''
    const jenisKendaraan = searchParams.get('jenisKendaraan') || ''

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.vehicle = {
        ...(where.vehicle || {}),
        nomorPolisi: { contains: search }
      }
    }

    if (tahun) {
      where.tahun = parseInt(tahun)
    }

    if (vehicleId) {
      where.vehicleId = vehicleId
    }

    if (statusAnggaran) {
      where.statusAnggaran = statusAnggaran
    }

    if (jenisKendaraan) {
      where.jenisKendaraan = jenisKendaraan
    }

    const [data, total] = await Promise.all([
      db.budget.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              nomorPolisi: true,
              namaPengguna: true,
              merk: true,
              type: true,
              jenisKendaraan: true,
            }
          },
          history: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.budget.count({ where }),
    ])

    // Calculate summaries for filtered year, both combined and per jenisKendaraan
    const summaryYear = tahun ? parseInt(tahun) : new Date().getFullYear()
    const yearWhere: Record<string, unknown> = { tahun: summaryYear }

    const summaries = await db.budget.findMany({
      where: yearWhere,
      select: {
        totalAnggaran: true,
        realisasi: true,
        sisaAnggaran: true,
        statusAnggaran: true,
        jenisKendaraan: true,
      }
    })

    const totalAnggaranTahun = summaries.reduce((sum, b) => sum + b.totalAnggaran, 0)
    const totalRealisasi = summaries.reduce((sum, b) => sum + b.realisasi, 0)
    const totalSisaAnggaran = summaries.reduce((sum, b) => sum + b.sisaAnggaran, 0)
    const overBudgetCount = summaries.filter(b => b.statusAnggaran === 'HABIS').length

    // Separate summaries for RODA_2 and RODA_4
    const roda4Summaries = summaries.filter(b => b.jenisKendaraan === 'RODA_4')
    const roda2Summaries = summaries.filter(b => b.jenisKendaraan === 'RODA_2')

    const summaryRoda4 = {
      totalAnggaran: roda4Summaries.reduce((sum, b) => sum + b.totalAnggaran, 0),
      totalRealisasi: roda4Summaries.reduce((sum, b) => sum + b.realisasi, 0),
      totalSisaAnggaran: roda4Summaries.reduce((sum, b) => sum + b.sisaAnggaran, 0),
      overBudgetCount: roda4Summaries.filter(b => b.statusAnggaran === 'HABIS').length,
    }

    const summaryRoda2 = {
      totalAnggaran: roda2Summaries.reduce((sum, b) => sum + b.totalAnggaran, 0),
      totalRealisasi: roda2Summaries.reduce((sum, b) => sum + b.realisasi, 0),
      totalSisaAnggaran: roda2Summaries.reduce((sum, b) => sum + b.sisaAnggaran, 0),
      overBudgetCount: roda2Summaries.filter(b => b.statusAnggaran === 'HABIS').length,
    }

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalAnggaranTahun,
        totalRealisasi,
        totalSisaAnggaran,
        overBudgetCount,
      },
      summaryRoda4,
      summaryRoda2,
    })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Gagal mengambil data anggaran' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tahun, vehicleId, totalAnggaran, realisasi, statusAnggaran, jenisKendaraan } = body

    if (!tahun || !vehicleId || totalAnggaran === undefined) {
      return NextResponse.json({ error: 'Tahun, kendaraan, dan total anggaran wajib diisi' }, { status: 400 })
    }

    // Check if budget already exists for this vehicle and year
    const existing = await db.budget.findUnique({
      where: { tahun_vehicleId: { tahun: parseInt(tahun), vehicleId } }
    })

    if (existing) {
      return NextResponse.json({ error: 'Anggaran untuk kendaraan dan tahun ini sudah ada' }, { status: 400 })
    }

    // Auto-detect jenisKendaraan from vehicle if not provided
    let finalJenisKendaraan = jenisKendaraan
    if (!finalJenisKendaraan) {
      const vehicle = await db.vehicle.findUnique({
        where: { id: vehicleId },
        select: { jenisKendaraan: true }
      })
      finalJenisKendaraan = vehicle?.jenisKendaraan || 'RODA_4'
    }

    const realisasiValue = realisasi || 0
    const sisaAnggaran = totalAnggaran - realisasiValue
    const finalStatus = statusAnggaran || (sisaAnggaran <= 0 ? 'HABIS' : 'AKTIF')

    const budget = await db.budget.create({
      data: {
        tahun: parseInt(tahun),
        vehicleId,
        jenisKendaraan: finalJenisKendaraan,
        totalAnggaran: parseFloat(totalAnggaran),
        realisasi: parseFloat(realisasiValue),
        sisaAnggaran: parseFloat(sisaAnggaran),
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
    await db.budgetHistory.create({
      data: {
        budgetId: budget.id,
        perubahan: parseFloat(totalAnggaran),
        keterangan: 'Anggaran awal dibuat',
      }
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: 'Gagal membuat anggaran' }, { status: 500 })
  }
}
