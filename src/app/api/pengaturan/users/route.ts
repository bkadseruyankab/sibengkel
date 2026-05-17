import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        bengkelId: true,
        createdAt: true,
        bengkel: { select: { namaBengkel: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role, bengkelId } = body

    // Check if email exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        password: password || 'default_password',
        role: role || 'ADMIN',
        bengkelId: role === 'BENGKEL' ? bengkelId : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        bengkelId: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, email, password, role, bengkelId, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID diperlukan' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // If email is changing, check for duplicates
    if (email && email !== existingUser.email) {
      const emailExists = await db.user.findUnique({ where: { email } })
      if (emailExists) {
        return NextResponse.json({ error: 'Email sudah digunakan oleh user lain' }, { status: 400 })
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (password !== undefined && password !== '') updateData.password = password
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive

    // Handle bengkelId based on role
    if (role !== undefined) {
      if (role === 'BENGKEL') {
        updateData.bengkelId = bengkelId || null
      } else {
        updateData.bengkelId = null
      }
    } else if (bengkelId !== undefined) {
      updateData.bengkelId = bengkelId || null
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        bengkelId: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID diperlukan' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // Instead of actually deleting, toggle isActive (soft delete)
    const user = await db.user.update({
      where: { id },
      data: { isActive: !existingUser.isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        bengkelId: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
