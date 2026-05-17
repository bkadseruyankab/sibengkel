import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFileSync, statSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    // Get last backup info
    const lastBackupSetting = await db.systemSetting.findUnique({
      where: { key: 'last_backup_date' },
    })

    // Get DB stats
    const [userCount, vehicleCount, serviceCount, workshopCount] = await Promise.all([
      db.user.count(),
      db.vehicle.count(),
      db.service.count(),
      db.workshop.count(),
    ])

    // Try to get the DB file info
    let dbSize = 0
    try {
      const dbPath = join(process.cwd(), 'db', 'custom.db')
      const stats = statSync(dbPath)
      dbSize = stats.size
    } catch {}

    return NextResponse.json({
      lastBackup: lastBackupSetting?.value || null,
      stats: {
        users: userCount,
        vehicles: vehicleCount,
        services: serviceCount,
        workshops: workshopCount,
        dbSize,
        dbSizeFormatted: dbSize > 0 ? `${(dbSize / 1024).toFixed(1)} KB` : 'N/A',
      },
    })
  } catch (error) {
    console.error('Error fetching backup info:', error)
    return NextResponse.json({ error: 'Failed to fetch backup info' }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Record backup timestamp
    const now = new Date().toISOString()
    await db.systemSetting.upsert({
      where: { key: 'last_backup_date' },
      update: { value: now },
      create: { key: 'last_backup_date', value: now },
    })

    // Read the SQLite database file
    const dbPath = join(process.cwd(), 'db', 'custom.db')
    const buffer = readFileSync(dbPath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=bkad-backup-${new Date().toISOString().slice(0, 10)}.db`,
      },
    })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File backup tidak ditemukan' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.db')) {
      return NextResponse.json({ error: 'File harus berformat .db' }, { status: 400 })
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File terlalu besar (maks 100MB)' }, { status: 400 })
    }

    // Read the uploaded file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate it's a valid SQLite file (SQLite header starts with "SQLite format 3")
    const header = buffer.slice(0, 16).toString('utf8')
    if (!header.startsWith('SQLite format 3')) {
      return NextResponse.json({ error: 'File bukan database SQLite yang valid' }, { status: 400 })
    }

    const dbPath = join(process.cwd(), 'db', 'custom.db')
    const backupPath = join(process.cwd(), 'db', 'custom-pre-restore.db.bak')

    // Create a safety backup of the current database before overwriting
    try {
      if (existsSync(dbPath)) {
        const currentDb = readFileSync(dbPath)
        writeFileSync(backupPath, currentDb)
      }
    } catch (err) {
      console.error('Failed to create safety backup before restore:', err)
    }

    // Disconnect Prisma before replacing the file
    try {
      await db.$disconnect()
    } catch {
      // Ignore disconnect errors
    }

    // Write the new database file
    try {
      writeFileSync(dbPath, buffer)
    } catch (err) {
      // If write fails, try to restore the safety backup
      try {
        if (existsSync(backupPath)) {
          const safetyBackup = readFileSync(backupPath)
          writeFileSync(dbPath, safetyBackup)
        }
      } catch {}
      console.error('Failed to write restored database:', err)
      return NextResponse.json({ error: 'Gagal menulis file database' }, { status: 500 })
    }

    // Clean up the safety backup after successful restore
    try {
      if (existsSync(backupPath)) {
        unlinkSync(backupPath)
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Database berhasil dipulihkan. Halaman akan dimuat ulang.',
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
    })
  } catch (error) {
    console.error('Error restoring backup:', error)
    return NextResponse.json({ error: 'Gagal memulihkan database' }, { status: 500 })
  }
}
