import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storeServiceDocument } from '@/lib/blob-store'
import { unlink } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/service/[id]/documents - Upload multiple nota/documents
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const jenisDokumen = (formData.get('jenisDokumen') as string) || 'NOTA'

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 })
    }

    const validJenis = ['NOTA', 'KWITANSI', 'FAKTUR', 'LAINNYA']
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
    let totalSaved = 0
    for (const file of files) {
      const result = await storeServiceDocument(id, file, jenisDokumen)
      totalSaved += result.savedBytes

      documents.push({
        id: result.id,
        serviceId: id,
        fileName: result.fileName,
        filePath: result.filePath,
        fileSize: result.fileSize,
        fileType: result.mimeType,
        jenisDokumen,
        uploadedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ data: documents }, { status: 201 })
  } catch (error) {
    console.error('Error uploading documents:', error)
    return NextResponse.json({ error: 'Gagal mengupload dokumen' }, { status: 500 })
  }
}

// GET /api/service/[id]/documents - List documents for a service
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    const documents = await db.serviceDocument.findMany({
      where: { serviceId: id },
      orderBy: { uploadedAt: 'desc' },
      // Don't select the blob data for listing (too large)
      select: {
        id: true,
        serviceId: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        fileType: true,
        jenisDokumen: true,
        uploadedAt: true,
      },
    })

    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Gagal mengambil dokumen' }, { status: 500 })
  }
}
