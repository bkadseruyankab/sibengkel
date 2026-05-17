import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string; itemId: string; photoId: string }> }

// DELETE /api/service/[id]/items/[itemId]/photos/[photoId] - Delete a specific photo
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id, itemId, photoId } = await context.params

    // Verify service exists
    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    // Verify the photo belongs to this item and service
    const photo = await db.serviceItemPhoto.findFirst({
      where: { id: photoId, itemId },
      include: { item: { select: { serviceId: true } } },
    })

    if (!photo || photo.item.serviceId !== id) {
      return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 })
    }

    // Delete from database (blob data is stored in the record, so it gets deleted too)
    await db.serviceItemPhoto.delete({
      where: { id: photoId },
    })

    return NextResponse.json({ message: 'Foto berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting item photo:', error)
    return NextResponse.json({ error: 'Gagal menghapus foto' }, { status: 500 })
  }
}
