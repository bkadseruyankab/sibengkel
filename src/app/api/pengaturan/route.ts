import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.systemSetting.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach(s => {
      settingsMap[s.key] = s.value || ''
    })

    // Backward compatibility: bengkel_can_create_service is now per-bengkel
    // (via Workshop.canAddService), but we still expose the global setting
    // for the UI. If it doesn't exist yet, default to 'false'.
    if (!settingsMap.bengkel_can_create_service) {
      settingsMap.bengkel_can_create_service = 'false'
    }

    // Default values for application identity settings
    const appDefaults: Record<string, string> = {
      app_name: 'SIService BKAD',
      app_short_name: 'BKAD',
      app_description: '',
      app_instansi: 'Badan Keuangan dan Aset Daerah',
      app_address: '',
      app_phone: '',
      app_email: '',
      app_logo: '',
      app_favicon: '',
      app_kop_line1: 'PEMERINTAH KABUPATEN/KOTA',
      app_kop_line2: 'BADAN KEUANGAN DAN ASET DAERAH',
      app_kop_line3: 'UNIT LAYANAN PENGADAAN',
      app_kepala_nama: '',
      app_kepala_nip: '',
      app_kepala_jabatan: 'Kepala BKAD',
      app_tempat_ttd: 'Kabupaten/Kota',
      app_sekda_nama: '',
      app_sekda_nip: '',
      app_tte_image: '',
      app_print_logo: '',
      app_kabupaten_kota: '',
    }

    for (const [key, defaultValue] of Object.entries(appDefaults)) {
      if (!(key in settingsMap)) {
        settingsMap[key] = defaultValue
      }
    }

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body as { settings: Record<string, string> }

    // Handle backward compatibility for bengkel_can_create_service:
    // The global setting is kept for reference, but the actual permission
    // is now per-bengkel via Workshop.canAddService.
    // If the global setting is changed, we do NOT automatically update
    // all workshops — the admin should toggle each workshop individually.
    // However, we still persist the global setting so the UI can show it.

    const updates = Object.entries(settings).map(([key, value]) =>
      db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )

    await Promise.all(updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
