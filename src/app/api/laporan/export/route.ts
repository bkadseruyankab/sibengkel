import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { format, filters } = body

    // Fetch data with same filters as GET
    const where: any = { isDeleted: false }
    const { type, year, month, dateFrom, dateTo, vehicleId, bengkelId, jenisKendaraan, statusService, jenisService, skpdBidang } = filters || {}

    const yearNum = parseInt(year || new Date().getFullYear().toString())
    if (type === 'tahunan') {
      where.tanggalService = { gte: new Date(yearNum, 0, 1), lte: new Date(yearNum, 11, 31) }
    } else if (type === 'bulanan' && month) {
      const m = parseInt(month) - 1
      where.tanggalService = { gte: new Date(yearNum, m, 1), lte: new Date(yearNum, m + 1, 0) }
    } else if (type === 'triwulan') {
      const triwulan = parseInt(filters?.triwulan || '1')
      const startMonth = (triwulan - 1) * 3
      where.tanggalService = { gte: new Date(yearNum, startMonth, 1), lte: new Date(yearNum, startMonth + 3, 0) }
    } else if (type === 'semester') {
      const semester = parseInt(filters?.semester || '1')
      const startMonth = (semester - 1) * 6
      where.tanggalService = { gte: new Date(yearNum, startMonth, 1), lte: new Date(yearNum, startMonth + 6, 0) }
    } else if (type === 'custom' && dateFrom && dateTo) {
      where.tanggalService = { gte: new Date(dateFrom), lte: new Date(dateTo) }
    }

    if (vehicleId) where.vehicleId = vehicleId
    if (bengkelId) where.bengkelId = bengkelId
    if (statusService) where.statusService = statusService
    if (jenisService) where.jenisService = jenisService
    if (jenisKendaraan) where.vehicle = { jenisKendaraan }
    if (skpdBidang) where.vehicle = { ...(where.vehicle || {}), skpdBidang: { contains: skpdBidang } }

    const services = await db.service.findMany({
      where,
      include: { vehicle: true, bengkel: true, items: { include: { photos: true } } },
      orderBy: { tanggalService: 'desc' },
    })

    // Budget data for Roda 2 / Roda 4 breakdown
    const budgets = await db.budget.findMany({
      where: { tahun: yearNum },
      include: { vehicle: true },
    })
    const budgetByType = {
      RODA_2: {
        totalAnggaran: budgets.filter(b => b.jenisKendaraan === 'RODA_2').reduce((sum, b) => sum + b.totalAnggaran, 0),
        realisasi: budgets.filter(b => b.jenisKendaraan === 'RODA_2').reduce((sum, b) => sum + b.realisasi, 0),
        vehicleCount: budgets.filter(b => b.jenisKendaraan === 'RODA_2').length,
      },
      RODA_4: {
        totalAnggaran: budgets.filter(b => b.jenisKendaraan === 'RODA_4').reduce((sum, b) => sum + b.totalAnggaran, 0),
        realisasi: budgets.filter(b => b.jenisKendaraan === 'RODA_4').reduce((sum, b) => sum + b.realisasi, 0),
        vehicleCount: budgets.filter(b => b.jenisKendaraan === 'RODA_4').length,
      },
    }
    budgetByType.RODA_2.sisaAnggaran = budgetByType.RODA_2.totalAnggaran - budgetByType.RODA_2.realisasi
    budgetByType.RODA_4.sisaAnggaran = budgetByType.RODA_4.totalAnggaran - budgetByType.RODA_4.realisasi
    const totalAnggaran = budgets.reduce((sum, b) => sum + b.totalAnggaran, 0)
    const totalRealisasi = budgets.reduce((sum, b) => sum + b.realisasi, 0)

    if (format === 'excel' || format === 'csv') {
      // Generate CSV with Jenis Kendaraan column
      const headers = ['No', 'Nomor Service', 'Tanggal', 'Nomor Polisi', 'Merk/Type', 'Jenis Kendaraan', 'SKPD/Bidang', 'Jenis Service', 'Bengkel', 'Kilometer', 'Estimasi Biaya', 'Total Biaya', 'Status']
      const rows = services.map((s, i) => [
        i + 1,
        s.nomorService,
        new Date(s.tanggalService).toLocaleDateString('id-ID'),
        s.vehicle.nomorPolisi,
        `${s.vehicle.merk} ${s.vehicle.type}`,
        s.vehicle.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4',
        s.vehicle.skpdBidang || '-',
        s.jenisService,
        s.bengkel.namaBengkel,
        s.kilometerService,
        s.estimasiBiaya,
        s.totalBiaya,
        s.statusService,
      ])

      // Add budget summary rows
      rows.push([])
      rows.push(['RINGKASAN ANGGARAN'])
      rows.push(['', 'Jenis', 'Anggaran', 'Realisasi', 'Sisa', 'Persentase'])
      rows.push([
        '', 'Roda 4',
        budgetByType.RODA_4.totalAnggaran.toLocaleString('id-ID'),
        budgetByType.RODA_4.realisasi.toLocaleString('id-ID'),
        budgetByType.RODA_4.sisaAnggaran.toLocaleString('id-ID'),
        budgetByType.RODA_4.totalAnggaran > 0 ? `${((budgetByType.RODA_4.realisasi / budgetByType.RODA_4.totalAnggaran) * 100).toFixed(1)}%` : '0%',
      ])
      rows.push([
        '', 'Roda 2',
        budgetByType.RODA_2.totalAnggaran.toLocaleString('id-ID'),
        budgetByType.RODA_2.realisasi.toLocaleString('id-ID'),
        budgetByType.RODA_2.sisaAnggaran.toLocaleString('id-ID'),
        budgetByType.RODA_2.totalAnggaran > 0 ? `${((budgetByType.RODA_2.realisasi / budgetByType.RODA_2.totalAnggaran) * 100).toFixed(1)}%` : '0%',
      ])
      rows.push([
        '', 'Total',
        totalAnggaran.toLocaleString('id-ID'),
        totalRealisasi.toLocaleString('id-ID'),
        (totalAnggaran - totalRealisasi).toLocaleString('id-ID'),
        totalAnggaran > 0 ? `${((totalRealisasi / totalAnggaran) * 100).toFixed(1)}%` : '0%',
      ])

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const BOM = '\uFEFF'
      const buffer = Buffer.from(BOM + csvContent, 'utf-8')

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=laporan-service-${year || 'all'}.csv`,
        },
      })
    }

    if (format === 'pdf') {
      // Generate HTML for PDF with improved kop surat
      const totalBiaya = services.reduce((sum, s) => sum + s.totalBiaya, 0)
      const completedCount = services.filter(s => s.statusService === 'SELESAI').length
      const activeCount = services.filter(s => s.statusService !== 'SELESAI' && s.statusService !== 'DITOLAK').length

      const formatRp = (val: number) => `Rp ${val.toLocaleString('id-ID')}`
      const persenRoda4 = budgetByType.RODA_4.totalAnggaran > 0 ? ((budgetByType.RODA_4.realisasi / budgetByType.RODA_4.totalAnggaran) * 100).toFixed(1) : '0.0'
      const persenRoda2 = budgetByType.RODA_2.totalAnggaran > 0 ? ((budgetByType.RODA_2.realisasi / budgetByType.RODA_2.totalAnggaran) * 100).toFixed(1) : '0.0'
      const persenTotal = totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : '0.0'

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Laporan Service Kendaraan</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11px; margin: 0; color: #222; line-height: 1.4; }
  
  /* KOP SURAT */
  .kop-surat { text-align: center; border-bottom: 3px solid #222; padding-bottom: 10px; margin-bottom: 20px; }
  .kop-surat .logo-area { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 5px; }
  .kop-surat .logo-placeholder { width: 65px; height: 65px; border: 2px solid #222; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; }
  .kop-surat h1 { font-size: 15px; font-weight: bold; margin: 0; letter-spacing: 1px; }
  .kop-surat h2 { font-size: 13px; font-weight: bold; margin: 2px 0 0; letter-spacing: 0.5px; }
  .kop-surat .alamat { font-size: 9px; margin: 3px 0 0; color: #444; }
  .kop-surat .line { border-top: 1px solid #222; margin-top: 8px; }
  .kop-surat .line-thick { border-top: 3px solid #222; margin-top: 2px; }
  
  /* Document Info */
  .doc-info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 10px; }
  .doc-info .doc-number { font-weight: bold; }
  
  /* Summary */
  .summary { margin: 0 0 15px; }
  .summary-title { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; }
  .summary-item { padding: 6px 8px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 3px; }
  .summary-item .label { font-size: 8px; color: #666; text-transform: uppercase; }
  .summary-item .value { font-size: 12px; font-weight: bold; }
  
  /* Budget Section */
  .budget-section { margin: 15px 0; page-break-inside: avoid; }
  .budget-title { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
  .budget-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .budget-card { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
  .budget-card-header { padding: 6px 10px; font-weight: bold; font-size: 10px; color: white; }
  .budget-card-header.roda4 { background: #d97706; }
  .budget-card-header.roda2 { background: #059669; }
  .budget-card-body { padding: 8px 10px; }
  .budget-row { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; }
  .budget-row.total { border-top: 1px solid #ddd; margin-top: 4px; padding-top: 4px; font-weight: bold; }
  .budget-bar { height: 6px; background: #eee; border-radius: 3px; margin-top: 6px; }
  .budget-bar-fill { height: 6px; border-radius: 3px; }
  
  /* Table */
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9px; }
  th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; }
  th { background: #f0f0f0; font-weight: bold; font-size: 8px; text-transform: uppercase; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  
  /* Footer */
  .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
  .qr-area { text-align: center; }
  .qr-placeholder { width: 70px; height: 70px; border: 1px solid #999; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #999; margin: 0 auto 3px; }
  .signature-area { text-align: center; }
  .signature-line { width: 180px; border-bottom: 1px solid #222; margin: 55px auto 3px; }
  .signature-name { font-size: 10px; font-weight: bold; }
  .signature-title { font-size: 9px; }
  .print-info { font-size: 8px; color: #999; margin-top: 5px; text-align: center; }
  
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <!-- KOP SURAT -->
  <div class="kop-surat">
    <div class="logo-area">
      <div class="logo-placeholder">LOGO</div>
      <div>
        <h1>PEMERINTAH KABUPATEN/KOTA</h1>
        <h2>BADAN KEUANGAN DAN ASET DAERAH</h2>
        <div class="alamat">Jl. Pemerintahan No. 1 | Telp. (021) 123-4567 | Fax. (021) 123-4568</div>
      </div>
    </div>
    <div class="line"></div>
    <div class="line-thick"></div>
  </div>

  <!-- Document Info -->
  <div class="doc-info">
    <div>
      <strong>LAPORAN SERVICE KENDARAAN OPERASIONAL</strong><br>
      Periode: ${type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Tahunan'} ${year || new Date().getFullYear()}
    </div>
    <div style="text-align: right;">
      No: LAP/SVC/${year || new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}<br>
      Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
  </div>

  <!-- Summary -->
  <div class="summary">
    <div class="summary-title">Ringkasan</div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">Total Service</div>
        <div class="value">${services.length}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Biaya</div>
        <div class="value">${formatRp(totalBiaya)}</div>
      </div>
      <div class="summary-item">
        <div class="label">Service Selesai</div>
        <div class="value">${completedCount}</div>
      </div>
      <div class="summary-item">
        <div class="label">Service Aktif</div>
        <div class="value">${activeCount}</div>
      </div>
    </div>
  </div>

  <!-- Budget Section -->
  <div class="budget-section">
    <div class="budget-title">Ringkasan Anggaran Tahun ${year || new Date().getFullYear()}</div>
    <div class="budget-grid">
      <div class="budget-card">
        <div class="budget-card-header roda4">KENDARAAN RODA 4 (${budgetByType.RODA_4.vehicleCount} unit)</div>
        <div class="budget-card-body">
          <div class="budget-row"><span>Anggaran</span><span>${formatRp(budgetByType.RODA_4.totalAnggaran)}</span></div>
          <div class="budget-row"><span>Realisasi</span><span>${formatRp(budgetByType.RODA_4.realisasi)}</span></div>
          <div class="budget-row"><span>Sisa</span><span>${formatRp(budgetByType.RODA_4.sisaAnggaran)}</span></div>
          <div class="budget-row total"><span>Penggunaan</span><span>${persenRoda4}%</span></div>
          <div class="budget-bar"><div class="budget-bar-fill" style="width:${Math.min(parseFloat(persenRoda4), 100)}%; background:${parseFloat(persenRoda4) >= 90 ? '#ef4444' : '#d97706'};"></div></div>
        </div>
      </div>
      <div class="budget-card">
        <div class="budget-card-header roda2">KENDARAAN RODA 2 (${budgetByType.RODA_2.vehicleCount} unit)</div>
        <div class="budget-card-body">
          <div class="budget-row"><span>Anggaran</span><span>${formatRp(budgetByType.RODA_2.totalAnggaran)}</span></div>
          <div class="budget-row"><span>Realisasi</span><span>${formatRp(budgetByType.RODA_2.realisasi)}</span></div>
          <div class="budget-row"><span>Sisa</span><span>${formatRp(budgetByType.RODA_2.sisaAnggaran)}</span></div>
          <div class="budget-row total"><span>Penggunaan</span><span>${persenRoda2}%</span></div>
          <div class="budget-bar"><div class="budget-bar-fill" style="width:${Math.min(parseFloat(persenRoda2), 100)}%; background:${parseFloat(persenRoda2) >= 90 ? '#ef4444' : '#059669'};"></div></div>
        </div>
      </div>
    </div>
    <div style="margin-top: 8px; padding: 6px 10px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 3px; font-size: 10px;">
      <div style="display: flex; justify-content: space-between;">
        <span><strong>Total Anggaran:</strong> ${formatRp(totalAnggaran)}</span>
        <span><strong>Total Realisasi:</strong> ${formatRp(totalRealisasi)}</span>
        <span><strong>Sisa:</strong> ${formatRp(totalAnggaran - totalRealisasi)}</span>
        <span><strong>Penggunaan:</strong> ${persenTotal}%</span>
      </div>
    </div>
  </div>

  <!-- Data Table -->
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 25px;">No</th>
        <th>Nomor Service</th>
        <th>Tanggal</th>
        <th>Nomor Polisi</th>
        <th>Kendaraan</th>
        <th>Jenis</th>
        <th>Jenis Kendaraan</th>
        <th>SKPD/Bidang</th>
        <th>Bengkel</th>
        <th class="text-right">Biaya</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${services.map((s, i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${s.nomorService}</td>
        <td>${new Date(s.tanggalService).toLocaleDateString('id-ID')}</td>
        <td>${s.vehicle.nomorPolisi}</td>
        <td>${s.vehicle.merk} ${s.vehicle.type}</td>
        <td>${s.jenisService}</td>
        <td>${s.vehicle.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}</td>
        <td>${s.vehicle.skpdBidang || '-'}</td>
        <td>${s.bengkel.namaBengkel}</td>
        <td class="text-right">Rp ${s.totalBiaya.toLocaleString('id-ID')}</td>
        <td>${s.statusService}</td>
      </tr>
      `).join('')}
      ${services.length === 0 ? '<tr><td colspan="11" class="text-center" style="padding: 20px;">Tidak ada data service</td></tr>' : ''}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div class="qr-area">
      <div class="qr-placeholder">QR CODE</div>
      <div style="font-size: 7px; color: #999;">Dokumen ini divalidasi<br>secara digital</div>
    </div>
    <div class="signature-area">
      <div style="font-size: 9px; margin-bottom: 3px;">${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div class="signature-line"></div>
      <div class="signature-name">Kepala BKAD</div>
      <div class="signature-title">NIP. ........................</div>
    </div>
  </div>
  
  <div class="print-info">
    Dicetak pada: ${new Date().toLocaleString('id-ID')} | Halaman 1 dari 1 | Dokumen ini sah dan diterbitkan oleh sistem SIService BKAD
  </div>
</body>
</html>`

      const buffer = Buffer.from(html, 'utf-8')
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename=laporan-service-${year || 'all'}.html`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error exporting report:', error)
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 })
  }
}
