# Task 2-b: Backend Agent - Anggaran jenisKendaraan Support

## Task
Update Anggaran (Budget) API routes to support separating budgets by Roda 2 and Roda 4 vehicle types.

## Files Modified

### 1. `/home/z/my-project/src/app/api/anggaran/route.ts`
**GET handler changes:**
- Added `jenisKendaraan` query parameter extraction from searchParams
- Added `where.jenisKendaraan = jenisKendaraan` filter when parameter is provided
- Added `jenisKendaraan: true` to vehicle select in findMany
- Added `jenisKendaraan: true` to summaries select query
- Added `summaryRoda2` and `summaryRoda4` separate summary objects with same structure as `summary` (totalAnggaran, totalRealisasi, totalSisaAnggaran, overBudgetCount)
- Uses `calcSummary` helper function to compute each summary

**POST handler changes:**
- Added vehicle lookup (`db.vehicle.findUnique`) before creating budget to get `jenisKendaraan`
- Returns 400 if vehicle not found
- Sets `jenisKendaraan: vehicle.jenisKendaraan` in `db.budget.create` data
- Added `jenisKendaraan: true` to vehicle select in include

### 2. `/home/z/my-project/src/app/api/anggaran/[id]/route.ts`
**GET handler:**
- No changes needed - `vehicle: true` include already returns all vehicle fields including jenisKendaraan, and budget's own jenisKendaraan field is returned by default with findUnique

**PUT handler changes:**
- Added logic to detect when `vehicleId` is changing (`vehicleId && vehicleId !== existing.vehicleId`)
- When vehicleId changes, looks up new vehicle's `jenisKendaraan` via `db.vehicle.findUnique`
- Returns 400 if new vehicle not found
- Sets `jenisKendaraan: newJenisKendaraan` in update data when vehicleId is provided

**DELETE handler:**
- No changes needed

### 3. `/home/z/my-project/src/app/api/anggaran/validate/route.ts`
**POST handler changes:**
- When no budget exists: Added vehicle lookup to get `jenisKendaraan`, included it in response as `jenisKendaraan: vehicle?.jenisKendaraan || null`
- When budget exists: Added `jenisKendaraan: budget.jenisKendaraan` to the validation response data

## Prisma Schema
The `jenisKendaraan` field was already added to the Budget model with `@default("RODA_4")`. Schema was pushed to database with `bun run db:push`.

## Lint Results
0 errors, 2 warnings (pre-existing unrelated React Hook Form warnings in kendaraan-page.tsx)
