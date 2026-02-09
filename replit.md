# Overview

This is an **Iraqi Internal Customs Calculator** (حاسبة كمركية عراقية) — a full-stack web application for calculating customs duties and fees at Iraqi checkpoints. Users can search a product database by HS code or description, add items to a calculation, select a checkpoint, and compute total customs fees including duty, TSC (tariff schedule) values, and checkpoint-specific fees. The app is built as an Arabic RTL interface with dark mode enabled by default.

The project was ported from a Python FastAPI + SQLite prototype (still present in `attached_assets/iraq_customs_extracted/`) to a Node.js/Express + PostgreSQL + React stack.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query v5
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, dark mode forced on via `document.documentElement.classList.add("dark")`
- **Build Tool**: Vite with React plugin
- **Language/Direction**: Arabic (RTL), set via `<html lang="ar" dir="rtl">`
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

The frontend is a single-page app with one main page (`Home`) that contains search, item management, settings (checkpoint selection, FX rate), and calculation results. The `apiRequest` helper in `client/src/lib/queryClient.ts` handles all API calls.

### Backend
- **Framework**: Express 5 (TypeScript, ESM)
- **Runtime**: Node.js via tsx in development, esbuild-bundled CJS in production
- **API Pattern**: REST endpoints under `/api/` prefix
- **Key Endpoints**:
  - `GET /api/health` — health check
  - `GET /api/checkpoints` — list checkpoints with their fees
  - `GET /api/search?q=...&limit=...` — search products by HS code or description
  - `POST /api/calculate` — compute customs duties for a list of items at a given checkpoint
  - `GET /api/stats` — database statistics
- **Request Validation**: Zod schemas for calculation requests
- **Dev Server**: Vite dev server middleware served through Express (HMR via `server/vite.ts`)
- **Production**: Static files served from `dist/public` via `server/static.ts`

### Database
- **Database**: PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema** (in `shared/schema.ts`):
  - `users` — basic user table (id UUID, username, password)
  - `checkpoints` — customs checkpoint locations (id, name)
  - `checkpoint_fees` — fees associated with each checkpoint (code, label, amount in IQD)
  - `products` — product/tariff data (HS code, CST code, description, unit, min/avg/max values, currency, source page)
  - Products table has indexes on `hs_code` and uses text search on `description`
- **Migrations**: Drizzle Kit with `drizzle-kit push` command (`npm run db:push`)
- **Seeding**: `server/seed.ts` loads checkpoint data and product data from JSON files (particularly `attached_assets/iraq_customs_extracted/data/TSC_2025-10-13.json` with ~992 product rows)

### Build Process
- **Development**: `npm run dev` runs tsx with the Express server + Vite middleware
- **Production Build**: `npm run build` runs `script/build.ts` which:
  1. Builds the client with Vite (output to `dist/public`)
  2. Bundles the server with esbuild (output to `dist/index.cjs`), externalizing most deps except an allowlist
- **Production Start**: `npm start` runs `node dist/index.cjs`

### Shared Code
The `shared/` directory contains the Drizzle schema and Zod types used by both frontend and backend, ensuring type safety across the stack.

## External Dependencies

### Database
- **PostgreSQL** — Required. Connection string must be provided via `DATABASE_URL` environment variable. Used with `pg` (node-postgres) driver and Drizzle ORM.
- **connect-pg-simple** — Session store (listed in dependencies, may be used for future session management)

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** — Database ORM and migration tooling
- **express** v5 — HTTP server
- **zod** — Runtime validation
- **@tanstack/react-query** — Client-side data fetching/caching
- **wouter** — Client-side routing
- **shadcn/ui** components (Radix UI primitives + Tailwind)
- **lucide-react** — Icons
- **recharts** — Charting library (available via chart component)
- **date-fns** — Date utilities

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` — Error overlay in development
- `@replit/vite-plugin-cartographer` — Dev tooling (conditionally loaded)
- `@replit/vite-plugin-dev-banner` — Dev banner (conditionally loaded)

### Reference Data
- `attached_assets/iraq_customs_extracted/` — Contains the original Python prototype and the TSC JSON data file used for seeding the products database. This data represents Iraqi customs tariff schedule entries with HS codes, descriptions, and min/avg/max valuation data.