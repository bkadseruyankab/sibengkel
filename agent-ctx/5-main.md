# Task 5 - Update Laporan Page with Photos and Settings

## Summary
Updated the laporan (report) page to include service item photos in the printed report and use dynamic settings for Kop Surat and signatures.

## Changes Made
File: `/home/z/my-project/src/components/laporan/laporan-page.tsx`

1. **printSections state** - Added `photos: true` option
2. **Settings query** - Added `useQuery` for `/api/pengaturan` to fetch app identity settings
3. **ImageIcon import** - Added from lucide-react for the photos checkbox
4. **Kop Surat** - Updated to use `settings.app_logo`, `app_kop_line1/2/3`, `app_address` with fallback defaults
5. **Signature section** - Updated to use `settings.app_kepala_nama/nip/jabatan`, `app_sekda_nama/nip` with fallbacks
6. **Photos CSS** - Added inline styles for `.photo-section`, `.photo-service-block` (page-break-inside: avoid), `.photo-grid` (4-col), `.photo-thumb img` (120x120px)
7. **Photos HTML** - Added "FOTO PERBAIKAN ITEM" section after data table, before signature
8. **Photos checkbox** - Added in print dialog with ImageIcon
9. **Mini preview** - Added photos preview section and updated Kop Surat/Signature previews to use settings
10. **Dependency array** - Added `settings` to `handlePrintReport` useCallback

## Verification
- `bun run lint`: 0 errors, 3 pre-existing warnings (unrelated to this task)
- Dev server running successfully
