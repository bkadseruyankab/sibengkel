import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/service/badge-count - Get notification counts for service badge
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || ''
    const bengkelId = searchParams.get('bengkelId') || ''

    let count = 0

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      // Admin sees: new pengajuan from bengkel (PENGAJUAN status), and MENUNGGU_PERSETUJUAN
      count = await db.service.count({
        where: {
          isDeleted: false,
          statusService: { in: ['PENGAJUAN', 'MENUNGGU_PERSETUJUAN'] },
        },
      })
    } else if (role === 'BENGKEL' && bengkelId) {
      // Bengkel sees: new service assigned (DIAJUKAN), approved (DISETUJUI - can update progress), rejected (DITOLAK - needs correction)
      count = await db.service.count({
        where: {
          isDeleted: false,
          bengkelId,
          statusService: { in: ['DIAJUKAN', 'DISETUJUI', 'DITOLAK'] },
        },
      })
    } else if (role === 'PIMPINAN') {
      // Pimpinan sees: services waiting for their approval
      count = await db.service.count({
        where: {
          isDeleted: false,
          statusService: { in: ['MENUNGGU_PERSETUJUAN', 'PENGAJUAN'] },
        },
      })
    }

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching service badge count:', error)
    return NextResponse.json({ count: 0 })
  }
}
