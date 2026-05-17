import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Landing page for /verify (no specific service ID)
// Used when scanning QR from report documents (laporan/riwayat)
export async function GET() {
  try {
    const settings = await db.systemSetting.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach(s => {
      settingsMap[s.key] = s.value || ''
    })

    const appName = settingsMap.app_name || 'SIService BKAD'
    const instansi = settingsMap.app_instansi || 'Badan Keuangan dan Aset Daerah'

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Dokumen - ${appName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; min-height: 100vh; }
  </style>
</head>
<body>
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:16px;padding:32px 24px;color:white;text-align:center;margin-bottom:20px;box-shadow:0 4px 20px rgba(30,64,175,0.3);">
      <div style="width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </div>
      <div style="font-size:14px;opacity:0.85;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Verifikasi Dokumen</div>
      <div style="font-size:14px;opacity:0.9;margin-bottom:4px;">Sistem Penomoran Surat</div>
      <div style="font-size:24px;font-weight:700;margin-bottom:4px;">${appName}</div>
      <div style="font-size:13px;opacity:0.8;">${instansi}</div>
    </div>
    <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center;">
      <div style="width:56px;height:56px;background:#eff6ff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      </div>
      <div style="font-size:18px;font-weight:700;color:#1f2937;margin-bottom:8px;">Dokumen Laporan Resmi</div>
      <div style="font-size:14px;color:#6b7280;line-height:1.6;margin-bottom:20px;">
        QR Code ini berasal dari dokumen laporan resmi yang diterbitkan oleh <strong>${instansi}</strong> melalui sistem <strong>${appName}</strong>.
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;text-align:left;">
        <div style="width:36px;height:36px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div>
          <div style="font-weight:700;font-size:14px;color:#16a34a;">Dokumen Sah & Terverifikasi</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Dokumen ini diterbitkan melalui sistem resmi dinas.</div>
        </div>
      </div>
    </div>
    ${settingsMap.app_kepala_nama ? `
    <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="font-size:13px;color:#6b7280;margin-bottom:8px;">Penandatangan Dokumen:</div>
      <div style="font-weight:700;font-size:15px;color:#1f2937;">${settingsMap.app_kepala_nama}</div>
      <div style="font-size:13px;color:#3b82f6;">${settingsMap.app_kepala_jabatan || 'Kepala BKAD'}</div>
      ${settingsMap.app_kepala_nip ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">NIP. ${settingsMap.app_kepala_nip}</div>` : ''}
    </div>
    ` : ''}
    <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center;">
      <div style="font-size:12px;color:#6b7280;line-height:1.6;">
        Untuk verifikasi dokumen service spesifik,<br/>scan QR Code yang tertera pada dokumen service tersebut.
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0f0f0;display:grid;gap:6px;text-align:left;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#6b7280;">Jenis Dokumen</span>
          <span style="font-weight:600;font-size:12px;color:#1f2937;">Laporan Resmi</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#6b7280;">Tanggal Verifikasi</span>
          <span style="font-weight:600;font-size:12px;color:#1f2937;">${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</span>
        </div>
      </div>
    </div>
    <div style="text-align:center;padding:12px;font-size:11px;color:#9ca3af;">
      © ${new Date().getFullYear()} ${appName} — ${instansi}
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('Error generating verification landing page:', error)
    return new NextResponse('<html><body><h1>Error</h1><p>Terjadi kesalahan server.</p></body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
