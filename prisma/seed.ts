import { db } from '../src/lib/db'

async function seed() {
  console.log('Seeding database...')

  // Create workshops
  const bengkel1 = await db.workshop.create({
    data: { namaBengkel: 'Bengkel Jaya Motor', alamat: 'Jl. Raya No. 10', noTelepon: '081234567890', picBengkel: 'Pak Budi', statusAktif: true },
  })
  const bengkel2 = await db.workshop.create({
    data: { namaBengkel: 'Auto Service Center', alamat: 'Jl. Merdeka No. 25', noTelepon: '082345678901', picBengkel: 'Pak Agus', statusAktif: true },
  })
  const bengkel3 = await db.workshop.create({
    data: { namaBengkel: 'Bengkel Sejahtera', alamat: 'Jl. Sudirman No. 50', noTelepon: '083456789012', picBengkel: 'Pak Dedi', statusAktif: true },
  })

  // Create vehicles
  const v1 = await db.vehicle.create({
    data: { nomorPolisi: 'D 1234 AB', namaPengguna: 'Ahmad Fauzi', skpdBidang: 'Bidang Keuangan', jenisKendaraan: 'RODA_4', merk: 'Toyota', type: 'Avanza', tahun: 2020, nomorRangka: 'NR123456', nomorMesin: 'NM123456', warna: 'Hitam', statusKendaraan: 'AKTIF', kondisiKendaraan: 'BAIK', kilometerTerakhir: 45000 },
  })
  const v2 = await db.vehicle.create({
    data: { nomorPolisi: 'D 5678 CD', namaPengguna: 'Siti Rahayu', skpdBidang: 'Bidang Aset', jenisKendaraan: 'RODA_4', merk: 'Honda', type: 'Brio', tahun: 2021, nomorRangka: 'NR234567', nomorMesin: 'NM234567', warna: 'Putih', statusKendaraan: 'AKTIF', kondisiKendaraan: 'BAIK', kilometerTerakhir: 32000 },
  })
  const v3 = await db.vehicle.create({
    data: { nomorPolisi: 'D 9012 EF', namaPengguna: 'Budi Santoso', skpdBidang: 'Sekretariat', jenisKendaraan: 'RODA_4', merk: 'Mitsubishi', type: 'Xpander', tahun: 2019, nomorRangka: 'NR345678', nomorMesin: 'NM345678', warna: 'Silver', statusKendaraan: 'AKTIF', kondisiKendaraan: 'KURANG_BAIK', kilometerTerakhir: 68000 },
  })
  const v4 = await db.vehicle.create({
    data: { nomorPolisi: 'D 3456 GH', namaPengguna: 'Dewi Lestari', skpdBidang: 'Bidang Keuangan', jenisKendaraan: 'RODA_2', merk: 'Honda', type: 'Beat', tahun: 2022, nomorRangka: 'NR456789', nomorMesin: 'NM456789', warna: 'Merah', statusKendaraan: 'AKTIF', kondisiKendaraan: 'BAIK', kilometerTerakhir: 15000 },
  })
  const v5 = await db.vehicle.create({
    data: { nomorPolisi: 'D 7890 IJ', namaPengguna: 'Rudi Hartono', skpdBidang: 'Bidang Pendapatan', jenisKendaraan: 'RODA_4', merk: 'Suzuki', type: 'Ertiga', tahun: 2018, nomorRangka: 'NR567890', nomorMesin: 'NM567890', warna: 'Biru', statusKendaraan: 'AKTIF', kondisiKendaraan: 'BAIK', kilometerTerakhir: 85000 },
  })

  // Create spare parts
  const sp1 = await db.sparePart.create({ data: { namaSukuCadang: 'Oli Mesin 10W-40', qty: 50, hargaSatuan: 75000, supplier: 'PT Lubrikasi', stok: 50, isActive: true } })
  const sp2 = await db.sparePart.create({ data: { namaSukuCadang: 'Filter Oli', qty: 30, hargaSatuan: 35000, supplier: 'PT Filter Indo', stok: 30, isActive: true } })
  const sp3 = await db.sparePart.create({ data: { namaSukuCadang: 'Kampas Rem Depan', qty: 20, hargaSatuan: 120000, supplier: 'PT Brake Indo', stok: 20, isActive: true } })
  const sp4 = await db.sparePart.create({ data: { namaSukuCadang: 'Busi Iridium', qty: 40, hargaSatuan: 65000, supplier: 'PT Spark Indo', stok: 40, isActive: true } })
  const sp5 = await db.sparePart.create({ data: { namaSukuCadang: 'V-Belt', qty: 15, hargaSatuan: 85000, supplier: 'PT Belt Indo', stok: 15, isActive: true } })
  const sp6 = await db.sparePart.create({ data: { namaSukuCadang: 'Air Radiator Coolant', qty: 25, hargaSatuan: 45000, supplier: 'PT Coolant Indo', stok: 25, isActive: true } })
  const sp7 = await db.sparePart.create({ data: { namaSukuCadang: 'Ban Bridgestone 185/65R15', qty: 8, hargaSatuan: 550000, supplier: 'PT Tire Indo', stok: 8, isActive: true } })

  // Create services with various dates and statuses
  const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const statuses = ['SELESAI', 'SELESAI', 'SELESAI', 'DIPROSES', 'DIAJUKAN', 'DISETUJUI', 'SELESAI', 'PENDING']
  const jenisServices = ['RUTIN', 'PERBAIKAN', 'DARURAT']

  const services: any[] = []

  for (let m = 0; m < 12; m++) {
    const date = new Date(2025, m, 10 + Math.floor(Math.random() * 10))
    const vehicleIdx = m % 5
    const bengkelIdx = m % 3
    const status = m < 8 ? 'SELESAI' : statuses[m % statuses.length]
    const jenis = jenisServices[m % 3]
    const vehicle = [v1, v2, v3, v4, v5][vehicleIdx]
    const bengkel = [bengkel1, bengkel2, bengkel3][bengkelIdx]

    const totalBiaya = (m + 1) * 350000 + Math.floor(Math.random() * 500000)

    const service = await db.service.create({
      data: {
        nomorService: `SRV/2025/${String(m + 1).padStart(4, '0')}`,
        tanggalService: date,
        vehicleId: vehicle.id,
        bengkelId: bengkel.id,
        jenisService: jenis,
        keterangan: `Service ${jenis.toLowerCase()} bulan ${m + 1}`,
        kilometerService: vehicle.kilometerTerakhir + m * 1000,
        estimasiBiaya: totalBiaya * 0.9,
        totalBiaya: status === 'SELESAI' ? totalBiaya : 0,
        statusService: status,
        prioritas: m % 5 === 0 ? 'TINGGI' : 'NORMAL',
        progress: status === 'SELESAI' ? 100 : status === 'DIPROSES' ? 60 : 0,
        tanggalSelesai: status === 'SELESAI' ? new Date(2025, m, 15 + Math.floor(Math.random() * 5)) : null,
        isDeleted: false,
      },
    })

    // Create service items
    const items = [
      { itemName: 'Ganti Oli Mesin', quantity: 1, hargaSatuan: 75000, totalHarga: 75000 },
      { itemName: 'Ganti Filter Oli', quantity: 1, hargaSatuan: 35000, totalHarga: 35000 },
    ]
    if (m % 3 === 0) {
      items.push({ itemName: 'Ganti Kampas Rem', quantity: 2, hargaSatuan: 120000, totalHarga: 240000 })
    }
    if (m % 4 === 0) {
      items.push({ itemName: 'Tune Up Mesin', quantity: 1, hargaSatuan: 250000, totalHarga: 250000 })
    }
    if (m % 2 === 0) {
      items.push({ itemName: 'Cek & Top Up Air Radiator', quantity: 1, hargaSatuan: 45000, totalHarga: 45000 })
    }

    for (const item of items) {
      await db.serviceItem.create({
        data: { serviceId: service.id, ...item },
      })
    }

    // Create spare part usages
    await db.serviceSparePart.create({ data: { serviceId: service.id, sparePartId: sp1.id, qty: 1, hargaSatuan: 75000, totalHarga: 75000 } })
    await db.serviceSparePart.create({ data: { serviceId: service.id, sparePartId: sp2.id, qty: 1, hargaSatuan: 35000, totalHarga: 35000 } })
    if (m % 3 === 0) {
      await db.serviceSparePart.create({ data: { serviceId: service.id, sparePartId: sp3.id, qty: 2, hargaSatuan: 120000, totalHarga: 240000 } })
    }

    // Create service history entries
    if (status === 'SELESAI') {
      await db.serviceHistory.createMany({
        data: [
          { serviceId: service.id, vehicleId: vehicle.id, status: 'DIAJUKAN', keterangan: 'Service diajukan', createdAt: new Date(2025, m, 5) },
          { serviceId: service.id, vehicleId: vehicle.id, status: 'DISETUJUI', keterangan: 'Service disetujui admin', createdAt: new Date(2025, m, 6) },
          { serviceId: service.id, vehicleId: vehicle.id, status: 'DIPROSES', keterangan: 'Service sedang dikerjakan', createdAt: new Date(2025, m, 8) },
          { serviceId: service.id, vehicleId: vehicle.id, status: 'SELESAI', keterangan: 'Service selesai dikerjakan', createdAt: new Date(2025, m, 12) },
        ],
      })
    } else {
      await db.serviceHistory.createMany({
        data: [
          { serviceId: service.id, vehicleId: vehicle.id, status: 'DIAJUKAN', keterangan: 'Service diajukan', createdAt: new Date(2025, m, 5) },
        ],
      })
    }

    services.push(service)
  }

  // Create budgets
  for (const vehicle of [v1, v2, v3, v4, v5]) {
    const totalAnggaran = vehicle.jenisKendaraan === 'RODA_4' ? 15000000 : 5000000
    const realisasi = Math.floor(totalAnggaran * (0.3 + Math.random() * 0.5))
    await db.budget.create({
      data: {
        tahun: 2025,
        vehicleId: vehicle.id,
        totalAnggaran,
        realisasi,
        sisaAnggaran: totalAnggaran - realisasi,
        statusAnggaran: totalAnggaran - realisasi < totalAnggaran * 0.2 ? 'HABIS' : 'AKTIF',
      },
    })
  }

  // Create users
  const user1 = await db.user.create({
    data: { email: 'admin@bkad.go.id', name: 'Super Admin', password: 'hashed_password', role: 'SUPER_ADMIN', isActive: true },
  })
  const user2 = await db.user.create({
    data: { email: 'bengkel@jaya.com', name: 'Pak Budi Bengkel', password: 'hashed_password', role: 'BENGKEL', isActive: true, bengkelId: bengkel1.id },
  })
  const user3 = await db.user.create({
    data: { email: 'pimpinan@bkad.go.id', name: 'Kepala BKAD', password: 'hashed_password', role: 'PIMPINAN', isActive: true },
  })
  const user4 = await db.user.create({
    data: { email: 'staff@bkad.go.id', name: 'Staff Admin', password: 'hashed_password', role: 'ADMIN', isActive: true },
  })

  // Create notifications
  const notifTypes = ['INFO', 'WARNING', 'ERROR', 'SUCCESS'] as const
  const notifMessages = [
    { title: 'Service Baru Diajukan', message: 'Kendaraan D 1234 AB mengajukan service rutin', type: 'INFO' },
    { title: 'Anggaran Mendekati Batas', message: 'Sisa anggaran kendaraan D 9012 EF tinggal 15%', type: 'WARNING' },
    { title: 'Service Selesai', message: 'Service kendaraan D 5678 CD telah selesai dikerjakan', type: 'SUCCESS' },
    { title: 'Service Ditolak', message: 'Permohonan service kendaraan D 3456 GH ditolak karena alasan administrasi', type: 'ERROR' },
    { title: 'Bengkel Baru Terdaftar', message: 'Bengkel Sejahtera telah mendaftar sebagai mitra baru', type: 'INFO' },
    { title: 'Stok Suku Cadang Rendah', message: 'Stok Kampas Rem Depan tersisa 5 unit', type: 'WARNING' },
    { title: 'Service Disetujui', message: 'Service SRV/2025/0009 telah disetujui oleh admin', type: 'SUCCESS' },
    { title: 'Kendaraan Melewati Batas KM', message: 'Kendaraan D 7890 IJ telah melewati 80.000 km', type: 'WARNING' },
    { title: 'Backup Database Berhasil', message: 'Backup database otomatis berhasil dilakukan', type: 'SUCCESS' },
    { title: 'Perubahan Anggaran', message: 'Anggaran kendaraan D 1234 AB telah diperbarui', type: 'INFO' },
    { title: 'Service Terlambat', message: 'Service kendaraan D 9012 EF melewati estimasi waktu', type: 'ERROR' },
    { title: 'User Baru Terdaftar', message: 'Staff Admin telah terdaftar di sistem', type: 'INFO' },
  ]

  for (let i = 0; i < notifMessages.length; i++) {
    const n = notifMessages[i]
    await db.notification.create({
      data: {
        userId: user1.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: i < 3,
        createdAt: new Date(Date.now() - (notifMessages.length - i) * 3600000 * 2),
      },
    })
  }

  // Create audit logs
  const auditActions = [
    { action: 'CREATE', entity: 'Vehicle', details: 'Menambahkan kendaraan D 1234 AB' },
    { action: 'UPDATE', entity: 'Service', details: 'Mengubah status service menjadi DIPROSES' },
    { action: 'CREATE', entity: 'Service', details: 'Membuat permohonan service baru' },
    { action: 'UPDATE', entity: 'Budget', details: 'Memperbarui anggaran kendaraan' },
    { action: 'DELETE', entity: 'SparePart', details: 'Menghapus suku cadang dari sistem' },
    { action: 'LOGIN', entity: 'User', details: 'User login ke sistem' },
    { action: 'UPDATE', entity: 'Service', details: 'Menyetujui service SRV/2025/0001' },
    { action: 'CREATE', entity: 'Workshop', details: 'Menambahkan bengkel mitra baru' },
    { action: 'UPDATE', entity: 'SystemSetting', details: 'Mengubah pengaturan sistem' },
    { action: 'EXPORT', entity: 'Report', details: 'Mengekspor laporan tahunan 2025' },
  ]

  for (let i = 0; i < auditActions.length; i++) {
    const a = auditActions[i]
    await db.auditLog.create({
      data: {
        userId: user1.id,
        action: a.action,
        entity: a.entity,
        details: a.details,
        createdAt: new Date(Date.now() - (auditActions.length - i) * 3600000 * 5),
      },
    })
  }

  // Create system settings
  const settings = [
    { key: 'nama_instansi', value: 'Badan Keuangan dan Aset Daerah' },
    { key: 'tahun_aktif', value: '2025' },
    { key: 'nomor_surat_otomatis', value: 'true' },
    { key: 'format_nomor_surat', value: 'SRV/{tahun}/{nomor}' },
    { key: 'smtp_host', value: '' },
    { key: 'smtp_port', value: '587' },
    { key: 'smtp_username', value: '' },
    { key: 'smtp_password', value: '' },
    { key: 'smtp_from_email', value: '' },
    { key: 'whatsapp_api_key', value: '' },
    { key: 'whatsapp_api_url', value: '' },
    { key: 'notif_service_diajukan', value: 'true' },
    { key: 'notif_service_disetujui', value: 'true' },
    { key: 'notif_service_ditolak', value: 'true' },
    { key: 'notif_service_selesai', value: 'true' },
    { key: 'notif_anggaran_warning', value: 'true' },
    { key: 'last_backup_date', value: '' },
  ]

  for (const s of settings) {
    await db.systemSetting.create({ data: s })
  }

  console.log('Database seeded successfully!')
  console.log(`- ${3} workshops`)
  console.log(`- ${5} vehicles`)
  console.log(`- ${7} spare parts`)
  console.log(`- ${12} services`)
  console.log(`- ${4} users`)
  console.log(`- ${12} notifications`)
  console.log(`- ${10} audit logs`)
  console.log(`- ${settings.length} system settings`)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
