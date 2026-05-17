# Task 2 - Setup API Agent

## Task: Create Setup Wizard API at `/api/setup`

## Work Completed

### File Created
- `/src/app/api/setup/route.ts`

### GET /api/setup
- Checks `setup_completed` key in SystemSetting table
- Counts users in database
- Returns `{ needsSetup, hasUsers, hasSettings }`
- `needsSetup = true` only when no users AND no setup_completed setting exists

### POST /api/setup
- Validates required fields: appSettings object, admin object (name, email, password)
- Prevents duplicate setup: checks `setup_completed` setting (409), existing SUPER_ADMIN (409), email uniqueness (409)
- Transaction-based execution:
  1. Upserts all app settings from `appSettings` + sets `setup_completed = 'true'`
  2. Creates SUPER_ADMIN user with provided credentials (password as-is per existing pattern)
  3. Optionally creates Workshop if `bengkel.namaBengkel` provided, links admin to workshop
- No authentication required (first-time setup)
- Indonesian error messages
- Proper HTTP status codes: 400 (validation), 409 (conflict), 500 (server error)

### Lint
- 0 errors, 3 pre-existing warnings
