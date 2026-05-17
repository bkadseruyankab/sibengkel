import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/setup — Check if setup is needed
export async function GET() {
  try {
    const [setupCompleted, userCount] = await Promise.all([
      db.systemSetting.findUnique({ where: { key: 'setup_completed' } }),
      db.user.count(),
    ])

    const hasSettings = !!setupCompleted
    const hasUsers = userCount > 0
    const needsSetup = !hasUsers && !hasSettings

    return NextResponse.json({
      needsSetup,
      hasUsers,
      hasSettings,
    })
  } catch (error) {
    console.error('Error checking setup status:', error)
    return NextResponse.json(
      { error: 'Gagal memeriksa status setup' },
      { status: 500 }
    )
  }
}

// POST /api/setup — Save setup wizard data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appSettings, admin, bengkel } = body as {
      appSettings?: Record<string, string>
      admin?: {
        name: string
        email: string
        password: string
      }
      bengkel?: {
        namaBengkel: string
        alamat?: string
        noTelepon?: string
        picBengkel?: string
      }
    }

    // Validate required fields
    if (!appSettings || !admin) {
      return NextResponse.json(
        { error: 'Data appSettings dan admin harus diisi' },
        { status: 400 }
      )
    }

    if (!admin.name || !admin.email || !admin.password) {
      return NextResponse.json(
        { error: 'Nama, email, dan password admin harus diisi' },
        { status: 400 }
      )
    }

    // Prevent re-running setup if already completed
    const existingSetup = await db.systemSetting.findUnique({
      where: { key: 'setup_completed' },
    })

    if (existingSetup?.value === 'true') {
      return NextResponse.json(
        { error: 'Setup sudah pernah dilakukan' },
        { status: 409 }
      )
    }

    // Check if a SUPER_ADMIN already exists
    const existingSuperAdmin = await db.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    })

    if (existingSuperAdmin) {
      return NextResponse.json(
        { error: 'Super Admin sudah ada, setup tidak dapat dilakukan' },
        { status: 409 }
      )
    }

    // Check if user with same email already exists
    const existingUser = await db.user.findUnique({
      where: { email: admin.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 409 }
      )
    }

    // Execute everything in a transaction
    await db.$transaction(async (tx) => {
      // Step 1: Save app settings using upsert
      const settingsToSave: Record<string, string> = {
        ...appSettings,
        setup_completed: 'true',
      }

      for (const [key, value] of Object.entries(settingsToSave)) {
        await tx.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      }

      // Step 2: Create Super Admin user
      const newAdmin = await tx.user.create({
        data: {
          name: admin.name,
          email: admin.email,
          password: admin.password, // stored as-is matching existing pattern
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      })

      // Step 3: Create initial bengkel (optional)
      if (bengkel?.namaBengkel) {
        const workshop = await tx.workshop.create({
          data: {
            namaBengkel: bengkel.namaBengkel,
            alamat: bengkel.alamat || null,
            noTelepon: bengkel.noTelepon || null,
            picBengkel: bengkel.picBengkel || null,
            statusAktif: true,
            canAddService: false,
          },
        })

        // Link the super admin to the bengkel (optional convenience)
        await tx.user.update({
          where: { id: newAdmin.id },
          data: { bengkelId: workshop.id },
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Setup berhasil disimpan',
    })
  } catch (error) {
    console.error('Error saving setup:', error)
    return NextResponse.json(
      { error: 'Gagal menyimpan setup' },
      { status: 500 }
    )
  }
}
