import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'

function generateQrHash(vehicleId: string): string {
  // Create a unique hash from vehicle ID + random bytes + timestamp
  const random = randomBytes(8).toString('hex')
  const timestamp = Date.now().toString(36)
  const input = `${vehicleId}-${random}-${timestamp}`
  const hash = createHash('sha256').update(input).digest('hex')
  // Take first 12 characters for a short, clean URL
  return hash.substring(0, 12)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vehicleId } = body

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID wajib diisi' },
        { status: 400 }
      )
    }

    // Check if vehicle exists
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Kendaraan tidak ditemukan' },
        { status: 404 }
      )
    }

    // If vehicle already has a QR hash, return it
    if (vehicle.qrCodeHash) {
      const qrUrl = `/api/kendaraan/qr/${vehicle.qrCodeHash}`
      return NextResponse.json({
        hash: vehicle.qrCodeHash,
        qrUrl,
        existing: true,
      })
    }

    // Generate new QR hash, ensure uniqueness
    let qrCodeHash = generateQrHash(vehicleId)
    let attempts = 0
    while (attempts < 10) {
      const existing = await db.vehicle.findUnique({
        where: { qrCodeHash },
      })
      if (!existing) break
      qrCodeHash = generateQrHash(vehicleId)
      attempts++
    }

    // Update vehicle with the new hash
    await db.vehicle.update({
      where: { id: vehicleId },
      data: { qrCodeHash },
    })

    const qrUrl = `/api/kendaraan/qr/${qrCodeHash}`
    return NextResponse.json({
      hash: qrCodeHash,
      qrUrl,
      existing: false,
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'Gagal membuat QR code' },
      { status: 500 }
    )
  }
}
