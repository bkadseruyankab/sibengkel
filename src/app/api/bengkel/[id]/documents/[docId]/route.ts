import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string; docId: string }> }

// DELETE /api/bengkel/[id]/documents/[docId] - Delete a workshop document
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id, docId } = await context.params

    const document = await db.workshopDocument.findFirst({
      where: { id: docId, workshopId: id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    // Delete from database (blob data is stored in the record, so it gets deleted too)
    await db.workshopDocument.delete({
      where: { id: docId },
    })

    return NextResponse.json({ message: 'Dokumen berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting workshop document:', error)
    return NextResponse.json({ error: 'Gagal menghapus dokumen' }, { status: 500 })
  }
}
