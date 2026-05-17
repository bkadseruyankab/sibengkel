import { NextRequest, NextResponse } from 'next/server'
import { storeBlobFile, deleteBlob } from '@/lib/blob-store'
import { db } from '@/lib/db'

const LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
const LOGO_MAX_SIZE = 2 * 1024 * 1024 // 2MB

const FAVICON_ALLOWED_TYPES = ['image/x-icon', 'image/png', 'image/svg+xml', 'image/webp']
const FAVICON_MAX_SIZE = 1 * 1024 * 1024 // 1MB

const TTE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml']
const TTE_MAX_SIZE = 2 * 1024 * 1024 // 2MB

const PRINT_LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
const PRINT_LOGO_MAX_SIZE = 2 * 1024 * 1024 // 2MB

const VALID_TYPES = ['logo', 'favicon', 'tte', 'print_logo'] as const
type UploadType = (typeof VALID_TYPES)[number]

const SETTING_KEY_MAP: Record<string, string> = {
  logo: 'app_logo',
  favicon: 'app_favicon',
  tte: 'app_tte_image',
  print_logo: 'app_print_logo',
}

/**
 * Detect MIME type from file extension when browser doesn't provide it
 */
function detectMimeType(fileName: string): string | null {
  const ext = fileName.toLowerCase().split('.').pop()
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    webp: 'image/webp',
    gif: 'image/gif',
  }
  return ext ? mimeMap[ext] || null : null
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    // Validate type
    if (!type || !VALID_TYPES.includes(type as UploadType)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}.` },
        { status: 400 }
      )
    }

    // Validate file
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided.' },
        { status: 400 }
      )
    }

    // Validate MIME type and size based on type
    const allowedTypes = type === 'logo' || type === 'print_logo'
      ? LOGO_ALLOWED_TYPES
      : type === 'favicon'
        ? FAVICON_ALLOWED_TYPES
        : TTE_ALLOWED_TYPES
    const maxSize = type === 'logo' || type === 'print_logo'
      ? LOGO_MAX_SIZE
      : type === 'favicon'
        ? FAVICON_MAX_SIZE
        : TTE_MAX_SIZE

    // Try to detect MIME type: first from file.type, then from file extension
    let mimeType = file.type
    if (!mimeType || !allowedTypes.includes(mimeType)) {
      const detected = detectMimeType(file.name)
      if (detected && allowedTypes.includes(detected)) {
        mimeType = detected
      }
    }

    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Tipe file "${file.type || 'unknown'}" tidak didukung. Tipe yang diperbolehkan: ${allowedTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (file.size > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0)
      return NextResponse.json(
        { success: false, error: `Ukuran file melebihi batas ${maxMB}MB.` },
        { status: 400 }
      )
    }

    // Store as blob file in database (with compression for non-SVG)
    const settingKey = SETTING_KEY_MAP[type]
    // TTE images may have transparency like logos, so skip compression
    const context: 'logo' | 'favicon' | 'other' = type === 'logo' || type === 'tte' || type === 'print_logo' ? 'logo' : type === 'favicon' ? 'favicon' : 'other'

    // Create a new File with the correct MIME type if we detected it from extension
    const fileToStore = mimeType !== file.type
      ? new File([file], file.name, { type: mimeType })
      : file

    const result = await storeBlobFile(settingKey, fileToStore, context)

    return NextResponse.json({
      success: true,
      key: settingKey,
      path: result.filePath,
      fileSize: result.fileSize,
      wasCompressed: result.wasCompressed,
      savedBytes: result.savedBytes,
    })
  } catch (error) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error during file upload.'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pengaturan/upload?type=logo|favicon|tte
 * Remove a logo, favicon, or TTE image blob file
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (!type || !VALID_TYPES.includes(type as UploadType)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}.` },
        { status: 400 }
      )
    }

    const settingKey = SETTING_KEY_MAP[type]

    // Delete the blob file
    await deleteBlob('blob', settingKey)

    // Also clear the SystemSetting value
    await db.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: '' },
      create: { key: settingKey, value: '' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete file.' },
      { status: 500 }
    )
  }
}
