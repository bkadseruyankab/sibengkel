import { db } from './db'
import { getCompressionSettings, shouldCompress, compressImage, isCompressibleImage } from './compress'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'

/**
 * Supported blob file categories for the unified file serving API
 */
export type BlobCategory = 'service-doc' | 'service-photo' | 'workshop-doc' | 'vehicle-doc' | 'blob'

/**
 * Result of a blob store operation
 */
export interface BlobStoreResult {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  wasCompressed: boolean
  savedBytes: number
}

/**
 * Compress an image buffer if applicable
 * @param buffer - Original file buffer
 * @param mimeType - Original MIME type
 * @param context - Compression context (photo, document, logo)
 * @returns Compressed buffer, final MIME type, and compression metadata
 */
export async function compressBuffer(
  buffer: Buffer,
  mimeType: string,
  context: 'photo' | 'document' | 'logo'
): Promise<{
  buffer: Buffer
  mimeType: string
  wasCompressed: boolean
  savedBytes: number
  originalSize: number
}> {
  const originalSize = buffer.length

  // Skip compression for very small files (< 1KB) - not worth the overhead
  if (originalSize < 1024) {
    return { buffer, mimeType, wasCompressed: false, savedBytes: 0, originalSize }
  }

  // Skip compression for logos - they often have transparency and are usually small
  // Converting PNG logos to JPEG would break transparency
  if (context === 'logo') {
    return { buffer, mimeType, wasCompressed: false, savedBytes: 0, originalSize }
  }

  const settings = await getCompressionSettings()

  if (!shouldCompress(settings, mimeType, context)) {
    return { buffer, mimeType, wasCompressed: false, savedBytes: 0, originalSize }
  }

  try {
    const result = await compressImage(buffer, mimeType, settings)
    const savedBytes = result.metadata.wasCompressed ? result.metadata.savedBytes : 0

    // Update compression stats atomically
    if (result.metadata.wasCompressed && savedBytes > 0) {
      await updateCompressionStats(savedBytes)
    }

    return {
      buffer: result.buffer,
      mimeType: result.metadata.format || mimeType,
      wasCompressed: result.metadata.wasCompressed,
      savedBytes,
      originalSize,
    }
  } catch (error) {
    console.error('Compression error, using original:', error)
    return { buffer, mimeType, wasCompressed: false, savedBytes: 0, originalSize }
  }
}

/**
 * Update compression statistics atomically
 */
async function updateCompressionStats(savedBytes: number): Promise<void> {
  try {
    await db.$executeRaw`
      INSERT INTO system_settings (id, key, value, updatedAt)
      VALUES (lower(hex(randomblob(12))), 'compress_total_saved', ${savedBytes.toString()}, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + ${savedBytes} AS TEXT), updatedAt = datetime('now')
    `
    await db.$executeRaw`
      INSERT INTO system_settings (id, key, value, updatedAt)
      VALUES (lower(hex(randomblob(12))), 'compress_total_files', '1', datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updatedAt = datetime('now')
    `
  } catch {
    // Ignore stats update errors
  }
}

/**
 * Build a file serving URL for a blob-stored document
 * The URL format is: /api/file/{category}/{id}
 * This URL will be served by the file serving API route
 */
export function buildBlobUrl(category: BlobCategory, id: string): string {
  return `/api/file/${category}/${id}`
}

/**
 * Store a service document as blob
 */
export async function storeServiceDocument(
  serviceId: string,
  file: File,
  jenisDokumen: string,
  buffer?: Buffer
): Promise<BlobStoreResult> {
  let fileBuffer = buffer || Buffer.from(await file.arrayBuffer())
  const originalMimeType = file.type

  // Compress if image
  const compressed = await compressBuffer(fileBuffer, originalMimeType, 'document')
  fileBuffer = compressed.buffer
  const finalMimeType = compressed.mimeType

  const doc = await db.serviceDocument.create({
    data: {
      serviceId,
      fileName: file.name,
      filePath: '', // Will be updated below
      fileSize: fileBuffer.length,
      fileType: finalMimeType,
      mimeType: finalMimeType,
      data: fileBuffer,
      jenisDokumen,
    },
  })

  // Update filePath to point to the blob serving URL
  const filePath = buildBlobUrl('service-doc', doc.id)
  await db.serviceDocument.update({
    where: { id: doc.id },
    data: { filePath },
  })

  return {
    id: doc.id,
    fileName: file.name,
    filePath,
    fileSize: fileBuffer.length,
    mimeType: finalMimeType,
    wasCompressed: compressed.wasCompressed,
    savedBytes: compressed.savedBytes,
  }
}

