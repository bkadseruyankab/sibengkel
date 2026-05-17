import { NextResponse } from 'next/server'
import { getBlobStorageStats } from '@/lib/blob-store'

// GET /api/pengaturan/storage - Get blob storage statistics
export async function GET() {
  try {
    const stats = await getBlobStorageStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching storage stats:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil statistik penyimpanan' },
      { status: 500 }
    )
  }
}
