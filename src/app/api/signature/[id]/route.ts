import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/signature/[id]?userId=xxx - Delete a signature
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    // Find the signature
    const signature = await db.signature.findFirst({
      where: { id, userId },
    })

    if (!signature) {
      return NextResponse.json({ error: 'Tanda tangan tidak ditemukan' }, { status: 404 })
    }

    // Delete the signature
    await db.signature.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Tanda tangan berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting signature:', error)
    return NextResponse.json({ error: 'Gagal menghapus tanda tangan' }, { status: 500 })
  }
}
