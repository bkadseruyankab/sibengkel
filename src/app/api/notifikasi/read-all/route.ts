import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || ''

    const where: any = { isRead: false }
    if (userId) where.userId = userId

    const result = await db.notification.updateMany({
      where,
      data: { isRead: true },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 })
  }
}
