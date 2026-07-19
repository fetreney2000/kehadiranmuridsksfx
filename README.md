# Kehadiran Murid

Sistem Pengurusan Kehadiran Murid Sekolah — a Progressive Web App for tracking daily student attendance in Malaysian schools.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| UI | shadcn/ui, Tailwind CSS |
| Tables | TanStack Table v8 |
| Data Fetching | TanStack Query v5 |
| Animation | Framer Motion v11 |
| Database | MongoDB Atlas (Free M0 tier) |
| Auth | Custom JWT (username/password) |
| QR Codes | Client-side `qrcode` + `html5-qrcode` |
| Export | ExcelJS + jsPDF (client-side) |
| PWA | manifest.json + Next.js |

## Prerequisites

- Node.js 18+
- MongoDB Atlas (free M0 cluster) — or a local MongoDB instance
- npm

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/kehadiran-murid
AUTH_SECRET=<random-64-char-string>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Generate an AUTH_SECRET:
```bash
openssl rand -base64 32
```

## Local Setup

```bash
# Install dependencies
npm install

# Seed the database with sample data
npx tsx scripts/seed.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default Test Accounts

| Peranan | Nama Pengguna | Kata Laluan |
|---|---|---|
| Pentadbir | `admin` | `admin123` |
| Guru Kelas | `guru1` | `guru123` |
| Guru Kelas | `guru2` | `guru123` |
| Guru Biasa | `guru3` | `guru123` |

## Project Structure

```
src/
  app/                  # Next.js App Router pages
    (auth)/login/       # Login page
    (dashboard)/        # All authenticated pages
      dashboard/        # Home dashboard
      kehadiran/        # Attendance (scan + toggle)
      murid/            # Student management
      kelas/            # Class management
      pengguna/         # User management
      laporan/          # Reports & exports
      qr/               # QR generation & print
      profil/           # Change password
    api/                # REST API routes
      auth/             # Login / logout / me
      users/            # User CRUD
      classes/          # Class CRUD
      students/         # Student CRUD
      attendance/       # Attendance marking + query
      reports/          # Report aggregation
  components/
    ui/                 # shadcn/ui components
    data-table.tsx      # TanStack Table wrapper
    app-sidebar.tsx     # Sidebar navigation
    providers.tsx       # QueryClient + Tooltip + Toaster
  lib/
    db/                 # MongoDB client + types
    auth/               # Session + permissions
    api/                # API route helpers
    strings/            # Bahasa Melayu strings
    utils/              # Date/time helpers (KL timezone)
    export/             # Excel + PDF export utilities
  middleware.ts          # Auth + role enforcement
```

## Features

- **Three roles**: Pentadbir, Guru Kelas, Guru Biasa — with strict RBAC
- **QR attendance**: Generate QR codes per student; scan with device camera
- **Toggle mode**: Manual attendance marking as fallback
- **Dashboard**: Today's attendance summary with per-class breakdown
- **Reports**: Daily/weekly/monthly/yearly/custom range; filterable by class
- **Excel & PDF export**: Professional reports generated client-side
- **PWA**: Installable on phones/tablets for classroom use
- **Bahasa Melayu**: All UI text in Malaysian Malay

## Deployment (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables (`MONGODB_URI`, `AUTH_SECRET`)
4. Deploy
5. Run seed script against production DB:
   ```bash
   MONGODB_URI=<production-uri> npx tsx scripts/seed.ts
   ```

## Design Decisions

- **Attendance strategy**: Only write records for students marked *hadir* (present). Absent students = class roster minus those with a hadir record. This minimises writes on the free M0 tier.
- **Client-side heavy**: QR generation, QR scanning, Excel/PDF export, table sorting/filtering/pagination all happen in the browser — never round-trip to a serverless function.
- **Bulk writes**: Attendance marking uses MongoDB `bulkWrite` with upserts to efficiently handle batches.
- **Aggregation pipelines**: Report data is pre-summarised server-side via MongoDB aggregation to minimise data transfer.
- **TanStack Query caching**: Data cached with 3-minute stale time to reduce serverless function invocations.