/**
 * Store a service item photo as blob
 */
export async function storeServiceItemPhoto(
  itemId: string,
  file: File,
  keterangan?: string | null,
  buffer?: Buffer
): Promise<BlobStoreResult> {
  let fileBuffer = buffer || Buffer.from(await file.arrayBuffer())
  const originalMimeType = file.type

  // Compress (always image for photos)
  const compressed = await compressBuffer(fileBuffer, originalMimeType, 'photo')
  fileBuffer = compressed.buffer
  const finalMimeType = compressed.mimeType

  const photo = await db.serviceItemPhoto.create({
    data: {
      itemId,
      fileName: file.name,
      filePath: '', // Will be updated below
      fileSize: fileBuffer.length,
      fileType: finalMimeType,
      mimeType: finalMimeType,
      data: fileBuffer,
      keterangan: keterangan || null,
    },
  })

  // Update filePath to point to the blob serving URL
  const filePath = buildBlobUrl('service-photo', photo.id)
  await db.serviceItemPhoto.update({
    where: { id: photo.id },
    data: { filePath },
  })

  return {
    id: photo.id,
    fileName: file.name,
    filePath,
    fileSize: fileBuffer.length,
    mimeType: finalMimeType,
    wasCompressed: compressed.wasCompressed,
    savedBytes: compressed.savedBytes,
  }
}

/**
 * Store a workshop document as blob
 */
export async function storeWorkshopDocument(
  workshopId: string,
  file: File,
  jenisDokumen: string,
  keterangan?: string | null,
  uploadedBy?: string | null,
  buffer?: Buffer
): Promise<BlobStoreResult> {
  let fileBuffer = buffer || Buffer.from(await file.arrayBuffer())
  const originalMimeType = file.type

  // Compress if image
  const compressed = await compressBuffer(fileBuffer, originalMimeType, 'document')
  fileBuffer = compressed.buffer
  const finalMimeType = compressed.mimeType

  const doc = await db.workshopDocument.create({
    data: {
      workshopId,
      jenisDokumen,
      fileName: file.name,
      filePath: '', // Will be updated below
      fileSize: fileBuffer.length,
      fileType: finalMimeType,
      mimeType: finalMimeType,
      data: fileBuffer,
      keterangan: keterangan || null,
      uploadedBy: uploadedBy || null,
    },
  })

  // Update filePath to point to the blob serving URL
  const filePath = buildBlobUrl('workshop-doc', doc.id)
  await db.workshopDocument.update({
    where: { id: doc.id },
    data: { filePath },
  })

  return {
    id: doc.id,
    fileName: file.name,
    filePath,
    fileSize: fileBuffer.length,
    mimeType: finalMimeType,
    wasCompressed: compressed.wasCompressed,
    savedBytes: compressed.savedBytes,
  }
}

/**
 * Store a vehicle document as blob
 */
export async function storeVehicleDocument(
  vehicleId: string,
  file: File,
  jenisDokumen: string,
  buffer?: Buffer
): Promise<BlobStoreResult> {
  let fileBuffer = buffer || Buffer.from(await file.arrayBuffer())
  const originalMimeType = file.type

  // Compress if image
  const compressed = await compressBuffer(fileBuffer, originalMimeType, 'document')
  fileBuffer = compressed.buffer
  const finalMimeType = compressed.mimeType

  const doc = await db.vehicleDocument.create({
    data: {
      vehicleId,
      jenisDokumen,
      fileName: file.name,
      filePath: '', // Will be updated below
      fileSize: fileBuffer.length,
      mimeType: finalMimeType,
      data: fileBuffer,
    },
  })

  // Update filePath to point to the blob serving URL
  const filePath = buildBlobUrl('vehicle-doc', doc.id)
  await db.vehicleDocument.update({
    where: { id: doc.id },
    data: { filePath },
  })

  return {
    id: doc.id,
    fileName: file.name,
    filePath,
    fileSize: fileBuffer.length,
    mimeType: finalMimeType,
    wasCompressed: compressed.wasCompressed,
    savedBytes: compressed.savedBytes,
  }
}

