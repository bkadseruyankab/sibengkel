# Task 5 - Service Builder Agent Context

## Task: Build Service CRUD page with spreadsheet input and budget validation API

## Key Files Created/Modified:

### API Routes
- `src/app/api/service/route.ts` - GET (list with pagination/filters) + POST (create with auto nomorService)
- `src/app/api/service/[id]/route.ts` - GET (detail) + PUT (update) + DELETE (soft delete)
- `src/app/api/service/[id]/items/route.ts` - POST (add items) + PUT (replace all) + DELETE (remove single)
- `src/app/api/service/[id]/approve/route.ts` - POST (approve/reject)
- `src/app/api/service/[id]/progress/route.ts` - PUT (update progress)
- `src/app/api/service/[id]/documents/route.ts` - POST (upload document)
- `src/app/api/anggaran/validate/route.ts` - POST (budget validation)
- `src/app/api/kendaraan/route.ts` - GET (list vehicles, was overwritten by another agent)
- `src/app/api/bengkel/route.ts` - GET (list workshops, was overwritten by another agent)

### Components
- `src/components/service/service-page.tsx` - Main service page component
  - ServicePage (main component with table, search, filters, dialogs)
  - ServiceFormDialog (add/edit with spreadsheet items + budget validation)
  - ProgressDialog (update progress with slider)
  - DeleteButton (with confirmation)

### Providers
- `src/components/providers/query-provider.tsx` - TanStack Query provider
- Updated `src/app/layout.tsx` to include QueryProvider

### Stub Pages (to prevent module-not-found errors)
- dashboard, kendaraan, anggaran, bengkel, suku-cadang, riwayat, laporan, notifikasi, pengaturan

## API Response Format Notes:
- Other agents' APIs return plain arrays (e.g., /api/bengkel, /api/kendaraan)
- My service API returns `{ data: [...], pagination: {...} }`
- Component handles both formats

## Budget Validation Logic:
- INFO: usage < 80% (canSave=true)
- WARNING: 80% <= usage < 90% (canSave=true)  
- CRITICAL: 90% <= usage < 100% (canSave=true)
- ERROR: usage >= 100% (canSave=false)

## Lint Status: Pass (0 errors, 1 warning from anggaran-page.tsx)
