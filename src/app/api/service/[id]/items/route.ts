import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/service/[id]/items - Add items to service
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items tidak boleh kosong' }, { status: 400 })
    }

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    const createdItems = await db.serviceItem.createMany({
      data: items.map((item: { itemName: string; quantity: number; hargaSatuan: number; keterangan?: string }) => ({
        serviceId: id,
        itemName: item.itemName,
        quantity: item.quantity || 1,
        hargaSatuan: item.hargaSatuan || 0,
        totalHarga: (item.quantity || 1) * (item.hargaSatuan || 0),
        keterangan: item.keterangan || null,
      })),
    })

    // Recalculate totalBiaya
    const allItems = await db.serviceItem.findMany({ where: { serviceId: id } })
    const totalBiaya = allItems.reduce((sum, item) => sum + item.totalHarga, 0)
    await db.service.update({
      where: { id },
      data: { totalBiaya },
    })

    return NextResponse.json({ data: createdItems }, { status: 201 })
  } catch (error) {
    console.error('Error adding items:', error)
    return NextResponse.json({ error: 'Gagal menambahkan items' }, { status: 500 })
  }
}

// PUT /api/service/[id]/items - Update items (replace all)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Items tidak valid' }, { status: 400 })
    }

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    // Delete existing and recreate
    await db.serviceItem.deleteMany({ where: { serviceId: id } })

    if (items.length > 0) {
      await db.serviceItem.createMany({
        data: items.map((item: { itemName: string; quantity: number; hargaSatuan: number; keterangan?: string }) => ({
          serviceId: id,
          itemName: item.itemName,
          quantity: item.quantity || 1,
          hargaSatuan: item.hargaSatuan || 0,
          totalHarga: (item.quantity || 1) * (item.hargaSatuan || 0),
          keterangan: item.keterangan || null,
        })),
      })
    }

    // Recalculate totalBiaya
    const allItems = await db.serviceItem.findMany({ where: { serviceId: id } })
    const totalBiaya = allItems.reduce((sum, item) => sum + item.totalHarga, 0)
    await db.service.update({
      where: { id },
      data: { totalBiaya },
    })

    return NextResponse.json({ data: allItems })
  } catch (error) {
    console.error('Error updating items:', error)
    return NextResponse.json({ error: 'Gagal mengupdate items' }, { status: 500 })
  }
}

// DELETE /api/service/[id]/items - Remove a single item
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID diperlukan' }, { status: 400 })
    }

    await db.serviceItem.delete({ where: { id: itemId, serviceId: id } })

    // Recalculate totalBiaya
    const allItems = await db.serviceItem.findMany({ where: { serviceId: id } })
    const totalBiaya = allItems.reduce((sum, item) => sum + item.totalHarga, 0)
    await db.service.update({
      where: { id },
      data: { totalBiaya },
    })

    return NextResponse.json({ message: 'Item berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Gagal menghapus item' }, { status: 500 })
  }
}
