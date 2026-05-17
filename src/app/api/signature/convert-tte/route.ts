import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storeBlobFile } from '@/lib/blob-store'

/**
 * POST /api/signature/convert-tte
 * Convert an existing canvas signature to TTE blob file
 * Body: { signatureId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { signatureId } = body

    if (!signatureId) {
      return NextResponse.json({ error: 'signatureId diperlukan' }, { status: 400 })
    }

    // Find the signature
    const signature = await db.signature.findUnique({
      where: { id: signatureId },
    })

    if (!signature || !signature.imageData) {
      return NextResponse.json({ error: 'Tanda tangan tidak ditemukan' }, { status: 404 })
    }

    // Convert base64 to buffer
    const base64Data = signature.imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Create a File-like object for storeBlobFile
    const tteFile = new File([buffer], 'tte-signature.png', { type: 'image/png' })

    const result = await storeBlobFile('app_tte_image', tteFile, 'logo')

    // Update the SystemSetting for app_tte_image
    await db.systemSetting.upsert({
      where: { key: 'app_tte_image' },
      update: { value: result.filePath },
      create: { key: 'app_tte_image', value: result.filePath },
    })

    return NextResponse.json({
      success: true,
      ttePath: result.filePath,
      message: 'Tanda tangan berhasil dijadikan TTE',
    })
  } catch (error) {
    console.error('Error converting signature to TTE:', error)
    return NextResponse.json({ error: 'Gagal mengkonversi tanda tangan ke TTE' }, { status: 500 })
  }
}