/**
 * Store a generic blob file (for app_logo, app_favicon, etc.)
 * Also updates the SystemSetting key to point to the blob URL
 */
export async function storeBlobFile(
  key: string,
  file: File,
  context: 'logo' | 'favicon' | 'other' = 'other',
  buffer?: Buffer
): Promise<BlobStoreResult> {
  let fileBuffer = buffer || Buffer.from(await file.arrayBuffer())
  const originalMimeType = file.type

  // Compress if image
  const compressionContext = context === 'other' ? 'document' : context
  const compressed = await compressBuffer(fileBuffer, originalMimeType, compressionContext)
  fileBuffer = compressed.buffer
  const finalMimeType = compressed.mimeType

  // Upsert the blob file (one per key)
  const existing = await db.blobFile.findUnique({ where: { key } })

  let blobId: string
  if (existing) {
    const updated = await db.blobFile.update({
      where: { key },
      data: {
        fileName: file.name,
        mimeType: finalMimeType,
        size: fileBuffer.length,
        data: fileBuffer,
      },
    })
    blobId = updated.id
  } else {
    const created = await db.blobFile.create({
      data: {
        key,
        fileName: file.name,
        mimeType: finalMimeType,
        size: fileBuffer.length,
        data: fileBuffer,
      },
    })
    blobId = created.id
  }

  // Update the SystemSetting to point to the blob URL
  const filePath = buildBlobUrl('blob', key)
  const settingKey = key === 'app_logo' ? 'app_logo' : key === 'app_favicon' ? 'app_favicon' : key

  await db.systemSetting.upsert({
    where: { key: settingKey },
    update: { value: filePath },
    create: { key: settingKey, value: filePath },
  })

  return {
    id: blobId,
    fileName: file.name,
    filePath,
    fileSize: fileBuffer.length,
    mimeType: finalMimeType,
    wasCompressed: compressed.wasCompressed,
    savedBytes: compressed.savedBytes,
  }
}

/**
 * Retrieve a blob file by category and ID
 * Returns the file data, MIME type, and file name
 * Falls back to filesystem for old files that don't have blob data
 */
export async function retrieveBlob(
  category: BlobCategory,
  idOrKey: string
): Promise<{
  data: Buffer
  mimeType: string
  fileName: string
} | null> {
  try {
    switch (category) {
      case 'service-doc': {
        const doc = await db.serviceDocument.findUnique({ where: { id: idOrKey } })
        if (!doc) return null
        if (doc.data) {
          return {
            data: Buffer.from(doc.data),
            mimeType: doc.mimeType || doc.fileType || 'application/octet-stream',
            fileName: doc.fileName,
          }
        }
        // Fallback to filesystem for old files
        return readFromFilesystem(doc.filePath, doc.fileName, doc.fileType)
      }
      case 'service-photo': {
        const photo = await db.serviceItemPhoto.findUnique({ where: { id: idOrKey } })
        if (!photo) return null
        if (photo.data) {
          return {
            data: Buffer.from(photo.data),
            mimeType: photo.mimeType || photo.fileType || 'image/jpeg',
            fileName: photo.fileName,
          }
        }
        // Fallback to filesystem for old files
        return readFromFilesystem(photo.filePath, photo.fileName, photo.fileType)
      }
      case 'workshop-doc': {
        const doc = await db.workshopDocument.findUnique({ where: { id: idOrKey } })
        if (!doc) return null
        if (doc.data) {
          return {
            data: Buffer.from(doc.data),
            mimeType: doc.mimeType || doc.fileType || 'application/octet-stream',
            fileName: doc.fileName,
          }
        }
        // Fallback to filesystem for old files
        return readFromFilesystem(doc.filePath, doc.fileName, doc.fileType)
      }
      case 'vehicle-doc': {
        const doc = await db.vehicleDocument.findUnique({ where: { id: idOrKey } })
        if (!doc) return null
        if (doc.data) {
          return {
            data: Buffer.from(doc.data),
            mimeType: doc.mimeType || 'application/octet-stream',
            fileName: doc.fileName,
          }
        }
        // Fallback to filesystem for old files
        return readFromFilesystem(doc.filePath, doc.fileName, undefined)
      }
      case 'blob': {
        // idOrKey is the key for BlobFile (e.g., "app_logo")
        const blob = await db.blobFile.findUnique({ where: { key: idOrKey } })
        if (!blob?.data) return null
        return {
          data: Buffer.from(blob.data),
          mimeType: blob.mimeType,
          fileName: blob.fileName,
        }
      }
      default:
        return null
    }
  } catch (error) {
    console.error('Error retrieving blob:', error)
    return null
  }
}

