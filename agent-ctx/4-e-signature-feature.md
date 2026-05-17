# Task 4: E-Signature (TTE - Tanda Tangan Elektronik) Feature

## Summary
Built a complete E-Signature feature for the SIService BKAD application. Users can create, preview, update, and delete electronic signatures. Signatures automatically appear in printed documents (laporan, riwayat, service timeline) in the Kepala BKAD signature column.

## Files Created
- `src/app/api/signature/route.ts` - GET/POST for signature CRUD
- `src/app/api/signature/[id]/route.ts` - DELETE signature by ID
- `src/app/api/signature/verify/route.ts` - Verify signature by userId
- `src/components/shared/signature-pad.tsx` - Canvas-based signature drawing component
- `src/components/shared/e-signature-dialog.tsx` - Dialog wrapper for signature creation

## Files Modified
- `prisma/schema.prisma` - Added Signature model and User relation
- `src/components/pengaturan/pengaturan-page.tsx` - Added TTE management card in identitas tab
- `src/components/laporan/laporan-page.tsx` - Signature image in print templates
- `src/components/riwayat/riwayat-page.tsx` - Signature image in print template
- `src/components/service/service-page.tsx` - Signature image in print template

## Key Features
- HTML5 Canvas signature pad with touch/mouse support
- Adjustable pen color (3 options) and width (slider)
- Signature optimized to max 200px width with transparent background
- Only one active signature per user (old ones auto-deactivated)
- Kepala BKAD signature auto-detected from PIMPINAN/SUPER_ADMIN users
- Signature appears in all 3 print document types
- Full CRUD with toast notifications

## API Endpoints
- `GET /api/signature?userId=xxx` - Get active signature
- `POST /api/signature` - Save/update signature
- `DELETE /api/signature/[id]?userId=xxx` - Delete signature
- `GET /api/signature/verify?userId=xxx` - Verify and get signature metadata
