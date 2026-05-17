import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/pengaturan/compress - Get compression settings
export async function GET() {
  try {
    const keys = [
      'compress_enabled',
      'compress_quality',
      'compress_max_width',
      'compress_max_height',
      'compress_format',
      'compress_photos',
      'compress_documents',
      'compress_logo',
      'compress_total_saved',
      'compress_total_files',
    ]

    const settings = await db.systemSetting.findMany({
      where: { key: { in: keys } },
    })

    const map: Record<string, string> = {}
    settings.forEach(s => {
      map[s.key] = s.value || ''
    })

    return NextResponse.json({
      enabled: map.compress_enabled !== 'false',
      quality: parseInt(map.compress_quality) || 80,
      maxWidth: parseInt(map.compress_max_width) || 1920,
      maxHeight: parseInt(map.compress_max_height) || 1080,
      format: (['jpeg', 'webp', 'original'].includes(map.compress_format) ? map.compress_format : 'original'),
      compressPhotos: map.compress_photos !== 'false',
      compressDocuments: map.compress_documents !== 'false',
      compressLogo: map.compress_logo !== 'false',
      totalSaved: parseInt(map.compress_total_saved) || 0,
      totalFiles: parseInt(map.compress_total_files) || 0,
    })
  } catch (error) {
    console.error('Error fetching compression settings:', error)
    return NextResponse.json({ error: 'Gagal mengambil pengaturan kompresi' }, { status: 500 })
  }
}

// PUT /api/pengaturan/compress - Update compression settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      enabled,
      quality,
      maxWidth,
      maxHeight,
      format,
      compressPhotos,
      compressDocuments,
      compressLogo,
    } = body

    const updates: Record<string, string> = {
      compress_enabled: (enabled !== false).toString(),
      compress_quality: (Math.min(100, Math.max(1, quality || 80))).toString(),
      compress_max_width: (maxWidth || 1920).toString(),
      compress_max_height: (maxHeight || 1080).toString(),
      compress_format: (['jpeg', 'webp', 'original'].includes(format) ? format : 'original'),
      compress_photos: (compressPhotos !== false).toString(),
      compress_documents: (compressDocuments !== false).toString(),
      compress_logo: (compressLogo !== false).toString(),
    }

    const operations = Object.entries(updates).map(([key, value]) =>
      db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )

    await Promise.all(operations)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating compression settings:', error)
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan kompresi' }, { status: 500 })
  }
}

// POST /api/pengaturan/compress - Test compression on a sample image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    // Check if it's a compressible image
    const compressibleTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!compressibleTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Tipe file tidak didukung untuk kompresi. Gunakan JPG, PNG, atau WebP.',
      }, { status: 400 })
    }

    // Get compression settings
    const { getCompressionSettings, compressImage } = await import('@/lib/compress')
    const settings = await getCompressionSettings()

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { metadata } = await compressImage(buffer, file.type, settings)

    return NextResponse.json({
      originalSize: metadata.originalSize,
      compressedSize: metadata.compressedSize,
      savedBytes: metadata.savedBytes,
      savedPercent: metadata.savedPercent,
      wasCompressed: metadata.wasCompressed,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      settings: {
        quality: settings.quality,
        maxWidth: settings.maxWidth,
        maxHeight: settings.maxHeight,
        format: settings.format,
      },
    })
  } catch (error: any) {
    console.error('Test compression error:', error)
    return NextResponse.json({ error: error.message || 'Gagal menguji kompresi' }, { status: 500 })
  }
}
