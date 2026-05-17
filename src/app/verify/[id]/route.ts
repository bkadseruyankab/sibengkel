import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// Generate verification page HTML (server-side rendered, no client JS needed)
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    const service = await db.service.findUnique({
      where: { id },
      include: {
        vehicle: true,
        bengkel: true,
        items: true,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!service || service.isDeleted) {
      return new NextResponse(getErrorHTML('Dokumen Tidak Ditemukan', 'Dokumen yang Anda cari tidak ditemukan atau sudah dihapus.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Get app settings
    const settings = await db.systemSetting.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach(s => {
      settingsMap[s.key] = s.value || ''
    })

    const STATUS_LABELS: Record<string, string> = {
      MENUNGGU_PENGAJUAN: 'Menunggu Pengajuan',
      DIAJUKAN: 'Diajukan',
      DISETUJUI: 'Disetujui',
      DITOLAK: 'Ditolak',
      DIPROSES: 'Diproses',
      MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan',
      PENDING: 'Pending',
      SELESAI: 'Selesai',
    }

    const JENIS_LABELS: Record<string, string> = {
      RUTIN: 'Service Rutin',
      PERBAIKAN: 'Perbaikan',
      DARURAT: 'Darurat',
    }

    const STATUS_COLORS: Record<string, string> = {
      MENUNGGU_PENGAJUAN: '#6b7280',
      DIAJUKAN: '#2563eb',
      DISETUJUI: '#16a34a',
      DITOLAK: '#dc2626',
      DIPROSES: '#d97706',
      MENUNGGU_PERSETUJUAN: '#7c3aed',
      PENDING: '#9333ea',
      SELESAI: '#059669',
    }

    const STATUS_BG: Record<string, string> = {
      MENUNGGU_PENGAJUAN: '#f3f4f6',
      DIAJUKAN: '#eff6ff',
      DISETUJUI: '#f0fdf4',
      DITOLAK: '#fef2f2',
      DIPROSES: '#fffbeb',
      MENUNGGU_PERSETUJUAN: '#f5f3ff',
      PENDING: '#faf5ff',
      SELESAI: '#ecfdf5',
    }

    const formatRupiah = (amount: number) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
    }

    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    const formatDateTime = (date: Date | string) => {
      return new Date(date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
    }

    const statusLabel = STATUS_LABELS[service.statusService] || service.statusService
    const statusColor = STATUS_COLORS[service.statusService] || '#6b7280'
    const statusBg = STATUS_BG[service.statusService] || '#f3f4f6'
    const isSelesai = service.statusService === 'SELESAI'
    const isDisetujui = service.statusService === 'DISETUJUI' || isSelesai

    const appName = settingsMap.app_name || 'SIService BKAD'
    const instansi = settingsMap.app_instansi || 'Badan Keuangan dan Aset Daerah'

    // Build items table rows
    const itemRows = service.items.map((item, idx) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;color:#6b7280;">${idx + 1}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-weight:500;">${item.itemName}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatRupiah(item.hargaSatuan)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${formatRupiah(item.totalHarga)}</td>
      </tr>
    `).join('')

    // Build history timeline
    const historyItems = service.history.map(h => `
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="width:10px;height:10px;border-radius:50%;background:${STATUS_COLORS[h.status] || '#6b7280'};margin-top:5px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:13px;color:#1f2937;">${STATUS_LABELS[h.status] || h.status}</div>
          <div style="font-size:12px;color:#6b7280;">${h.keterangan || '-'}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${formatDateTime(h.createdAt)}</div>
        </div>
      </div>
    `).join('')

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Dokumen - ${service.nomorService}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; min-height: 100vh; }
  </style>
</head>
<body>
  <div style="max-width:680px;margin:0 auto;padding:16px;">
    <!-- Header Card -->
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:16px;padding:28px 24px;color:white;text-align:center;margin-bottom:16px;box-shadow:0 4px 20px rgba(30,64,175,0.3);">
      <!-- Shield Icon -->
      <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </div>
      <div style="font-size:13px;opacity:0.85;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Verifikasi Dokumen</div>
      <div style="font-size:14px;opacity:0.9;margin-bottom:4px;">No. Dokumen</div>
      <div style="font-size:22px;font-weight:700;margin-bottom:4px;">${service.nomorService}</div>
      <div style="font-size:13px;opacity:0.8;">${instansi}</div>
      <!-- Status Badge -->
      <div style="display:inline-block;margin-top:14px;padding:6px 20px;background:rgba(255,255,255,0.2);border-radius:20px;font-weight:600;font-size:13px;backdrop-filter:blur(4px);">
        ● ${statusLabel}
      </div>
    </div>

    <!-- Valid Banner -->
    <div style="background:${isDisetujui ? '#f0fdf4' : '#fffbeb'};border:1px solid ${isDisetujui ? '#bbf7d0' : '#fde68a'};border-radius:12px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;border-radius:50%;background:${isDisetujui ? '#dcfce7' : '#fef3c7'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        ${isDisetujui ? 
          `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` :
          `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        }
      </div>
      <div>
        <div style="font-weight:700;font-size:15px;color:${isDisetujui ? '#16a34a' : '#d97706'};">${isDisetujui ? 'Dokumen Terverifikasi' : 'Dokumen Dalam Proses'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">${isDisetujui ? 'Dokumen ini telah diverifikasi dan sah secara resmi.' : 'Dokumen ini masih dalam proses verifikasi.'}</div>
      </div>
    </div>

    <!-- Info Service Card -->
    <div style="background:white;border-radius:12px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Informasi Service
      </div>
      <div style="display:grid;gap:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">No. Dokumen</span>
          <span style="font-weight:700;font-size:13px;color:#1e40af;">${service.nomorService}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Tanggal Service</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${formatDate(service.tanggalService)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Jenis Service</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${JENIS_LABELS[service.jenisService] || service.jenisService}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Prioritas</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${service.prioritas}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Kilometer</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${service.kilometerService.toLocaleString('id-ID')} km</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Estimasi Biaya</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${formatRupiah(service.estimasiBiaya)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
          <span style="color:#6b7280;font-size:13px;">Total Biaya</span>
          <span style="font-weight:700;font-size:14px;color:#1e40af;">${formatRupiah(service.totalBiaya)}</span>
        </div>
      </div>
      ${service.keterangan ? `
      <div style="margin-top:14px;padding:12px;background:#f8fafc;border-radius:8px;border-left:3px solid #3b82f6;">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Keterangan</div>
        <div style="font-size:13px;color:#374151;line-height:1.5;">${service.keterangan}</div>
      </div>
      ` : ''}
      <!-- Progress Bar -->
      <div style="margin-top:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:12px;color:#6b7280;">Progress</span>
          <span style="font-size:12px;font-weight:600;color:#1f2937;">${service.progress}%</span>
        </div>
        <div style="background:#e5e7eb;border-radius:10px;height:8px;overflow:hidden;">
          <div style="background:linear-gradient(90deg,#3b82f6,#1d4ed8);height:100%;border-radius:10px;width:${service.progress}%;transition:width 0.5s;"></div>
        </div>
      </div>
    </div>

    <!-- Vehicle Info Card -->
    <div style="background:white;border-radius:12px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        Informasi Kendaraan
      </div>
      <div style="display:grid;gap:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Nomor Polisi</span>
          <span style="font-weight:700;font-size:14px;color:#1e40af;background:#eff6ff;padding:3px 10px;border-radius:6px;">${service.vehicle.nomorPolisi}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Nama Pengguna</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${service.vehicle.namaPengguna}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">SKPD/Bidang</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${service.vehicle.skpdBidang}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Merk / Type</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${service.vehicle.merk} ${service.vehicle.type}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Jenis</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${service.vehicle.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
          <span style="color:#6b7280;font-size:13px;">Tahun</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${service.vehicle.tahun}</span>
        </div>
      </div>
    </div>

    <!-- Bengkel Info Card -->
    <div style="background:white;border-radius:12px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Bengkel
      </div>
      <div style="display:grid;gap:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Nama Bengkel</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${service.bengkel.namaBengkel}</span>
        </div>
        ${service.bengkel.alamat ? `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
          <span style="color:#6b7280;font-size:13px;">Alamat</span>
          <span style="font-weight:500;font-size:13px;color:#1f2937;text-align:right;max-width:60%;">${service.bengkel.alamat}</span>
        </div>
        ` : ''}
        ${service.bengkel.noTelepon ? `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
          <span style="color:#6b7280;font-size:13px;">Telepon</span>
          <span style="font-weight:600;font-size:13px;color:#1f2937;">${service.bengkel.noTelepon}</span>
        </div>
        ` : ''}
      </div>
    </div>

    ${service.items.length > 0 ? `
    <!-- Items Table Card -->
    <div style="background:white;border-radius:12px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Item Perbaikan
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 14px;text-align:center;border-bottom:2px solid #e2e8f0;color:#64748b;font-weight:600;width:40px;">No</th>
              <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e2e8f0;color:#64748b;font-weight:600;">Nama Item</th>
              <th style="padding:10px 14px;text-align:center;border-bottom:2px solid #e2e8f0;color:#64748b;font-weight:600;width:50px;">Qty</th>
              <th style="padding:10px 14px;text-align:right;border-bottom:2px solid #e2e8f0;color:#64748b;font-weight:600;">Harga</th>
              <th style="padding:10px 14px;text-align:right;border-bottom:2px solid #e2e8f0;color:#64748b;font-weight:600;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc;">
              <td colspan="4" style="padding:12px 14px;font-weight:700;text-align:right;color:#1e293b;">Total Biaya</td>
              <td style="padding:12px 14px;text-align:right;font-weight:700;color:#1e40af;font-size:14px;">${formatRupiah(service.totalBiaya)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    ` : ''}

    ${service.history.length > 0 ? `
    <!-- History Card -->
    <div style="background:white;border-radius:12px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Riwayat Status
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${historyItems}
      </div>
    </div>
    ` : ''}

    <!-- Verification Footer -->
    <div style="background:white;border-radius:12px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center;">
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span style="font-size:13px;font-weight:600;color:#16a34a;">Dokumen Dilindungi</span>
      </div>
      <div style="font-size:12px;color:#6b7280;line-height:1.6;">
        Dokumen ini diterbitkan oleh <strong>${instansi}</strong><br/>
        melalui sistem ${appName}.
      </div>
      <!-- Document Numbers -->
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid #f0f0f0;display:grid;gap:8px;text-align:left;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#6b7280;">No. Dokumen</span>
          <span style="font-weight:700;font-size:12px;color:#1e40af;">${service.nomorService}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#6b7280;">Tanggal Dibuat</span>
          <span style="font-weight:600;font-size:12px;color:#1f2937;">${formatDateTime(service.createdAt)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#6b7280;">Terakhir Diperbarui</span>
          <span style="font-weight:600;font-size:12px;color:#1f2937;">${formatDateTime(service.updatedAt)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#6b7280;">Tanggal Verifikasi</span>
          <span style="font-weight:600;font-size:12px;color:#1f2937;">${formatDateTime(new Date())}</span>
        </div>
      </div>
      ${settingsMap.app_kepala_nama ? `
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid #f0f0f0;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">Ditandatangani oleh:</div>
        <div style="font-weight:700;font-size:14px;color:#1f2937;">${settingsMap.app_kepala_nama}</div>
        <div style="font-size:12px;color:#3b82f6;">${settingsMap.app_kepala_jabatan || 'Kepala BKAD'}</div>
        ${settingsMap.app_kepala_nip ? `<div style="font-size:11px;color:#6b7280;">NIP. ${settingsMap.app_kepala_nip}</div>` : ''}
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
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
    console.error('Error generating verification page:', error)
    return new NextResponse(getErrorHTML('Kesalahan Server', 'Terjadi kesalahan saat memverifikasi dokumen. Silakan coba lagi nanti.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

function getErrorHTML(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div style="text-align:center;padding:32px;">
    <div style="width:72px;height:72px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    </div>
    <div style="font-size:20px;font-weight:700;color:#1f2937;margin-bottom:8px;">${title}</div>
    <div style="font-size:14px;color:#6b7280;max-width:400px;margin:0 auto;">${message}</div>
  </div>
</body>
</html>`
}
