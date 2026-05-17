import { NextRequest, NextResponse } from 'next/server'
import { retrieveBlob, type BlobCategory } from '@/lib/blob-store'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'

type RouteContext = { params: Promise<{ category: string; id: string }> }

const VALID_CATEGORIES: BlobCategory[] = ['service-doc', 'service-photo', 'workshop-doc', 'vehicle-doc', 'blob']

/**
 * GET /api/file/[category]/[id] - Serve a file from blob storage or filesystem
 *
 * Categories:
 * - service-doc: Service documents (nota, kwitansi, etc.)
 * - service-photo: Service item photos
 * - workshop-doc: Workshop/bengkel documents
 * - vehicle-doc: Vehicle documents
 * - blob: Generic blob files (app_logo, app_favicon, etc.)
 *
 * For backward compatibility, if the blob is not found in the database,
 * it will try to serve the file from the filesystem.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { category, id } = await context.params

    // Validate category
    if (!VALID_CATEGORIES.includes(category as BlobCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Valid categories: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Try to retrieve from blob storage first
    const blob = await retrieveBlob(category as BlobCategory, id)

    if (blob) {
      // Determine if this should be inline or attachment
      const url = new URL(request.url)
      const download = url.searchParams.get('download') === 'true'
      const hasCacheBuster = url.searchParams.has('t')
      const isImage = blob.mimeType.startsWith('image/')
      const isPdf = blob.mimeType === 'application/pdf'

      const headers = new Headers()
      headers.set('Content-Type', blob.mimeType)
      headers.set('Content-Length', blob.data.length.toString())

      // For blob category (logo/favicon), use short cache since they can be updated
      // For other categories with cache buster param, also use short cache
      if (category === 'blob' || hasCacheBuster) {
        headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      } else {
        headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
      }

      if (download || (!isImage && !isPdf)) {
        headers.set('Content-Disposition', `attachment; filename="${blob.fileName}"`)
      } else {
        headers.set('Content-Disposition', `inline; filename="${blob.fileName}"`)
      }

      return new NextResponse(blob.data, { status: 200, headers })
    }

    // Fallback: try to serve from filesystem (for backward compatibility with old files)
    // The "id" might actually be a file path like "/uploads/nota/xxx.jpg"
    if (id.startsWith('/uploads/') || (!id.startsWith('cl') && id.includes('/'))) {
      const filePath = path.join(process.cwd(), 'public', id)
      if (existsSync(filePath)) {
        const fileBuffer = await readFile(filePath)
        const ext = path.extname(filePath).toLowerCase()
        const mimeTypeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
          '.gif': 'image/gif',
          '.ico': 'image/x-icon',
        }
        const mimeType = mimeTypeMap[ext] || 'application/octet-stream'

        const headers = new Headers()
        headers.set('Content-Type', mimeType)
        headers.set('Content-Length', fileBuffer.length.toString())
        headers.set('Cache-Control', 'public, max-age=86400')

        return new NextResponse(fileBuffer, { status: 200, headers })
      }
    }

    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}
