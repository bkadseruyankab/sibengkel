import sharp from 'sharp'
import { db } from './db'

/**
 * Compression settings interface
 */
export interface CompressionSettings {
  enabled: boolean
  quality: number        // 1-100 (for JPEG/WebP)
  maxWidth: number       // Max width in pixels
  maxHeight: number      // Max height in pixels
  format: 'jpeg' | 'webp' | 'original'  // Output format
  compressPhotos: boolean   // Compress service item photos
  compressDocuments: boolean // Compress service/bengkel/vehicle documents (images only)
  compressLogo: boolean     // Compress app logo
}

/**
 * Compression result metadata
 */
export interface CompressionResult {
  originalSize: number
  compressedSize: number
  savedBytes: number
  savedPercent: number
  wasCompressed: boolean
  format: string
  width?: number
  height?: number
}

/**
 * Default compression settings
 */
export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  enabled: true,
  quality: 80,
  maxWidth: 1920,
  maxHeight: 1080,
  format: 'original',
  compressPhotos: true,
  compressDocuments: true,
  compressLogo: true,
}

/**
 * Get compression settings from database
 */
export async function getCompressionSettings(): Promise<CompressionSettings> {
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
    ]

    const settings = await db.systemSetting.findMany({
      where: { key: { in: keys } },
    })

    const map: Record<string, string> = {}
    settings.forEach(s => {
      map[s.key] = s.value || ''
    })

    return {
      enabled: map.compress_enabled !== 'false',
      quality: parseInt(map.compress_quality) || DEFAULT_COMPRESSION_SETTINGS.quality,
      maxWidth: parseInt(map.compress_max_width) || DEFAULT_COMPRESSION_SETTINGS.maxWidth,
      maxHeight: parseInt(map.compress_max_height) || DEFAULT_COMPRESSION_SETTINGS.maxHeight,
      format: (['jpeg', 'webp', 'original'].includes(map.compress_format) ? map.compress_format : 'original') as CompressionSettings['format'],
      compressPhotos: map.compress_photos !== 'false',
      compressDocuments: map.compress_documents !== 'false',
      compressLogo: map.compress_logo !== 'false',
    }
  } catch {
    return DEFAULT_COMPRESSION_SETTINGS
  }
}

/**
 * Check if a MIME type is compressible
 */
export function isCompressibleImage(mimeType: string): boolean {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType)
}

/**
 * Check if compression should be applied for a given context
 */
export function shouldCompress(
  settings: CompressionSettings,
  mimeType: string,
  context: 'photo' | 'document' | 'logo'
): boolean {
  if (!settings.enabled) return false
  if (!isCompressibleImage(mimeType)) return false

  switch (context) {
    case 'photo':
      return settings.compressPhotos
    case 'document':
      return settings.compressDocuments
    case 'logo':
      return settings.compressLogo
    default:
      return false
  }
}

/**
 * Compress an image buffer using sharp
 * @param buffer - Original image buffer
 * @param mimeType - Original MIME type
 * @param settings - Compression settings
 * @returns Compressed buffer and metadata
 */
export async function compressImage(
  buffer: Buffer,
  mimeType: string,
  settings: CompressionSettings
): Promise<{ buffer: Buffer; metadata: CompressionResult }> {
  const originalSize = buffer.length

  try {
    let pipeline = sharp(buffer)

    // Get image metadata
    const metadata = await pipeline.metadata()
    const originalWidth = metadata.width || 0
    const originalHeight = metadata.height || 0

    // Resize if exceeds max dimensions (maintain aspect ratio)
    if (originalWidth > settings.maxWidth || originalHeight > settings.maxHeight) {
      pipeline = pipeline.resize(settings.maxWidth, settings.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    // Determine output format
    let outputFormat = settings.format
    if (outputFormat === 'original') {
      // Keep original format for PNGs (they may have transparency)
      // Only convert to JPEG for JPEG input
      if (mimeType === 'image/png') {
        outputFormat = 'png' // Keep PNG as PNG to preserve transparency
      } else if (mimeType === 'image/webp') {
        outputFormat = 'webp'
      } else {
        outputFormat = 'jpeg'
      }
    }

    // Apply compression based on format
    let compressedBuffer: Buffer
    let finalFormat: string

    switch (outputFormat) {
      case 'png':
        compressedBuffer = await pipeline
          .png({ quality: settings.quality, compressionLevel: 9, effort: 7 })
          .toBuffer()
        finalFormat = 'image/png'
        break
      case 'webp':
        compressedBuffer = await pipeline
          .webp({ quality: settings.quality, effort: 4 })
          .toBuffer()
        finalFormat = 'image/webp'
        break
      case 'jpeg':
      default:
        compressedBuffer = await pipeline
          .jpeg({ quality: settings.quality, mozjpeg: true })
          .toBuffer()
        finalFormat = 'image/jpeg'
        break
    }

    // If compressed is larger than original (rare but possible with small images), use original
    if (compressedBuffer.length >= originalSize) {
      return {
        buffer,
        metadata: {
          originalSize,
          compressedSize: originalSize,
          savedBytes: 0,
          savedPercent: 0,
          wasCompressed: false,
          format: mimeType,
          width: originalWidth,
          height: originalHeight,
        },
      }
    }

    const compressedSize = compressedBuffer.length
    const savedBytes = originalSize - compressedSize
    const savedPercent = Math.round((savedBytes / originalSize) * 100)

    // Get dimensions of compressed image
    const compressedMeta = await sharp(compressedBuffer).metadata()

    return {
      buffer: compressedBuffer,
      metadata: {
        originalSize,
        compressedSize,
        savedBytes,
        savedPercent,
        wasCompressed: true,
        format: finalFormat,
        width: compressedMeta.width || originalWidth,
        height: compressedMeta.height || originalHeight,
      },
    }
  } catch (error) {
    console.error('Compression error, using original:', error)
    // If compression fails, return original buffer
    return {
      buffer,
      metadata: {
        originalSize,
        compressedSize: originalSize,
        savedBytes: 0,
        savedPercent: 0,
        wasCompressed: false,
        format: mimeType,
      },
    }
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