/**
 * Read a file from the filesystem (backward compatibility for old uploads)
 */
async function readFromFilesystem(
  filePath: string,
  fileName: string,
  fileType?: string | null
): Promise<{ data: Buffer; mimeType: string; fileName: string } | null> {
  try {
    // Only try filesystem for old-style paths
    if (!filePath.startsWith('/uploads/')) return null

    const fullPath = path.join(process.cwd(), 'public', filePath)
    if (!existsSync(fullPath)) return null

    const fileBuffer = await readFile(fullPath)
    const ext = path.extname(fullPath).toLowerCase()
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
    const mimeType = fileType || mimeTypeMap[ext] || 'application/octet-stream'

    return {
      data: fileBuffer,
      mimeType,
      fileName,
    }
  } catch {
    return null
  }
}

/**
 * Delete a blob file and its database record
 * For document models, also removes the database record
 * For BlobFile model, removes the record and updates SystemSetting
 */
export async function deleteBlob(
  category: BlobCategory,
  idOrKey: string
): Promise<boolean> {
  try {
    switch (category) {
      case 'service-doc': {
        await db.serviceDocument.delete({ where: { id: idOrKey } })
        return true
      }
      case 'service-photo': {
        await db.serviceItemPhoto.delete({ where: { id: idOrKey } })
        return true
      }
      case 'workshop-doc': {
        await db.workshopDocument.delete({ where: { id: idOrKey } })
        return true
      }
      case 'vehicle-doc': {
        await db.vehicleDocument.delete({ where: { id: idOrKey } })
        return true
      }
      case 'blob': {
        await db.blobFile.delete({ where: { key: idOrKey } })
        // Also update SystemSetting
        const settingKey = idOrKey
        try {
          await db.systemSetting.update({
            where: { key: settingKey },
            data: { value: null },
          })
        } catch {
          // Setting may not exist
        }
        return true
      }
      default:
        return false
    }
  } catch (error) {
    console.error('Error deleting blob:', error)
    return false
  }
}

/**
 * Get storage statistics for the blob store
 */
export async function getBlobStorageStats(): Promise<{
  serviceDocs: { count: number; totalSize: number }
  servicePhotos: { count: number; totalSize: number }
  workshopDocs: { count: number; totalSize: number }
  vehicleDocs: { count: number; totalSize: number }
  blobFiles: { count: number; totalSize: number }
  total: { count: number; totalSize: number }
}> {
  const [serviceDocs, servicePhotos, workshopDocs, vehicleDocs, blobFiles] = await Promise.all([
    db.serviceDocument.aggregate({ _count: true, _sum: { fileSize: true } }),
    db.serviceItemPhoto.aggregate({ _count: true, _sum: { fileSize: true } }),
    db.workshopDocument.aggregate({ _count: true, _sum: { fileSize: true } }),
    db.vehicleDocument.aggregate({ _count: true, _sum: { fileSize: true } }),
    db.blobFile.aggregate({ _count: true, _sum: { size: true } }),
  ])

  const totalServiceDocs = serviceDocs._sum.fileSize || 0
  const totalServicePhotos = servicePhotos._sum.fileSize || 0
  const totalWorkshopDocs = workshopDocs._sum.fileSize || 0
  const totalVehicleDocs = vehicleDocs._sum.fileSize || 0
  const totalBlobFiles = blobFiles._sum.size || 0

  const totalCount = serviceDocs._count + servicePhotos._count + workshopDocs._count + vehicleDocs._count + blobFiles._count
  const totalSize = totalServiceDocs + totalServicePhotos + totalWorkshopDocs + totalVehicleDocs + totalBlobFiles

  return {
    serviceDocs: { count: serviceDocs._count, totalSize: totalServiceDocs },
    servicePhotos: { count: servicePhotos._count, totalSize: totalServicePhotos },
    workshopDocs: { count: workshopDocs._count, totalSize: totalWorkshopDocs },
    vehicleDocs: { count: vehicleDocs._count, totalSize: totalVehicleDocs },
    blobFiles: { count: blobFiles._count, totalSize: totalBlobFiles },
    total: { count: totalCount, totalSize },
  }
}
