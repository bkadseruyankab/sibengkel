import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params

    // Verify document exists and belongs to vehicle
    const document = await db.vehicleDocument.findFirst({
      where: { id: docId, vehicleId: id },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    // Delete from database (blob data is stored in the record, so it gets deleted too)
    await db.vehicleDocument.delete({
      where: { id: docId },
    })

    return NextResponse.json({ message: 'Dokumen berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus dokumen' },
      { status: 500 }
    )
  }
}
