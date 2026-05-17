import { db } from '@/lib/db'

/**
 * Notification helper functions for the Vehicle Service Information System.
 *
 * Every public function:
 *   1. Persists an in-app Notification record in the database (always succeeds)
 *   2. Attempts to send WA via Fonnte API / Email via SMTP (best-effort, wrapped in try/catch)
 */

// ---------------------------------------------------------------------------
// Settings helper
// ---------------------------------------------------------------------------

async function getSettingsMap(): Promise<Record<string, string>> {
  const settings = await db.systemSetting.findMany()
  const map: Record<string, string> = {}
  settings.forEach(s => {
    map[s.key] = s.value || ''
  })
  return map
}

// ---------------------------------------------------------------------------
// WA / Email external sending (best-effort)
// ---------------------------------------------------------------------------

async function sendWAExternal(phone: string, message: string): Promise<void> {
  try {
    const settingsMap = await getSettingsMap()
    const apiKey = settingsMap.fonnte_api_key

    if (!apiKey) {
      // Fallback to z-ai-web-dev-sdk if Fonnte not configured
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default
        const zai = await ZAI.create()
        await zai.functions.invoke('send_whatsapp', { to: phone, message })
      } catch (sdkError) {
        console.warn('[Notification] WA send via SDK failed (no Fonnte key):', sdkError instanceof Error ? sdkError.message : sdkError)
      }
      return
    }

    // Clean phone number
    let cleanPhone = phone.replace(/[\s\-()]/g, '')
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
        message,
      }),
    })

    const result = await response.json()
    if (!response.ok && !(result.status === true || result.status === 'true')) {
      console.warn('[Notification] Fonnte WA send failed:', result.message || result.reason || 'Unknown error')
    }
  } catch (error) {
    console.warn('[Notification] WA send failed (best-effort):', error instanceof Error ? error.message : error)
  }
}

async function sendEmailExternal(email: string, subject: string, body: string): Promise<void> {
  try {
    const settingsMap = await getSettingsMap()
    const smtpHost = settingsMap.smtp_host
    const smtpPort = settingsMap.smtp_port
    const smtpUser = settingsMap.smtp_username
    const smtpPass = settingsMap.smtp_password
    const smtpFrom = settingsMap.smtp_from_email

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      // Use SMTP via nodemailer
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

        const appName = settingsMap.app_name || 'SIService BKAD'

        await transporter.sendMail({
          from: `"${appName}" <${smtpFrom || smtpUser}>`,
          to: email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0f766e, #10b981); padding: 16px 20px; border-radius: 10px 10px 0 0;">
                <h2 style="color: white; margin: 0; font-size: 16px;">${appName}</h2>
              </div>
              <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">
                <h3 style="margin: 0 0 12px; font-size: 15px; color: #1f2937;">${subject}</h3>
                <div style="font-size: 14px; color: #374151; line-height: 1.6;">${body.replace(/\n/g, '<br/>')}</div>
              </div>
              <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 12px;">
                Email ini dikirim secara otomatis oleh sistem ${appName}
              </p>
            </div>
          `,
        })
        return // Success
      } catch (mailerError) {
        console.warn('[Notification] SMTP send failed, falling back to SDK:', mailerError instanceof Error ? mailerError.message : mailerError)
      }
    }

    // Fallback to z-ai-web-dev-sdk
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      await zai.functions.invoke('send_email', { to: email, subject, body })
    } catch (sdkError) {
      console.warn('[Notification] Email send failed (best-effort):', sdkError instanceof Error ? sdkError.message : sdkError)
    }
  } catch (error) {
    console.warn('[Notification] Email send failed (best-effort):', error instanceof Error ? error.message : error)
  }
}

// ---------------------------------------------------------------------------
// Notification toggle check
// ---------------------------------------------------------------------------

async function isNotifEnabled(key: string): Promise<boolean> {
  try {
    const setting = await db.systemSetting.findUnique({ where: { key } })
    return setting?.value === 'true'
  } catch {
    return true // Default to enabled if can't check
  }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Create an in-app notification for a specific user + attempt WA/Email.
 */
export async function sendNotificationToUser(
  userId: string,
  title: string,
  message: string,
  type: string = 'INFO',
): Promise<void> {
  // 1. Always create in-app notification
  await db.notification.create({
    data: { userId, title, message, type },
  })

  // 2. Best-effort WA/Email
  try {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return

    const waPromise = user.phone ? sendWAExternal(user.phone, `*${title}*\n\n${message}`) : Promise.resolve()
    const emailPromise = user.email ? sendEmailExternal(user.email, title, message) : Promise.resolve()

    await Promise.allSettled([waPromise, emailPromise])
  } catch (error) {
    console.warn('[Notification] External send failed for user:', error instanceof Error ? error.message : error)
  }
}

/**
 * Create in-app notifications for ALL active users belonging to a bengkel
 * + attempt WA/Email for each.
 */
export async function sendNotificationToBengkel(
  bengkelId: string,
  title: string,
  message: string,
  type: string = 'INFO',
): Promise<void> {
  const users = await db.user.findMany({
    where: { bengkelId, isActive: true },
  })

  await Promise.allSettled(
    users.map((u) => sendNotificationToUser(u.id, title, message, type)),
  )
}

/**
 * Create in-app notifications for ALL active admin / super_admin users
 * + attempt WA/Email for each.
 */
export async function sendNotificationToAdmins(
  title: string,
  message: string,
  type: string = 'INFO',
): Promise<void> {
  const admins = await db.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
  })

  await Promise.allSettled(
    admins.map((a) => sendNotificationToUser(a.id, title, message, type)),
  )
}

/**
 * Send a notification for a specific event type, checking if the event is enabled.
 */
export async function sendEventNotification(
  eventKey: string,
  userQuery: { userId?: string; bengkelId?: string; adminOnly?: boolean },
  title: string,
  message: string,
  type: string = 'INFO',
): Promise<void> {
  const enabled = await isNotifEnabled(eventKey)
  if (!enabled) return

  if (userQuery.userId) {
    await sendNotificationToUser(userQuery.userId, title, message, type)
  } else if (userQuery.bengkelId) {
    await sendNotificationToBengkel(userQuery.bengkelId, title, message, type)
  } else if (userQuery.adminOnly) {
    await sendNotificationToAdmins(title, message, type)
  }
}
