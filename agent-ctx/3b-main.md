# Task 3b - Multi-upload Photo Functionality for Service Items

## Summary
Added complete multi-upload photo functionality for service items in the service detail view (DetailSheet).

## Changes Made

### 1. Types (`/src/types/index.ts`)
- Added `ServiceItemPhoto` interface with fields: id, itemId, fileName, filePath, fileSize, fileType, keterangan, uploadedAt
- Added `photos?: ServiceItemPhoto[]` to `ServiceItem` interface

### 2. Service Page (`/src/components/service/service-page.tsx`)

**New Imports:**
- `ImagePlus`, `ZoomIn` from lucide-react
- `ServiceItemPhoto` from types

**New State:**
- `itemPhotoDialogOpen` - controls photo upload dialog
- `selectedItemForPhotos` - which item is being managed
- `photoFiles` / `photoPreviews` - selected files and their preview URLs
- `photoKeterangan` - optional description for uploaded photos
- `photoViewerOpen` / `photoViewerSrc` - full-size photo viewer

**New Mutations:**
- `uploadItemPhotosMutation` - POST to `/api/service/[id]/items/[itemId]/photos`
- `deleteItemPhotoMutation` - DELETE to `/api/service/[id]/items/[itemId]/photos/[photoId]`

**New Handlers:**
- `handleOpenPhotoUpload` - opens dialog for a specific item
- `handlePhotoFileSelect` - processes file input changes
- `handleRemovePhotoFile` - removes a file from preview list
- `handleUploadPhotos` - triggers upload mutation
- `handleDeletePhoto` - triggers delete mutation

**UI Changes:**
- Items table now has "Foto" column with count badge + upload button per row
- Photo gallery section below table shows thumbnails with delete/zoom overlays
- Photo upload dialog with drag & drop, preview, keterangan
- Photo viewer dialog for full-size viewing

## Lint Result
0 errors, 3 pre-existing warnings (from other files)
