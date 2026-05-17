import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all document numbering configurations
export async function GET() {
  try {
    const docs = await db.documentNumbering.findMany({
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(docs)
  } catch (error) {
    console.error('Error fetching document numberings:', error)
    return NextResponse.json({ error: 'Gagal mengambil data penomoran surat' }, { status: 500 })
  }
}

// POST - Create a new document numbering configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, prefix, digitCount, isActive } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Kode dan nama wajib diisi' }, { status: 400 })
    }

    // Check if code already exists
    const existing = await db.documentNumbering.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'Kode sudah digunakan' }, { status: 400 })
    }

    const doc = await db.documentNumbering.create({
      data: {
        code,
        name,
        prefix: prefix || 'BKAD',
        digitCount: digitCount || 3,
        isActive: isActive !== false,
        currentNumber: 0,
        lastYear: new Date().getFullYear(),
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Error creating document numbering:', error)
    return NextResponse.json({ error: 'Gagal membuat penomoran surat' }, { status: 500 })
  }
}

// PUT - Update a document numbering configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, code, name, prefix, digitCount, isActive, currentNumber } = body

    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    }

    const existing = await db.documentNumbering.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    // If code is being changed, check for duplicates
    if (code && code !== existing.code) {
      const duplicate = await db.documentNumbering.findUnique({ where: { code } })
      if (duplicate) {
        return NextResponse.json({ error: 'Kode sudah digunakan' }, { status: 400 })
      }
    }

    const doc = await db.documentNumbering.update({
      where: { id },
      data: {
        ...(code ? { code } : {}),
        ...(name ? { name } : {}),
        ...(prefix !== undefined ? { prefix } : {}),
        ...(digitCount !== undefined ? { digitCount } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(currentNumber !== undefined ? { currentNumber } : {}),
      },
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error updating document numbering:', error)
    return NextResponse.json({ error: 'Gagal mengupdate penomoran surat' }, { status: 500 })
  }
}

// DELETE - Delete a document numbering configuration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    }

    const existing = await db.documentNumbering.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    await db.documentNumbering.delete({ where: { id } })

    return NextResponse.json({ message: 'Penomoran surat berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting document numbering:', error)
    return NextResponse.json({ error: 'Gagal menghapus penomoran surat' }, { status: 500 })
  }
}
