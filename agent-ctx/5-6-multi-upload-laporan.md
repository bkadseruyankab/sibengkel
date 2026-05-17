# Task 5 & 6 - Multi Upload Nota + Laporan Improvement Agent

## Task 5: Multi Upload Nota

### Prisma Schema Changes
- Added `fileType String?` (MIME type) and `jenisDokumen String @default("NOTA")` to ServiceDocument model
- Ran `bun run db:push` successfully

### API Changes
- **Rewrote** `src/app/api/service/[id]/documents/route.ts`:
  - Changed from JSON body to FormData (multipart/form-data)
  - Accepts `files` (multiple) and `jenisDokumen` via FormData
  - Validates file types (image/jpeg, image/png, image/jpg, application/pdf)
  - Max 5MB per file, max 10 files per request
  - Saves to `public/uploads/nota/` with `timestamp-originalname` naming
  - Added GET endpoint for listing documents
- **Created** `src/app/api/service/[id]/documents/[docId]/route.ts`:
  - DELETE: Removes file from disk and deletes DB record

### Components
- **Created** `src/components/shared/multi-upload.tsx`:
  - Drag-and-drop zone with visual feedback (highlight on drag over)
  - Click to browse files
  - Image thumbnail previews, PDF icon for non-images
  - Remove individual files before upload
  - JenisDokumen selector (NOTA, KWITANSI, FAKTUR, LAINNYA)
  - Upload progress indication
  - File size display, file type display
  - Cancel and Upload buttons
- **Updated** `src/components/service/service-page.tsx`:
  - Added Upload Nota dialog with MultiUpload component
  - Enhanced document list in detail sheet: icon, name, size, jenisDokumen badge, download/delete buttons
  - Documents section always visible with empty state
  - Upload and delete mutations with cache invalidation

### Type Changes
- Updated `ServiceDocument` interface in `src/types/index.ts` with `fileType` and `jenisDokumen`

## Task 6: Laporan Improvements

### API Changes
- **Updated** `src/app/api/laporan/route.ts`:
  - Added `budgetByType: { RODA_2: {...}, RODA_4: {...} }` with totalAnggaran, realisasi, sisaAnggaran, persentase, serviceCount, vehicleCount
  - Added `monthlyByType` for monthly Roda 2 vs Roda 4 breakdown
  - Added `sisaAnggaran` to top-level stats

### UI Changes
- **Rewrote** `src/components/laporan/laporan-page.tsx`:
  - Vehicle type filter badges (Semua/Roda 2/Roda 4) at top
  - Ringkasan Anggaran card with 3 columns: Roda 4 (amber), Roda 2 (emerald), Total
  - Added "Anggaran" tab with comparison bar chart and detail cards
  - Charts tab: Roda 2 vs Roda 4 monthly chart, status pie, monthly total, bengkel distribution
  - Jenis Kendaraan column in data table with colored badges
  - New icons: Bike, Truck, TrendingUp, Wallet

### Export Changes
- **Updated** `src/app/api/laporan/export/route.ts`:
  - CSV: Added "Jenis Kendaraan" column, budget summary rows
  - PDF: Complete redesign with kop surat (government letterhead), dual-column budget cards, QR placeholder, signature area with NIP, document numbering

## Lint Status
- 0 errors, 3 warnings (pre-existing + one false positive on lucide Image icon)
