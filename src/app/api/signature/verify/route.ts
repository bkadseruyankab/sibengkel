import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/signature/verify?userId=xxx - Verify a signature by user ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    const signature = await db.signature.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      hasSignature: !!signature,
      signature: signature ? {
        id: signature.id,
        imageData: signature.imageData,
        createdAt: signature.createdAt,
        updatedAt: signature.updatedAt,
      } : null,
    })
  } catch (error) {
    console.error('Error verifying signature:', error)
    return NextResponse.json({ error: 'Gagal memverifikasi tanda tangan' }, { status: 500 })
  }
}
