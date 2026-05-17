import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Generate the next document number for a given type
// Body: { code: string }  e.g., { code: "SRV" }
// Returns: { documentNumber: string, sequenceNumber: number }
// Format: {prefix}/{code}/{padded_number}/{month}/{year}
// Example: bkad/SRV/001/03/2026
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Kode jenis surat wajib diisi' }, { status: 400 })
    }

    const docType = await db.documentNumbering.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!docType) {
      return NextResponse.json({ error: 'Jenis surat tidak ditemukan. Tambahkan terlebih dahulu di Pengaturan > Penomoran Surat.' }, { status: 404 })
    }

    if (!docType.isActive) {
      return NextResponse.json({ error: 'Jenis surat ini tidak aktif' }, { status: 400 })
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Reset counter if year has changed
    let newNumber: number
    if (docType.lastYear !== currentYear) {
      newNumber = 1
    } else {
      newNumber = docType.currentNumber + 1
    }

    // Update the counter in the database
    await db.documentNumbering.update({
      where: { id: docType.id },
      data: {
        currentNumber: newNumber,
        lastYear: currentYear,
      },
    })

    // Format the document number
    const paddedNumber = String(newNumber).padStart(docType.digitCount, '0')
    const paddedMonth = String(currentMonth).padStart(2, '0')
    const documentNumber = `${docType.prefix}/${docType.code}/${paddedNumber}/${paddedMonth}/${currentYear}`

    return NextResponse.json({
      documentNumber,
      sequenceNumber: newNumber,
      code: docType.code,
      name: docType.name,
      prefix: docType.prefix,
      month: currentMonth,
      year: currentYear,
    })
  } catch (error) {
    console.error('Error generating document number:', error)
    return NextResponse.json({ error: 'Gagal generate nomor surat' }, { status: 500 })
  }
}
