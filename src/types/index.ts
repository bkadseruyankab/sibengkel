export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'BENGKEL' | 'PIMPINAN'

export type JenisKendaraan = 'RODA_2' | 'RODA_4'

export type StatusKendaraan = 'AKTIF' | 'NONAKTIF' | 'RUSAK'

export type KondisiKendaraan = 'BAIK' | 'KURANG_BAIK' | 'RUSAK'

export type StatusService = 'DIAJUKAN' | 'PENGAJUAN' | 'DISETUJUI' | 'DITOLAK' | 'DIPROSES' | 'PENDING' | 'SELESAI' | 'MENUNGGU_PERSETUJUAN'

export type JenisService = 'RUTIN' | 'PERBAIKAN' | 'DARURAT'

export type Prioritas = 'RENDAH' | 'NORMAL' | 'TINGGI' | 'DARURAT'

export type StatusAnggaran = 'AKTIF' | 'NONAKTIF' | 'HABIS'

export type BudgetLevel = 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR'

export interface Vehicle {
  id: string
  nomorPolisi: string
  namaPengguna: string
  skpdBidang: string
  jenisKendaraan: JenisKendaraan
  merk: string
  type: string
  tahun: number
  nomorRangka?: string
  nomorMesin?: string
  warna?: string
  statusKendaraan: StatusKendaraan
  kondisiKendaraan: KondisiKendaraan
  kilometerTerakhir: number
  fotoUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  documents?: VehicleDocument[]
  services?: Service[]
  budgets?: Budget[]
}

export interface VehicleDocument {
  id: string
  vehicleId: string
  jenisDokumen: string
  fileName: string
  filePath: string
  fileSize?: number
  uploadedAt: string
}

export interface Service {
  id: string
  nomorService: string
  tanggalService: string
  vehicleId: string
  bengkelId: string
  jenisService: JenisService
  keterangan?: string
  kilometerService: number
  estimasiBiaya: number
  totalBiaya: number
  statusService: StatusService
  prioritas: Prioritas
  estimasiLamaPerbaikan?: number
  tanggalSelesai?: string
  catatanAdmin?: string
  catatanBengkel?: string
  progress: number
  approvedBy?: string
  approvedAt?: string
  rejectedReason?: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  vehicle?: Vehicle
  bengkel?: Workshop
  items?: ServiceItem[]
  documents?: ServiceDocument[]
  spareParts?: ServiceSparePart[]
}

export interface ServiceItem {
  id: string
  serviceId: string
  itemName: string
  quantity: number
  hargaSatuan: number
  totalHarga: number
  keterangan?: string
  photos?: ServiceItemPhoto[]
}

export interface ServiceItemPhoto {
  id: string
  itemId: string
  fileName: string
  filePath: string
  fileSize?: number | null
  fileType?: string | null
  keterangan?: string | null
  uploadedAt: string
}

export interface ServiceDocument {
  id: string
  serviceId: string
  fileName: string
  filePath: string
  fileSize?: number
  fileType?: string
  jenisDokumen: string
  uploadedAt: string
}

export interface Budget {
  id: string
  tahun: number
  vehicleId: string
  jenisKendaraan: JenisKendaraan
  totalAnggaran: number
  realisasi: number
  sisaAnggaran: number
  statusAnggaran: StatusAnggaran
  createdAt: string
  updatedAt: string
  vehicle?: Vehicle
  history?: BudgetHistory[]
}

export interface BudgetHistory {
  id: string
  budgetId: string
  perubahan: number
  keterangan?: string
  changedBy?: string
  createdAt: string
}

export interface Workshop {
  id: string
  namaBengkel: string
  alamat?: string
  noTelepon?: string
  picBengkel?: string
  email?: string
  statusAktif: boolean
  canAddService: boolean
  createdAt: string
  updatedAt: string
  services?: Service[]
  documents?: WorkshopDocument[]
}

export interface WorkshopDocument {
  id: string
  workshopId: string
  jenisDokumen: string
  fileName: string
  filePath: string
  fileSize?: number
  fileType?: string
  keterangan?: string
  uploadedBy?: string
  uploadedAt: string
}

export interface SparePart {
  id: string
  namaSukuCadang: string
  qty: number
  hargaSatuan: number
  supplier?: string
  stok: number
  keterangan?: string
  isActive: boolean
  bengkelId: string
  bengkel?: Workshop
  createdAt: string
  updatedAt: string
}

export interface ServiceSparePart {
  id: string
  serviceId: string
  sparePartId: string
  qty: number
  hargaSatuan: number
  totalHarga: number
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  isRead: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  userId?: string
  action: string
  entity: string
  entityId?: string
  details?: string
  createdAt: string
}

export interface SystemSetting {
  id: string
  key: string
  value?: string
  updatedAt: string
}

export interface DashboardStats {
  totalKendaraanRoda2: number
  totalKendaraanRoda4: number
  kendaraanAktifService: number
  kendaraanSelesaiService: number
  totalAnggaranTahun: number
  totalAnggaranTerpakai: number
  sisaAnggaran: number
  pengeluaranBulanan: { bulan: string; total: number }[]
  kendaraanSeringService: { nomorPolisi: string; merk: string; total: number }[]
  statistikBengkel: { nama: string; total: number }[]
  notifikasiTerbaru: Notification[]
  alertOverBudget: { nomorPolisi: string; total: number; anggaran: number }[]
  alertTerlambat: { nomorPolisi: string; estimasi: string; hariTerlambat: number }[]
  progressPerbaikan: Service[]
}

export interface BudgetValidation {
  level: BudgetLevel
  message: string
  anggaranTotal: number
  anggaranTerpakai: number
  prediksiSetelahService: number
  sisaAnggaran: number
  kekuranganDana: number
  canSave: boolean
}
