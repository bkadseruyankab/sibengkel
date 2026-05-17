import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, testTarget } = body as { type: 'whatsapp' | 'email'; testTarget?: string }

    // Get all notification settings
    const settings = await db.systemSetting.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach(s => {
      settingsMap[s.key] = s.value || ''
    })

    if (type === 'whatsapp') {
      const apiKey = settingsMap.fonnte_api_key
      if (!apiKey) {
        return NextResponse.json({ success: false, error: 'API Key Fonnte belum dikonfigurasi' }, { status: 400 })
      }

      const targetPhone = testTarget || settingsMap.fonnte_admin_phone
      if (!targetPhone) {
        return NextResponse.json({ success: false, error: 'Nomor WhatsApp tujuan belum diisi' }, { status: 400 })
      }

      // Clean phone number - remove spaces, dashes, and ensure format
      let cleanPhone = targetPhone.replace(/[\s\-()]/g, '')
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.substring(1)
      }
      if (!cleanPhone.startsWith('62') && !cleanPhone.startsWith('+')) {
        cleanPhone = '62' + cleanPhone
      }

      const fonnteUrl = 'https://api.fonnte.com/send'

      const response = await fetch(fonnteUrl, {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: cleanPhone,
          message: `✅ *Test Notifikasi WhatsApp*\n\nPesan ini dikirim dari *${settingsMap.app_name || 'SIService BKAD'}*\n\nTanggal: ${new Date().toLocaleString('id-ID')}\n\nJika Anda menerima pesan ini, konfigurasi WhatsApp Fonnte berhasil! 🎉`,
        }),
      })

      const result = await response.json()

      if (response.ok && (result.status === true || result.status === 'true' || result.code === 200)) {
        return NextResponse.json({ success: true, message: `Pesan test berhasil dikirim ke ${targetPhone}` })
      } else {
        const errorMsg = result.message || result.reason || result.detail || 'Gagal mengirim pesan WhatsApp'
        return NextResponse.json({ success: false, error: `Fonnte: ${errorMsg}` }, { status: 400 })
      }
    }

    if (type === 'email') {
      const smtpHost = settingsMap.smtp_host
      const smtpPort = settingsMap.smtp_port
      const smtpUser = settingsMap.smtp_username
      const smtpPass = settingsMap.smtp_password
      const smtpFrom = settingsMap.smtp_from_email

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        return NextResponse.json({ success: false, error: 'Konfigurasi SMTP belum lengkap (Host, Port, Username, Password)' }, { status: 400 })
      }

      const targetEmail = testTarget || smtpFrom
      if (!targetEmail) {
        return NextResponse.json({ success: false, error: 'Email tujuan belum diisi' }, { status: 400 })
      }

      // Use nodemailer if available, otherwise use z-ai-web-dev-sdk
      try {
        const nodemailer = await import('nodemailer')
        const transporter = nodemailer.default.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: parseInt(smtpPort) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        })

        await transporter.sendMail({
          from: `"${settingsMap.app_name || 'SIService BKAD'}" <${smtpFrom || smtpUser}>`,
          to: targetEmail,
          subject: `Test Notifikasi Email - ${settingsMap.app_name || 'SIService BKAD'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0f766e, #10b981); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">✅ Test Notifikasi Email</h1>
              </div>
              <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 14px; color: #374151;">Pesan ini dikirim dari <strong>${settingsMap.app_name || 'SIService BKAD'}</strong></p>
                <p style="font-size: 14px; color: #374151;">Tanggal: <strong>${new Date().toLocaleString('id-ID')}</strong></p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
                <p style="font-size: 14px; color: #059669; font-weight: bold;">🎉 Jika Anda menerima pesan ini, konfigurasi Email SMTP berhasil!</p>
              </div>
              <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 12px;">
                Email ini dikirim secara otomatis oleh sistem ${settingsMap.app_name || 'SIService BKAD'}
              </p>
            </div>
          `,
        })

        return NextResponse.json({ success: true, message: `Email test berhasil dikirim ke ${targetEmail}` })
      } catch (importError: any) {
        // Fallback to z-ai-web-dev-sdk if nodemailer not available
        try {
          const ZAI = (await import('z-ai-web-dev-sdk')).default
          const zai = await ZAI.create()
          await zai.functions.invoke('send_email', {
            to: targetEmail,
            subject: `Test Notifikasi Email - ${settingsMap.app_name || 'SIService BKAD'}`,
            body: `Pesan test dari ${settingsMap.app_name || 'SIService BKAD'}. Tanggal: ${new Date().toLocaleString('id-ID')}. Jika Anda menerima pesan ini, konfigurasi Email berhasil!`,
          })
          return NextResponse.json({ success: true, message: `Email test berhasil dikirim ke ${targetEmail} (via z-ai SDK)` })
        } catch (sdkError: any) {
          return NextResponse.json({
            success: false,
            error: `Gagal mengirim email: ${importError.message || 'nodemailer tidak tersedia'}. SDK fallback juga gagal: ${sdkError.message || 'unknown error'}`,
          }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Tipe test tidak valid' }, { status: 400 })
  } catch (error: any) {
    console.error('Test notification error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}
