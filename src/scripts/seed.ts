import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Mulai seeding database...')

  // Clean existing data
  await prisma.serviceSparePart.deleteMany()
  await prisma.serviceDocument.deleteMany()
  await prisma.serviceItem.deleteMany()
  await prisma.serviceHistory.deleteMany()
  await prisma.budgetHistory.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.sparePart.deleteMany()
  await prisma.budget.deleteMany()
  await prisma.vehicleDocument.deleteMany()
  await prisma.service.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.user.deleteMany()
  await prisma.workshop.deleteMany()
  await prisma.systemSetting.deleteMany()

  console.log('🗑️  Data lama dihapus')

  // ==================== WORKSHOPS ====================
  const workshop1 = await prisma.workshop.create({
    data: {
      namaBengkel: 'Bengkel Motor Jaya Makmur',
      alamat: 'Jl. Raya Darmo No. 45, Surabaya',
      noTelepon: '031-5678901',
      picBengkel: 'Hadi Sutrisno',
      email: 'info@jaya-makmur.co.id',
      statusAktif: true,
      canAddService: false,
    },
  })

  const workshop2 = await prisma.workshop.create({
    data: {
      namaBengkel: 'Auto Service Nusantara',
      alamat: 'Jl. Basuki Rahmat No. 78, Surabaya',
      noTelepon: '031-2345678',
      picBengkel: 'Budi Prasetyo',
      email: 'service@nusantara-auto.co.id',
      statusAktif: true,
      canAddService: true,
    },
  })

  const workshop3 = await prisma.workshop.create({
    data: {
      namaBengkel: 'Bengkel Resmi Honda Tunas Dwipa',
      alamat: 'Jl. A. Yani No. 120, Surabaya',
      noTelepon: '031-8765432',
      picBengkel: 'Agus Wijaya',
      email: 'cs@tunas-dwipa.co.id',
      statusAktif: true,
      canAddService: false,
    },
  })

  console.log('✅ 3 Bengkel dibuat')

  // ==================== USERS ====================
  const userSuperAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@bkad.go.id',
      name: 'Dr. H. Ahmad Fauzi, M.Si',
      password: 'admin123',
      role: 'SUPER_ADMIN',
      phone: '081234567890',
      isActive: true,
    },
  })

  const userAdmin = await prisma.user.create({
    data: {
      email: 'admin@bkad.go.id',
      name: 'Siti Nurhaliza, S.AP',
      password: 'admin123',
      role: 'ADMIN',
      phone: '081234567891',
      isActive: true,
    },
  })

  const userBengkel = await prisma.user.create({
    data: {
      email: 'bengkel@jaya-makmur.co.id',
      name: 'Hadi Sutrisno',
      password: 'bengkel123',
      role: 'BENGKEL',
      phone: '081234567892',
      bengkelId: workshop1.id,
      isActive: true,
    },
  })

  const userBengkel2 = await prisma.user.create({
    data: {
      email: 'bengkel@nusantara-auto.co.id',
      name: 'Budi Prasetyo',
      password: 'bengkel123',
      role: 'BENGKEL',
      phone: '081234567893',
      bengkelId: workshop2.id,
      isActive: true,
    },
  })

  const userPimpinan = await prisma.user.create({
    data: {
      email: 'pimpinan@bkad.go.id',
      name: 'Drs. H. Suryanto, M.M',
      password: 'pimpinan123',
      role: 'PIMPINAN',
      phone: '081234567894',
      isActive: true,
    },
  })

  console.log('✅ 5 User dibuat')

  // ==================== VEHICLES ====================
  const vehicle1 = await prisma.vehicle.create({
    data: {
      nomorPolisi: 'D 1234 AB',
      namaPengguna: 'Ir. Rahmat Hidayat',
      skpdBidang: 'Bidang Keuangan',
      jenisKendaraan: 'RODA_4',
      merk: 'Toyota',
      type: 'Avanza 1.5 G',
      tahun: 2020,
      nomorRangka: 'MHFM1DE2LK012345',
      nomorMesin: '2NR1234567',
      warna: 'Silver',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 45230,
      isActive: true,
    },
  })

  const vehicle2 = await prisma.vehicle.create({
    data: {
      nomorPolisi: 'D 5678 CD',
      namaPengguna: 'Hj. Dewi Safitri, SE',
      skpdBidang: 'Bidang Perencanaan',
      jenisKendaraan: 'RODA_4',
      merk: 'Mitsubishi',
      type: 'Xpander Cross',
      tahun: 2022,
      nomorRangka: 'PAJX2DE3NM023456',
      nomorMesin: '4A91234567',
      warna: 'Hitam',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 28750,
      isActive: true,
    },
  })

  const vehicle3 = await prisma.vehicle.create({
    data: {
      nomorPolisi: 'D 9012 EF',
      namaPengguna: 'Drs. Mulyono Pratama',
      skpdBidang: 'Bidang Aset',
      jenisKendaraan: 'RODA_2',
      merk: 'Honda',
      type: 'Supra X 125 FI',
      tahun: 2021,
      nomorRangka: 'MH1JE2623LK034567',
      nomorMesin: 'JE26E1234567',
      warna: 'Merah',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'KURANG_BAIK',
      kilometerTerakhir: 32100,
      isActive: true,
    },
  })

  const vehicle4 = await prisma.vehicle.create({
    data: {
      nomorPolisi: 'D 3456 GH',
      namaPengguna: 'Rina Wulandari, S.Sos',
      skpdBidang: 'Sekretariat',
      jenisKendaraan: 'RODA_4',
      merk: 'Suzuki',
      type: 'Ertiga GX',
      tahun: 2019,
      nomorRangka: 'MBJS2DE3JK045678',
      nomorMesin: 'K14B1234567',
      warna: 'Putih',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 67800,
      isActive: true,
    },
  })

  const vehicle5 = await prisma.vehicle.create({
    data: {
      nomorPolisi: 'D 7890 IJ',
      namaPengguna: 'Agus Setiawan',
      skpdBidang: 'Bidang Keuangan',
      jenisKendaraan: 'RODA_2',
      merk: 'Yamaha',
      type: 'NMAX 155',
      tahun: 2023,
      nomorRangka: 'MH3JE2843KL056789',
      nomorMesin: 'JF28E1234567',
      warna: 'Biru',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 12400,
      isActive: true,
    },
  })

  const vehicle6 = await prisma.vehicle.create({
    data: {
      nomorPolisi: 'D 2345 KL',
      namaPengguna: 'Dra. Nurhasanah, M.M',
      skpdBidang: 'Bidang Perencanaan',
      jenisKendaraan: 'RODA_4',
      merk: 'Toyota',
      type: 'Innova Reborn 2.4 V',
      tahun: 2021,
      nomorRangka: 'MHFM2DE5LM067890',
      nomorMesin: '2GD1234567',
      warna: 'Abu-abu',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 52100,
      isActive: true,
    },
  })

  const vehicle7 = await prisma.vehicle.create({
    data: {
      nomorPolisi: 'D 6789 MN',
      namaPengguna: 'Wahyu Pratama, ST',
      skpdBidang: 'Bidang Aset',
      jenisKendaraan: 'RODA_2',
      merk: 'Honda',
      type: 'Beat CBS ISS',
      tahun: 2022,
      nomorRangka: 'MH1JE2863NK078901',
      nomorMesin: 'JEBE1234567',
      warna: 'Hitam',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 18900,
      isActive: true,
    },
  })

  const vehicle8 = await prisma.vehicle.create({
    data: {
      nomorPolisi: 'D 0123 OP',
      namaPengguna: 'H. Suparman, SH',
      skpdBidang: 'Sekretariat',
      jenisKendaraan: 'RODA_4',
      merk: 'Daihatsu',
      type: 'Gran Max MB 1.5',
      tahun: 2018,
      nomorRangka: 'MHFD2DE7PK089012',
      nomorMesin: '3SZ1234567',
      warna: 'Putih',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'KURANG_BAIK',
      kilometerTerakhir: 89300,
      isActive: true,
    },
  })

  console.log('✅ 8 Kendaraan dibuat')

  // ==================== BUDGETS ====================
  const currentYear = new Date().getFullYear()
  const budgets = [
    { tahun: currentYear - 2, vehicleId: vehicle1.id, jenisKendaraan: 'RODA_4', totalAnggaran: 15000000, realisasi: 12300000, sisaAnggaran: 2700000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear - 2, vehicleId: vehicle2.id, jenisKendaraan: 'RODA_4', totalAnggaran: 18000000, realisasi: 15600000, sisaAnggaran: 2400000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear - 1, vehicleId: vehicle1.id, jenisKendaraan: 'RODA_4', totalAnggaran: 20000000, realisasi: 4500000, sisaAnggaran: 15500000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear - 1, vehicleId: vehicle2.id, jenisKendaraan: 'RODA_4', totalAnggaran: 22000000, realisasi: 3800000, sisaAnggaran: 18200000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear - 1, vehicleId: vehicle3.id, jenisKendaraan: 'RODA_2', totalAnggaran: 8000000, realisasi: 3200000, sisaAnggaran: 4800000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear, vehicleId: vehicle1.id, jenisKendaraan: 'RODA_4', totalAnggaran: 20000000, realisasi: 4500000, sisaAnggaran: 15500000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear, vehicleId: vehicle2.id, jenisKendaraan: 'RODA_4', totalAnggaran: 22000000, realisasi: 3800000, sisaAnggaran: 18200000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear, vehicleId: vehicle3.id, jenisKendaraan: 'RODA_2', totalAnggaran: 8000000, realisasi: 3200000, sisaAnggaran: 4800000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear, vehicleId: vehicle4.id, jenisKendaraan: 'RODA_4', totalAnggaran: 15000000, realisasi: 7500000, sisaAnggaran: 7500000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear, vehicleId: vehicle5.id, jenisKendaraan: 'RODA_2', totalAnggaran: 6000000, realisasi: 1500000, sisaAnggaran: 4500000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear, vehicleId: vehicle6.id, jenisKendaraan: 'RODA_4', totalAnggaran: 25000000, realisasi: 8900000, sisaAnggaran: 16100000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear, vehicleId: vehicle7.id, jenisKendaraan: 'RODA_2', totalAnggaran: 5000000, realisasi: 2500000, sisaAnggaran: 2500000, statusAnggaran: 'AKTIF' },
    { tahun: currentYear, vehicleId: vehicle8.id, jenisKendaraan: 'RODA_4', totalAnggaran: 12000000, realisasi: 11200000, sisaAnggaran: 800000, statusAnggaran: 'AKTIF' },
  ]

  for (const b of budgets) {
    await prisma.budget.create({ data: b })
  }

  console.log(`✅ ${budgets.length} Anggaran dibuat`)

  // ==================== SERVICES ====================
  const now = new Date()
  const monthsAgo = (months: number) => {
    const d = new Date(now)
    d.setMonth(d.getMonth() - months)
    return d
  }

  const service1 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2024-001',
      tanggalService: monthsAgo(10),
      vehicleId: vehicle1.id,
      bengkelId: workshop2.id,
      jenisService: 'RUTIN',
      keterangan: 'Service berkala 40.000 km',
      kilometerService: 40000,
      estimasiBiaya: 2500000,
      totalBiaya: 2350000,
      statusService: 'SELESAI',
      prioritas: 'NORMAL',
      estimasiLamaPerbaikan: 1,
      tanggalSelesai: new Date(monthsAgo(10).getTime() + 86400000),
      progress: 100,
      approvedBy: userAdmin.id,
      approvedAt: monthsAgo(10),
      catatanAdmin: 'Disetujui untuk service rutin',
      catatanBengkel: 'Service selesai, kendaraan dalam kondisi baik',
    },
  })

  const service2 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2024-002',
      tanggalService: monthsAgo(8),
      vehicleId: vehicle3.id,
      bengkelId: workshop3.id,
      jenisService: 'PERBAIKAN',
      keterangan: 'Kampas rem aus, ganti kampas dan disc brake',
      kilometerService: 30000,
      estimasiBiaya: 1800000,
      totalBiaya: 1750000,
      statusService: 'SELESAI',
      prioritas: 'TINGGI',
      estimasiLamaPerbaikan: 2,
      tanggalSelesai: new Date(monthsAgo(8).getTime() + 2 * 86400000),
      progress: 100,
      approvedBy: userAdmin.id,
      approvedAt: monthsAgo(8),
    },
  })

  const service3 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2024-003',
      tanggalService: monthsAgo(6),
      vehicleId: vehicle4.id,
      bengkelId: workshop2.id,
      jenisService: 'RUTIN',
      keterangan: 'Ganti oli dan tune-up',
      kilometerService: 60000,
      estimasiBiaya: 3200000,
      totalBiaya: 3050000,
      statusService: 'SELESAI',
      prioritas: 'NORMAL',
      estimasiLamaPerbaikan: 1,
      tanggalSelesai: new Date(monthsAgo(6).getTime() + 86400000),
      progress: 100,
      approvedBy: userAdmin.id,
      approvedAt: monthsAgo(6),
    },
  })

  const service4 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-001',
      tanggalService: monthsAgo(4),
      vehicleId: vehicle2.id,
      bengkelId: workshop2.id,
      jenisService: 'RUTIN',
      keterangan: 'Service berkala 25.000 km',
      kilometerService: 25000,
      estimasiBiaya: 2800000,
      totalBiaya: 2650000,
      statusService: 'SELESAI',
      prioritas: 'NORMAL',
      estimasiLamaPerbaikan: 1,
      tanggalSelesai: new Date(monthsAgo(4).getTime() + 86400000),
      progress: 100,
      approvedBy: userAdmin.id,
      approvedAt: monthsAgo(4),
    },
  })

  const service5 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-002',
      tanggalService: monthsAgo(2),
      vehicleId: vehicle6.id,
      bengkelId: workshop1.id,
      jenisService: 'PERBAIKAN',
      keterangan: 'AC tidak dingin, kompressor bocor',
      kilometerService: 50000,
      estimasiBiaya: 4500000,
      totalBiaya: 4200000,
      statusService: 'SELESAI',
      prioritas: 'NORMAL',
      estimasiLamaPerbaikan: 3,
      tanggalSelesai: new Date(monthsAgo(2).getTime() + 3 * 86400000),
      progress: 100,
      approvedBy: userAdmin.id,
      approvedAt: monthsAgo(2),
    },
  })

  const service6 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-003',
      tanggalService: monthsAgo(1),
      vehicleId: vehicle1.id,
      bengkelId: workshop2.id,
      jenisService: 'DARURAT',
      keterangan: 'Radiator bocor, mesin overheat',
      kilometerService: 45000,
      estimasiBiaya: 5500000,
      totalBiaya: 0,
      statusService: 'DIPROSES',
      prioritas: 'DARURAT',
      estimasiLamaPerbaikan: 5,
      progress: 65,
      approvedBy: userAdmin.id,
      approvedAt: monthsAgo(1),
      catatanBengkel: 'Sedang menunggu spare part radiator baru',
    },
  })

  const service7 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-004',
      tanggalService: monthsAgo(0),
      vehicleId: vehicle5.id,
      bengkelId: workshop3.id,
      jenisService: 'RUTIN',
      keterangan: 'Service berkala 10.000 km, ganti oli',
      kilometerService: 10000,
      estimasiBiaya: 800000,
      totalBiaya: 0,
      statusService: 'DISETUJUI',
      prioritas: 'NORMAL',
      estimasiLamaPerbaikan: 1,
      progress: 0,
      approvedBy: userAdmin.id,
      approvedAt: new Date(),
    },
  })

  const service8 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-005',
      tanggalService: monthsAgo(0),
      vehicleId: vehicle8.id,
      bengkelId: workshop1.id,
      jenisService: 'PERBAIKAN',
      keterangan: 'Mesin knocking, perlu overhaul',
      kilometerService: 88000,
      estimasiBiaya: 12000000,
      totalBiaya: 0,
      statusService: 'DIPROSES',
      prioritas: 'TINGGI',
      estimasiLamaPerbaikan: 7,
      progress: 35,
      approvedBy: userAdmin.id,
      approvedAt: monthsAgo(0),
      catatanBengkel: 'Proses pembongkaran mesin, beberapa komponen perlu diganti',
    },
  })

  const service9 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-006',
      tanggalService: monthsAgo(0),
      vehicleId: vehicle7.id,
      bengkelId: workshop3.id,
      jenisService: 'RUTIN',
      keterangan: 'Ganti ban dan kampas rem',
      kilometerService: 18000,
      estimasiBiaya: 1200000,
      totalBiaya: 1080000,
      statusService: 'PENGAJUAN',
      prioritas: 'NORMAL',
      estimasiLamaPerbaikan: 2,
      progress: 0,
      catatanBengkel: 'Item sudah ditambahkan, menunggu persetujuan admin',
    },
  })

  const service10 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-007',
      tanggalService: monthsAgo(3),
      vehicleId: vehicle3.id,
      bengkelId: workshop3.id,
      jenisService: 'PERBAIKAN',
      keterangan: 'Ganti aki dan starter motor',
      kilometerService: 31500,
      estimasiBiaya: 1500000,
      totalBiaya: 1400000,
      statusService: 'SELESAI',
      prioritas: 'TINGGI',
      estimasiLamaPerbaikan: 2,
      tanggalSelesai: new Date(monthsAgo(3).getTime() + 2 * 86400000),
      progress: 100,
      approvedBy: userAdmin.id,
      approvedAt: monthsAgo(3),
    },
  })

  console.log('✅ 10 Service dibuat')

  // Additional services for new workflow states
  const service11 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-008',
      tanggalService: monthsAgo(0),
      vehicleId: vehicle4.id,
      bengkelId: workshop1.id,
      jenisService: 'PERBAIKAN',
      keterangan: 'Klakson mati, lampu utama redup',
      kilometerService: 67000,
      estimasiBiaya: 950000,
      totalBiaya: 0,
      statusService: 'DIAJUKAN',
      prioritas: 'NORMAL',
      estimasiLamaPerbaikan: 2,
      progress: 0,
    },
  })

  const service12 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-009',
      tanggalService: monthsAgo(1),
      vehicleId: vehicle5.id,
      bengkelId: workshop3.id,
      jenisService: 'PERBAIKAN',
      keterangan: 'Servis ringan, ganti oli dan filter',
      kilometerService: 11500,
      estimasiBiaya: 750000,
      totalBiaya: 680000,
      statusService: 'MENUNGGU_PERSETUJUAN',
      prioritas: 'NORMAL',
      estimasiLamaPerbaikan: 1,
      progress: 100,
      approvedBy: userAdmin.id,
      approvedAt: monthsAgo(1),
      catatanBengkel: 'Service selesai, semua komponen sudah diganti',
    },
  })

  const service13 = await prisma.service.create({
    data: {
      nomorService: 'SVC-2025-010',
      tanggalService: monthsAgo(0),
      vehicleId: vehicle3.id,
      bengkelId: workshop3.id,
      jenisService: 'PERBAIKAN',
      keterangan: 'Rantai dan gir aus',
      kilometerService: 33000,
      estimasiBiaya: 600000,
      totalBiaya: 550000,
      statusService: 'DITOLAK',
      prioritas: 'NORMAL',
      estimasiLamaPerbaikan: 1,
      progress: 0,
      rejectedReason: 'Harga pengajuan terlalu tinggi, mohon revisi item service',
      catatanBengkel: 'Rantai dan gir perlu diganti segera',
    },
  })

  console.log('✅ 13 Service dibuat (termasuk workflow PENGAJUAN, MENUNGGU_PERSETUJUAN, DITOLAK)')

  // ==================== SERVICE ITEMS ====================
  const serviceItems = [
    // Service 1 - Service berkala Avanza
    { serviceId: service1.id, itemName: 'Ganti Oli Mesin', quantity: 1, hargaSatuan: 350000, totalHarga: 350000, keterangan: 'Toyota Genuine Oil 5W-30' },
    { serviceId: service1.id, itemName: 'Filter Oli', quantity: 1, hargaSatuan: 150000, totalHarga: 150000, keterangan: 'Denso' },
    { serviceId: service1.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 500000, totalHarga: 500000, keterangan: 'Biaya mekanik' },
    { serviceId: service1.id, itemName: 'Filter Udara', quantity: 1, hargaSatuan: 200000, totalHarga: 200000, keterangan: 'Filter udara baru' },

    // Service 2 - Kampas rem Honda Supra
    { serviceId: service2.id, itemName: 'Kampas Rem Depan', quantity: 1, hargaSatuan: 250000, totalHarga: 250000, keterangan: 'Original Honda' },
    { serviceId: service2.id, itemName: 'Disc Brake', quantity: 1, hargaSatuan: 450000, totalHarga: 450000, keterangan: 'Disc brake depan' },
    { serviceId: service2.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 300000, totalHarga: 300000, keterangan: 'Biaya pemasangan' },

    // Service 3 - Ganti oli Ertiga
    { serviceId: service3.id, itemName: 'Ganti Oli Mesin', quantity: 1, hargaSatuan: 400000, totalHarga: 400000, keterangan: 'Shell Helix 5W-30' },
    { serviceId: service3.id, itemName: 'Filter Oli', quantity: 1, hargaSatuan: 180000, totalHarga: 180000 },
    { serviceId: service3.id, itemName: 'Filter Udara', quantity: 1, hargaSatuan: 250000, totalHarga: 250000 },
    { serviceId: service3.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 600000, totalHarga: 600000, keterangan: 'Tune-up lengkap' },

    // Service 4 - Service Xpander
    { serviceId: service4.id, itemName: 'Ganti Oli Mesin', quantity: 1, hargaSatuan: 380000, totalHarga: 380000, keterangan: 'Mitsubishi Genuine Oil' },
    { serviceId: service4.id, itemName: 'Filter Oli', quantity: 1, hargaSatuan: 170000, totalHarga: 170000 },
    { serviceId: service4.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 550000, totalHarga: 550000 },

    // Service 5 - AC Innova
    { serviceId: service5.id, itemName: 'Kompressor AC', quantity: 1, hargaSatuan: 2800000, totalHarga: 2800000, keterangan: 'Denso kompressor baru' },
    { serviceId: service5.id, itemName: 'Freon R134a', quantity: 2, hargaSatuan: 200000, totalHarga: 400000, keterangan: 'Isi ulang freon' },
    { serviceId: service5.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 800000, totalHarga: 800000, keterangan: 'Biaya pemasangan kompressor' },

    // Service 6 - Radiator Avanza (in progress)
    { serviceId: service6.id, itemName: 'Radiator Baru', quantity: 1, hargaSatuan: 2500000, totalHarga: 2500000, keterangan: 'Radiator original Toyota' },
    { serviceId: service6.id, itemName: 'Coolant', quantity: 2, hargaSatuan: 150000, totalHarga: 300000, keterangan: 'Toyota Long Life Coolant' },
    { serviceId: service6.id, itemName: 'Thermostat', quantity: 1, hargaSatuan: 450000, totalHarga: 450000, keterangan: 'Thermostat baru' },
    { serviceId: service6.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 750000, totalHarga: 750000, keterangan: 'Biaya pemasangan' },

    // Service 7 - Service NMAX (DISETUJUI)
    { serviceId: service7.id, itemName: 'Ganti Oli Mesin', quantity: 1, hargaSatuan: 180000, totalHarga: 180000, keterangan: 'Yamalube' },
    { serviceId: service7.id, itemName: 'Filter Oli', quantity: 1, hargaSatuan: 80000, totalHarga: 80000 },
    { serviceId: service7.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 200000, totalHarga: 200000 },

    // Service 8 - Overhaul Gran Max (in progress)
    { serviceId: service8.id, itemName: 'Gasket Set Mesin', quantity: 1, hargaSatuan: 1500000, totalHarga: 1500000, keterangan: 'Full gasket set' },
    { serviceId: service8.id, itemName: 'Ring Piston', quantity: 4, hargaSatuan: 350000, totalHarga: 1400000, keterangan: 'Oversize 0.25' },
    { serviceId: service8.id, itemName: 'Klep & Valve Seal', quantity: 1, hargaSatuan: 800000, totalHarga: 800000, keterangan: 'Set klep + seal' },
    { serviceId: service8.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 2500000, totalHarga: 2500000, keterangan: 'Biaya overhaul mesin' },

    // Service 9 - Beat (now PENGAJUAN)
    { serviceId: service9.id, itemName: 'Ban Depan', quantity: 1, hargaSatuan: 350000, totalHarga: 350000, keterangan: 'IRC NR91' },
    { serviceId: service9.id, itemName: 'Ban Belakang', quantity: 1, hargaSatuan: 380000, totalHarga: 380000, keterangan: 'IRC NR91' },
    { serviceId: service9.id, itemName: 'Kampas Rem', quantity: 1, hargaSatuan: 150000, totalHarga: 150000, keterangan: 'Kampas rem depan' },
    { serviceId: service9.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 200000, totalHarga: 200000 },

    // Service 10 - Aki Supra
    { serviceId: service10.id, itemName: 'Aki GS Astra', quantity: 1, hargaSatuan: 450000, totalHarga: 450000, keterangan: 'MF 12V 5Ah' },
    { serviceId: service10.id, itemName: 'Starter Motor', quantity: 1, hargaSatuan: 650000, totalHarga: 650000, keterangan: 'Starter motor Honda' },
    { serviceId: service10.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 300000, totalHarga: 300000 },

    // Service 12 (MENUNGGU_PERSETUJUAN) - NMAX servis ringan
    { serviceId: service12.id, itemName: 'Ganti Oli Mesin', quantity: 1, hargaSatuan: 180000, totalHarga: 180000, keterangan: 'Yamalube' },
    { serviceId: service12.id, itemName: 'Filter Oli', quantity: 1, hargaSatuan: 80000, totalHarga: 80000 },
    { serviceId: service12.id, itemName: 'Busi NGK', quantity: 1, hargaSatuan: 45000, totalHarga: 45000 },
    { serviceId: service12.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 150000, totalHarga: 150000 },

    // Service 13 (DITOLAK) - Supra rantai dan gir
    { serviceId: service13.id, itemName: 'Rantai', quantity: 1, hargaSatuan: 200000, totalHarga: 200000, keterangan: 'Rantai 428H' },
    { serviceId: service13.id, itemName: 'Gir Depan', quantity: 1, hargaSatuan: 120000, totalHarga: 120000 },
    { serviceId: service13.id, itemName: 'Gir Belakang', quantity: 1, hargaSatuan: 150000, totalHarga: 150000 },
    { serviceId: service13.id, itemName: 'Jasa Service', quantity: 1, hargaSatuan: 80000, totalHarga: 80000 },
  ]

  for (const item of serviceItems) {
    await prisma.serviceItem.create({ data: item })
  }

  console.log('✅ Service Items dibuat')

  // ==================== SERVICE HISTORIES ====================
  const serviceHistories = [
    { serviceId: service1.id, vehicleId: vehicle1.id, status: 'DIAJUKAN', keterangan: 'Service diajukan oleh admin', changedBy: userAdmin.id },
    { serviceId: service1.id, vehicleId: vehicle1.id, status: 'DISETUJUI', keterangan: 'Disetujui oleh Super Admin', changedBy: userSuperAdmin.id },
    { serviceId: service1.id, vehicleId: vehicle1.id, status: 'DIPROSES', keterangan: 'Sedang dikerjakan bengkel', changedBy: userBengkel.id },
    { serviceId: service1.id, vehicleId: vehicle1.id, status: 'SELESAI', keterangan: 'Service selesai', changedBy: userBengkel.id },
    { serviceId: service6.id, vehicleId: vehicle1.id, status: 'DIAJUKAN', keterangan: 'Darurat: radiator bocor', changedBy: userAdmin.id },
    { serviceId: service6.id, vehicleId: vehicle1.id, status: 'DISETUJUI', keterangan: 'Disetujui segera', changedBy: userSuperAdmin.id },
    { serviceId: service6.id, vehicleId: vehicle1.id, status: 'DIPROSES', keterangan: 'Sedang dikerjakan', changedBy: userBengkel.id },
    { serviceId: service9.id, vehicleId: vehicle7.id, status: 'DIAJUKAN', keterangan: 'Service rutin diajukan oleh admin', changedBy: userAdmin.id },
    { serviceId: service9.id, vehicleId: vehicle7.id, status: 'PENGAJUAN', keterangan: 'Bengkel mengirim pengajuan item service', changedBy: userBengkel2.id },
    { serviceId: service11.id, vehicleId: vehicle4.id, status: 'DIAJUKAN', keterangan: 'Service baru diajukan oleh admin', changedBy: userAdmin.id },
    { serviceId: service12.id, vehicleId: vehicle5.id, status: 'DIAJUKAN', keterangan: 'Service diajukan', changedBy: userAdmin.id },
    { serviceId: service12.id, vehicleId: vehicle5.id, status: 'PENGAJUAN', keterangan: 'Bengkel mengirim pengajuan', changedBy: userBengkel2.id },
    { serviceId: service12.id, vehicleId: vehicle5.id, status: 'DISETUJUI', keterangan: 'Pengajuan disetujui admin', changedBy: userAdmin.id },
    { serviceId: service12.id, vehicleId: vehicle5.id, status: 'DIPROSES', keterangan: 'Sedang dikerjakan', changedBy: userBengkel2.id },
    { serviceId: service12.id, vehicleId: vehicle5.id, status: 'MENUNGGU_PERSETUJUAN', keterangan: 'Bengkel menandai selesai', changedBy: userBengkel2.id },
    { serviceId: service13.id, vehicleId: vehicle3.id, status: 'DIAJUKAN', keterangan: 'Service diajukan', changedBy: userAdmin.id },
    { serviceId: service13.id, vehicleId: vehicle3.id, status: 'PENGAJUAN', keterangan: 'Bengkel mengirim pengajuan', changedBy: userBengkel2.id },
    { serviceId: service13.id, vehicleId: vehicle3.id, status: 'DITOLAK', keterangan: 'Harga pengajuan terlalu tinggi, mohon revisi', changedBy: userAdmin.id },
  ]

  for (const h of serviceHistories) {
    await prisma.serviceHistory.create({ data: h })
  }

  console.log('✅ Service Histories dibuat')

  // ==================== SPARE PARTS ====================
  const spareParts = [
    // Bengkel Motor Jaya Makmur (workshop1)
    { namaSukuCadang: 'Kompressor AC Denso', qty: 8, hargaSatuan: 2800000, supplier: 'PT. Denso Indonesia', stok: 8, keterangan: 'Kompressor AC untuk Toyota Innova', isActive: true, bengkelId: workshop1.id },
    { namaSukuCadang: 'Gasket Set Mesin Daihatsu', qty: 5, hargaSatuan: 1500000, supplier: 'PT. Astra Daihatsu Motor', stok: 5, keterangan: 'Full gasket set Gran Max', isActive: true, bengkelId: workshop1.id },
    { namaSukuCadang: 'Ring Piston Oversize', qty: 12, hargaSatuan: 350000, supplier: 'PT. Astra Daihatsu Motor', stok: 12, keterangan: 'Oversize 0.25', isActive: true, bengkelId: workshop1.id },
    { namaSukuCadang: 'Klep & Valve Seal', qty: 6, hargaSatuan: 800000, supplier: 'PT. Astra Daihatsu Motor', stok: 6, keterangan: 'Set klep + seal', isActive: true, bengkelId: workshop1.id },
    { namaSukuCadang: 'Freon R134a', qty: 20, hargaSatuan: 200000, supplier: 'PT. Chemindo', stok: 20, keterangan: 'Isi ulang freon AC', isActive: true, bengkelId: workshop1.id },

    // Auto Service Nusantara (workshop2)
    { namaSukuCadang: 'Oli Mesin Toyota 5W-30', qty: 50, hargaSatuan: 350000, supplier: 'PT. Toyota Astra Motor', stok: 50, keterangan: 'Oli genuine Toyota 4L', isActive: true, bengkelId: workshop2.id },
    { namaSukuCadang: 'Filter Oli Denso', qty: 40, hargaSatuan: 150000, supplier: 'PT. Denso Indonesia', stok: 40, keterangan: 'Filter oli universal', isActive: true, bengkelId: workshop2.id },
    { namaSukuCadang: 'Filter Udara Toyota Avanza', qty: 25, hargaSatuan: 200000, supplier: 'PT. Denso Indonesia', stok: 25, keterangan: 'Filter udara ori Denso', isActive: true, bengkelId: workshop2.id },
    { namaSukuCadang: 'Radiator Toyota Avanza', qty: 3, hargaSatuan: 2500000, supplier: 'PT. Toyota Astra Motor', stok: 3, keterangan: 'Radiator original Toyota', isActive: true, bengkelId: workshop2.id },
    { namaSukuCadang: 'Coolant Toyota Long Life', qty: 30, hargaSatuan: 150000, supplier: 'PT. Toyota Astra Motor', stok: 30, keterangan: 'Coolant radiator', isActive: true, bengkelId: workshop2.id },
    { namaSukuCadang: 'Oli Mesin Mitsubishi', qty: 30, hargaSatuan: 380000, supplier: 'PT. Mitsubishi Motors', stok: 30, keterangan: 'Mitsubishi Genuine Oil', isActive: true, bengkelId: workshop2.id },
    { namaSukuCadang: 'Thermostat', qty: 10, hargaSatuan: 450000, supplier: 'PT. Denso Indonesia', stok: 10, keterangan: 'Thermostat universal', isActive: true, bengkelId: workshop2.id },

    // Bengkel Resmi Honda Tunas Dwipa (workshop3)
    { namaSukuCadang: 'Kampas Rem Depan Honda', qty: 30, hargaSatuan: 250000, supplier: 'PT. Astra Honda Motor', stok: 30, keterangan: 'Original Honda', isActive: true, bengkelId: workshop3.id },
    { namaSukuCadang: 'Ban IRC NR91 90/90-14', qty: 20, hargaSatuan: 350000, supplier: 'PT. IRC Indonesia', stok: 20, keterangan: 'Ban motor depan/belakang', isActive: true, bengkelId: workshop3.id },
    { namaSukuCadang: 'Aki GS Astra MF 12V 5Ah', qty: 15, hargaSatuan: 450000, supplier: 'PT. GS Astra', stok: 15, keterangan: 'Aki motor maintenance free', isActive: true, bengkelId: workshop3.id },
    { namaSukuCadang: 'Starter Motor Honda', qty: 8, hargaSatuan: 650000, supplier: 'PT. Astra Honda Motor', stok: 8, keterangan: 'Starter motor Supra/Beat', isActive: true, bengkelId: workshop3.id },
    { namaSukuCadang: 'Rantai 428H', qty: 15, hargaSatuan: 200000, supplier: 'PT. Indak', stok: 15, keterangan: 'Rantai motor Honda', isActive: true, bengkelId: workshop3.id },
    { namaSukuCadang: 'Disc Brake Depan', qty: 10, hargaSatuan: 450000, supplier: 'PT. Astra Honda Motor', stok: 10, keterangan: 'Disc brake depan Honda', isActive: true, bengkelId: workshop3.id },
    { namaSukuCadang: 'Oli Yamalube', qty: 25, hargaSatuan: 180000, supplier: 'PT. Yamaha Indonesia', stok: 25, keterangan: 'Oli mesin Yamaha', isActive: true, bengkelId: workshop3.id },
    { namaSukuCadang: 'Busi NGK', qty: 50, hargaSatuan: 45000, supplier: 'PT. NGK Busi Indonesia', stok: 50, keterangan: 'Busi motor universal', isActive: true, bengkelId: workshop3.id },
  ]

  for (const sp of spareParts) {
    await prisma.sparePart.create({ data: sp })
  }

  console.log('✅ 20 Suku Cadang dibuat (per-bengkel)')

  // ==================== NOTIFICATIONS ====================
  const notifications = [
    { userId: userSuperAdmin.id, title: 'Service Darurat Diajukan', message: 'Kendaraan D 1234 AB (Toyota Avanza) mengajukan service darurat - Radiator bocor, mesin overheat', type: 'ERROR', isRead: false },
    { userId: userSuperAdmin.id, title: 'Anggaran Mendekati Batas', message: 'Anggaran kendaraan D 3456 GH (Suzuki Ertiga) tahun 2025 telah terpakai 50%', type: 'WARNING', isRead: false },
    { userId: userSuperAdmin.id, title: 'Service Selesai', message: 'Service kendaraan D 2345 KL (Toyota Innova) telah selesai. Kompressor AC berhasil diganti', type: 'SUCCESS', isRead: true },
    { userId: userAdmin.id, title: 'Service Baru Diajukan', message: 'Kendaraan D 6789 MN (Honda Beat) mengajukan service rutin - Ganti ban dan kampas rem', type: 'INFO', isRead: false },
    { userId: userAdmin.id, title: 'Service Selesai', message: 'Service kendaraan D 9012 EF (Honda Supra X) selesai. Aki dan starter motor sudah diganti', type: 'SUCCESS', isRead: true },
    { userId: userAdmin.id, title: 'Peringatan Kilometer', message: 'Kendaraan D 0123 OP (Daihatsu Gran Max) sudah menempuh 89.300 km, perlu service segera', type: 'WARNING', isRead: false },
    { userId: userBengkel.id, title: 'Service Baru Masuk', message: 'Ada service baru untuk kendaraan D 1234 AB yang perlu segera ditangani', type: 'INFO', isRead: false },
    { userId: userBengkel.id, title: 'Spare Part Tersedia', message: 'Radiator untuk Toyota Avanza sudah tersedia, bisa langsung dipasang', type: 'SUCCESS', isRead: false },
    { userId: userSuperAdmin.id, title: 'Laporan Bulanan Tersedia', message: 'Laporan pengeluaran service bulan ini sudah bisa diakses', type: 'INFO', isRead: true },
    { userId: userAdmin.id, title: 'Service Terlambat', message: 'Service kendaraan D 0123 OP (Daihatsu Gran Max) melebihi estimasi waktu perbaikan', type: 'WARNING', isRead: false },
    { userId: userPimpinan.id, title: 'Laporan Bulanan Tersedia', message: 'Laporan pengeluaran service bulan ini sudah bisa diakses', type: 'INFO', isRead: false },
    { userId: userPimpinan.id, title: 'Anggaran Mendekati Batas', message: 'Anggaran kendaraan D 0123 OP tahun 2025 telah terpakai lebih dari 90%', type: 'WARNING', isRead: false },
    // New workflow notifications
    { userId: userBengkel.id, title: 'Service Baru Ditugaskan', message: 'Service baru untuk kendaraan D 3456 GH (Suzuki Ertiga) telah ditugaskan ke bengkel Anda. Silakan tambah item dan kirim pengajuan.', type: 'INFO', isRead: false },
    { userId: userBengkel2.id, title: 'Pengajuan Service Ditolak', message: 'Pengajuan service SVC-2025-010 (D 9012 EF) ditolak. Alasan: Harga pengajuan terlalu tinggi. Silakan revisi dan ajukan kembali.', type: 'ERROR', isRead: false },
    { userId: userAdmin.id, title: 'Pengajuan Service Baru', message: 'Bengkel Honda Tunas Dwipa mengirim pengajuan untuk service SVC-2025-006. Silakan review dan setujui/tolak.', type: 'WARNING', isRead: false },
    { userId: userAdmin.id, title: 'Service Menunggu Persetujuan', message: 'Service SVC-2025-009 (D 7890 IJ) telah selesai dikerjakan bengkel dan menunggu persetujuan Anda.', type: 'WARNING', isRead: false },
  ]

  for (const n of notifications) {
    await prisma.notification.create({ data: n })
  }

  console.log('✅ 10 Notifikasi dibuat')

  // ==================== AUDIT LOGS ====================
  const auditLogs = [
    { userId: userSuperAdmin.id, action: 'CREATE', entity: 'User', entityId: userAdmin.id, details: 'Membuat user admin baru: Siti Nurhaliza, S.AP' },
    { userId: userAdmin.id, action: 'CREATE', entity: 'Service', entityId: service6.id, details: 'Mengajukan service darurat untuk kendaraan D 1234 AB' },
    { userId: userSuperAdmin.id, action: 'UPDATE', entity: 'Service', entityId: service6.id, details: 'Menyetujui service SVC-2025-003' },
    { userId: userBengkel.id, action: 'UPDATE', entity: 'Service', entityId: service6.id, details: 'Memproses service, progress 65%' },
    { userId: userAdmin.id, action: 'UPDATE', entity: 'Budget', entityId: 'budget-vehicle4-2025', details: 'Update realisasi anggaran kendaraan D 3456 GH' },
  ]

  for (const a of auditLogs) {
    await prisma.auditLog.create({ data: a })
  }

  console.log('✅ 5 Audit Log dibuat')

  // ==================== SYSTEM SETTINGS ====================
  const settings = [
    { key: 'nama_instansi', value: 'Badan Keuangan dan Aset Daerah' },
    { key: 'nama_singkat', value: 'BKAD' },
    { key: 'tahun_aktif', value: '2025' },
    { key: 'daerah', value: 'Kota Surabaya' },
    { key: 'provinsi', value: 'Jawa Timur' },
    { key: 'alamat_instansi', value: 'Jl. Jimerto No. 25-27, Surabaya' },
    { key: 'telepon_instansi', value: '031-5311201' },
    { key: 'email_instansi', value: 'bkad@surabaya.go.id' },
    { key: 'batas_anggaran_peringatan', value: '80' },
    { key: 'estimasi_service_hari', value: '7' },
    { key: 'bengkel_can_create_service', value: 'false' },
  ]

  for (const s of settings) {
    await prisma.systemSetting.create({ data: s })
  }

  console.log('✅ System Settings dibuat')

  console.log('\n🎉 Seeding selesai!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Ringkasan Data:')
  console.log('  👤 Users       : 3')
  console.log('  🚗 Kendaraan   : 8 (4 Roda 4, 4 Roda 2)')
  console.log('  🔧 Bengkel     : 3')
  console.log('  💰 Anggaran    : 8')
  console.log('  🛠️ Service     : 10')
  console.log('  📦 Suku Cadang : 5')
  console.log('  🔔 Notifikasi  : 10')
  console.log('  📋 Audit Log   : 5')
  console.log('  ⚙️ Settings    : 10')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
