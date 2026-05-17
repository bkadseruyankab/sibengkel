import { db } from './src/lib/db'

async function seed() {
  console.log('Seeding database...')

  // Create workshops first
  const workshop1 = await db.workshop.create({
    data: {
      namaBengkel: 'Bengkel Sejahtera Motor',
      alamat: 'Jl. Raya Utama No. 15',
      noTelepon: '021-1234567',
      picBengkel: 'Ahmad Fauzi',
      email: 'info@sejahtera.com',
    },
  })

  const workshop2 = await db.workshop.create({
    data: {
      namaBengkel: 'Auto Service Pro',
      alamat: 'Jl. Industri No. 28',
      noTelepon: '021-7654321',
      picBengkel: 'Budi Santoso',
      email: 'service@autopro.com',
    },
  })

  // Create vehicles
  const vehicles = [
    {
      nomorPolisi: 'B 1234 ABC',
      namaPengguna: 'Hendra Wijaya',
      skpdBidang: 'Sekretariat BKAD',
      jenisKendaraan: 'RODA_4',
      merk: 'Toyota',
      type: 'Avanza',
      tahun: 2021,
      nomorRangka: 'MHFM5A5A1MK123456',
      nomorMesin: '2NR1234567',
      warna: 'Hitam',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 45000,
    },
    {
      nomorPolisi: 'B 5678 DEF',
      namaPengguna: 'Siti Nurhaliza',
      skpdBidang: 'Bidang Pengelolaan Barang Milik Daerah',
      jenisKendaraan: 'RODA_4',
      merk: 'Honda',
      type: 'Brio',
      tahun: 2022,
      nomorRangka: 'MH2S5A5A2NK234567',
      nomorMesin: 'L12Z2345678',
      warna: 'Putih',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 28000,
    },
    {
      nomorPolisi: 'B 9012 GHI',
      namaPengguna: 'Rizki Ramadhan',
      skpdBidang: 'Bidang Penatausahaan Barang Milik Daerah',
      jenisKendaraan: 'RODA_2',
      merk: 'Honda',
      type: 'Beat',
      tahun: 2023,
      nomorRangka: 'MH1S5A5A3PK345678',
      nomorMesin: 'K24W3456789',
      warna: 'Merah',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 12000,
    },
    {
      nomorPolisi: 'B 3456 JKL',
      namaPengguna: 'Dewi Anggraini',
      skpdBidang: 'Dinas Pendidikan',
      jenisKendaraan: 'RODA_4',
      merk: 'Suzuki',
      type: 'Ertiga',
      tahun: 2020,
      nomorRangka: 'MMS5A5A4LK456789',
      warna: 'Silver',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'KURANG_BAIK',
      kilometerTerakhir: 78000,
    },
    {
      nomorPolisi: 'B 7890 MNO',
      namaPengguna: 'Ahmad Yani',
      skpdBidang: 'Dinas Kesehatan',
      jenisKendaraan: 'RODA_4',
      merk: 'Mitsubishi',
      type: 'Xpander',
      tahun: 2022,
      nomorRangka: 'PAM5A5A5MK567890',
      nomorMesin: '4A915678901',
      warna: 'Abu-abu',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 35000,
    },
    {
      nomorPolisi: 'B 2345 PQR',
      namaPengguna: 'Nurul Hidayah',
      skpdBidang: 'Bidang Pengadaan Barang dan Jasa',
      jenisKendaraan: 'RODA_2',
      merk: 'Yamaha',
      type: 'NMAX',
      tahun: 2021,
      nomorRangka: 'MH3S5A5A6NK678901',
      warna: 'Hitam',
      statusKendaraan: 'NONAKTIF',
      kondisiKendaraan: 'KURANG_BAIK',
      kilometerTerakhir: 52000,
    },
    {
      nomorPolisi: 'B 6789 STU',
      namaPengguna: 'Bambang Supriadi',
      skpdBidang: 'Dinas PUPR',
      jenisKendaraan: 'RODA_4',
      merk: 'Toyota',
      type: 'Hilux',
      tahun: 2019,
      nomorRangka: 'MRT5A5A7PK789012',
      nomorMesin: '1GD78901234',
      warna: 'Putih',
      statusKendaraan: 'RUSAK',
      kondisiKendaraan: 'RUSAK',
      kilometerTerakhir: 120000,
    },
    {
      nomorPolisi: 'B 0123 VWX',
      namaPengguna: 'Fitri Handayani',
      skpdBidang: 'Dinas Perhubungan',
      jenisKendaraan: 'RODA_4',
      merk: 'Daihatsu',
      type: 'Gran Max',
      tahun: 2021,
      nomorRangka: 'MDH5A5A8MK890123',
      warna: 'Kuning',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 60000,
    },
    {
      nomorPolisi: 'B 4567 YZA',
      namaPengguna: 'Irfan Hakim',
      skpdBidang: 'Dinas Sosial',
      jenisKendaraan: 'RODA_2',
      merk: 'Suzuki',
      type: 'Scoopy',
      tahun: 2023,
      nomorRangka: 'MHS5A5A9NK901234',
      warna: 'Biru',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 5000,
    },
    {
      nomorPolisi: 'B 8901 BCD',
      namaPengguna: 'Lisa Permata',
      skpdBidang: 'Badan Kepegawaian Daerah',
      jenisKendaraan: 'RODA_4',
      merk: 'Wuling',
      type: 'Almaz',
      tahun: 2023,
      nomorRangka: 'LSG5A5A0PK012345',
      nomorMesin: 'L4B01234567',
      warna: 'Hitam',
      statusKendaraan: 'AKTIF',
      kondisiKendaraan: 'BAIK',
      kilometerTerakhir: 15000,
    },
  ]

  for (const v of vehicles) {
    await db.vehicle.create({ data: v })
  }

  // Create services for some vehicles
  const allVehicles = await db.vehicle.findMany()
  for (const v of allVehicles.slice(0, 5)) {
    const workshop = v.id === allVehicles[0].id ? workshop1 : workshop2
    await db.service.create({
      data: {
        nomorService: `SVC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        tanggalService: new Date(),
        vehicleId: v.id,
        bengkelId: workshop.id,
        jenisService: 'RUTIN',
        keterangan: 'Service berkala',
        kilometerService: v.kilometerTerakhir,
        estimasiBiaya: 1500000,
        totalBiaya: 1500000,
        statusService: 'SELESAI',
        prioritas: 'NORMAL',
        progress: 100,
        tanggalSelesai: new Date(),
      },
    })
  }

  console.log('Seed data created successfully!')
  console.log(`- ${vehicles.length} vehicles`)
  console.log(`- 2 workshops`)
  console.log(`- 5 services`)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
