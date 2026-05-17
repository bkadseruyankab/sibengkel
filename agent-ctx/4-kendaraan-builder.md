---
Task ID: 4
Agent: Kendaraan Builder
Task: Build Kendaraan CRUD page and API routes

Work Log:
- Reviewed existing project structure, Prisma schema, types, and UI components
- Set up QueryClient provider (TanStack Query) in layout.tsx
- Created uploads directory for document storage
- Built Vehicle API Routes:
  - GET /api/kendaraan - List with pagination (page, limit), search (nomorPolisi, namaPengguna, merk), filter (jenisKendaraan, statusKendaraan, skpdBidang)
  - POST /api/kendaraan - Create with validation (unique nomorPolisi check)
  - GET /api/kendaraan/[id] - Detail with services, documents, budgets, totalBiayaService
  - PUT /api/kendaraan/[id] - Update with nomorPolisi uniqueness check
  - DELETE /api/kendaraan/[id] - Soft delete (isActive = false)
- Built Vehicle Document API Routes:
  - GET /api/kendaraan/[id]/documents - List documents for a vehicle
  - POST /api/kendaraan/[id]/documents - Upload document (multipart form data, saves to public/uploads/documents/)
  - DELETE /api/kendaraan/[id]/documents/[docId] - Delete document (removes file from disk and DB)
- Built KendaraanPage component with:
  - Header with vehicle count badge and "Tambah Kendaraan" button
  - Search input with debounce (400ms)
  - Filter dropdowns: Jenis Kendaraan, Status, SKPD/Bidang
  - Data table with TanStack Table (sortable columns, pagination, row click to detail)
  - Columns: No, Nomor Polisi, Nama Pengguna, SKPD/Bidang, Jenis, Merk/Type, Tahun, Status, Kondisi, KM, Aksi
  - Status badges (AKTIF=green, NONAKTIF=gray, RUSAK=red)
  - Kondisi badges (BAIK=green, KURANG_BAIK=yellow, RUSAK=red)
  - Add/Edit Dialog with react-hook-form + zod validation
  - Detail Sheet with tabs (Informasi, Dokumen, Service)
  - Document upload/download/delete in detail view
  - Delete confirmation AlertDialog
  - Pagination with page size selector
  - Responsive design
- Created seed data (10 vehicles, 2 workshops, 5 services)
- Created stub pages for other modules (dashboard, service, anggaran, etc.)
- Fixed overwritten kendaraan API route (restored paginated format)
- Verified all API endpoints work correctly via curl

Stage Summary:
- Complete Kendaraan CRUD module with API routes and frontend component
- API returns paginated format: { data, total, page, totalPages }
- Frontend uses TanStack Table, TanStack Query, react-hook-form + zod
- Document upload/download functionality implemented
- 18 vehicles seeded in database for testing
