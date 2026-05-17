import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storeBlobFile } from '@/lib/blob-store'

// GET /api/signature?userId=xxx - Get current user's active signature
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    const signature = await db.signature.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!signature) {
      return NextResponse.json({ signature: null })
    }

    return NextResponse.json({ signature })
  } catch (error) {
    console.error('Error fetching signature:', error)
    return NextResponse.json({ error: 'Gagal mengambil tanda tangan' }, { status: 500 })
  }
}

// POST /api/signature - Save/update signature
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, imageData, saveAsTTE } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    if (!imageData) {
      return NextResponse.json({ error: 'Data tanda tangan diperlukan' }, { status: 400 })
    }

    // Validate that the imageData is a valid base64 PNG
    if (!imageData.startsWith('data:image/png;base64,') && !imageData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Format gambar tidak valid' }, { status: 400 })
    }

    // Deactivate all existing signatures for this user
    await db.signature.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })

    // Create new signature
    const signature = await db.signature.create({
      data: {
        userId,
        imageData,
        isActive: true,
      },
    })

    // If saveAsTTE is true, also save the signature as a TTE blob file
    if (saveAsTTE) {
      try {
        // Convert base64 to buffer
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
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
          signature,
          ttePath: result.filePath,
          savedAsTTE: true,
        }, { status: 201 })
      } catch (tteError) {
        console.error('Error saving signature as TTE:', tteError)
        // Still return success for the signature, just note TTE failed
        return NextResponse.json({
          signature,
          savedAsTTE: false,
          tteError: 'Gagal menyimpan sebagai TTE',
        }, { status: 201 })
      }
    }

    return NextResponse.json({ signature }, { status: 201 })
  } catch (error) {
    console.error('Error saving signature:', error)
    return NextResponse.json({ error: 'Gagal menyimpan tanda tangan' }, { status: 500 })
  }
}
