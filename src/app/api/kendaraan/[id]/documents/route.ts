import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storeVehicleDocument } from '@/lib/blob-store'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const documents = await db.vehicleDocument.findMany({
      where: { vehicleId: id },
      orderBy: { uploadedAt: 'desc' },
      // Don't select the blob data for listing (too large)
      select: {
        id: true,
        vehicleId: true,
        jenisDokumen: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        mimeType: true,
        uploadedAt: true,
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil dokumen' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const jenisDokumen = formData.get('jenisDokumen') as string

    if (!file) {
      return NextResponse.json(
        { error: 'File wajib diunggah' },
        { status: 400 }
      )
    }

    if (!jenisDokumen) {
      return NextResponse.json(
        { error: 'Jenis dokumen wajib diisi' },
        { status: 400 }
      )
    }

    // Verify vehicle exists
    const vehicle = await db.vehicle.findUnique({ where: { id } })
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Kendaraan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Gunakan JPG, PNG, atau PDF' },
        { status: 400 }
      )
    }
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File melebihi batas 5MB' },
        { status: 400 }
      )
    }

    const result = await storeVehicleDocument(id, file, jenisDokumen)

    return NextResponse.json({
      id: result.id,
      vehicleId: id,
      jenisDokumen,
      fileName: result.fileName,
      filePath: result.filePath,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      uploadedAt: new Date().toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Gagal mengunggah dokumen' },
      { status: 500 }
    )
  }
}
