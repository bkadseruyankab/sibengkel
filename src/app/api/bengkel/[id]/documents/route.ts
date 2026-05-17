import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storeWorkshopDocument } from '@/lib/blob-store'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/bengkel/[id]/documents - List documents for a workshop
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const workshop = await db.workshop.findUnique({ where: { id } })
    if (!workshop) {
      return NextResponse.json({ error: 'Bengkel tidak ditemukan' }, { status: 404 })
    }

    const documents = await db.workshopDocument.findMany({
      where: { workshopId: id },
      orderBy: { uploadedAt: 'desc' },
      // Don't select the blob data for listing (too large)
      select: {
        id: true,
        workshopId: true,
        jenisDokumen: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        fileType: true,
        keterangan: true,
        uploadedBy: true,
        uploadedAt: true,
      },
    })

    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('Error fetching workshop documents:', error)
    return NextResponse.json({ error: 'Gagal mengambil dokumen bengkel' }, { status: 500 })
  }
}

// POST /api/bengkel/[id]/documents - Upload documents for a workshop
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const workshop = await db.workshop.findUnique({ where: { id } })
    if (!workshop) {
      return NextResponse.json({ error: 'Bengkel tidak ditemukan' }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const jenisDokumen = (formData.get('jenisDokumen') as string) || 'LAINNYA'
    const keterangan = (formData.get('keterangan') as string) || null
    const uploadedBy = (formData.get('uploadedBy') as string) || null

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 })
    }

    const validJenis = ['KTP', 'NPWP', 'NIB', 'SPK', 'IZIN_USAHA', 'SURAT_KETERANGAN', 'LAINNYA']
    if (!validJenis.includes(jenisDokumen)) {
      return NextResponse.json({ error: 'Jenis dokumen tidak valid' }, { status: 400 })
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maksimal 10 file per upload' }, { status: 400 })
    }

    // Validate each file
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipe file ${file.name} tidak didukung. Gunakan JPG, PNG, atau PDF` },
          { status: 400 }
        )
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} melebihi batas 5MB` },
          { status: 400 }
        )
      }
    }

    const documents = []
    for (const file of files) {
      const result = await storeWorkshopDocument(id, file, jenisDokumen, keterangan, uploadedBy)

      documents.push({
        id: result.id,
        workshopId: id,
        jenisDokumen,
        fileName: result.fileName,
        filePath: result.filePath,
        fileSize: result.fileSize,
        fileType: result.mimeType,
        keterangan,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ data: documents }, { status: 201 })
  } catch (error) {
    console.error('Error uploading workshop documents:', error)
    return NextResponse.json({ error: 'Gagal mengupload dokumen' }, { status: 500 })
  }
}
