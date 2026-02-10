# Overview

This is an **Iraqi Customs Duty Difference Calculator** (حاسبة فرق الرسم الكمركي) — a full-stack web application for calculating customs duties and fees at Iraqi checkpoints. Users can search a product database by HS code or description, view product valuation data, and calculate duty differences. The app is built as an Arabic RTL interface with dark mode enabled by default.

## User Preferences

Preferred communication style: Simple, everyday language (Arabic).

## Recent Changes

- **Feb 2026**: Built multi-page app with login, about, and product search pages
- **Feb 2026**: Added session-based authentication (express-session + bcryptjs + connect-pg-simple)
- **Feb 2026**: Re-extracted TSC PDF data achieving 10,488 products (from 9,434 previously)
- **Feb 2026**: Added right-side sidebar navigation using shadcn Sidebar component
- **Feb 2026**: Added dashboard home page with stats, navigation cards, checkpoints list
- **Feb 2026**: HS code links navigate to calculator with product pre-filled
- **Feb 2026**: Product detail card has "أضف للحاسبة" button
- **Feb 2026**: Calculator shows inline TSC reference values (min/avg/max) per item
- **Feb 2026**: Calculator results have copy summary and reset buttons

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query v5
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, dark mode forced on
- **Build Tool**: Vite with React plugin
- **Language/Direction**: Arabic (RTL), set via `<html lang="ar" dir="rtl">`
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Pages
- `/` — Dashboard home page with stats, quick navigation cards, checkpoints list, how-it-works guide
- `/login` — Login/Register page with username/password form (shadcn Form + Zod validation)
- `/search` — Product browsing with paginated table (50/page), search by HS code or description, product detail card with "أضف للحاسبة" button, HS code links to calculator
- `/calculator` — Customs duty calculator with checkpoint/FX selection, product items with inline TSC values, copy summary and reset buttons
- `/about` — System information, database stats, calculation methodology
- Navigation via right-side Sidebar (AppSidebar component)

### Backend
- **Framework**: Express 5 (TypeScript, ESM)
- **Runtime**: Node.js via tsx in development, esbuild-bundled CJS in production
- **Authentication**: express-session with connect-pg-simple store, bcryptjs for password hashing
- **API Pattern**: REST endpoints under `/api/` prefix
- **Key Endpoints**:
  - `GET /api/health` — health check
  - `GET /api/checkpoints` — list checkpoints with their fees
  - `GET /api/search?q=...&limit=...` — search products by HS code or description
  - `GET /api/hs/:hs_code` — get products by specific HS code
  - `POST /api/calculate` — compute customs duties for items at a checkpoint
  - `GET /api/stats` — database statistics
  - `POST /api/auth/register` — create new user
  - `POST /api/auth/login` — login
  - `POST /api/auth/logout` — logout
  - `GET /api/auth/me` — get current user session
- **Request Validation**: Zod schemas for all request bodies
- **Dev Server**: Vite dev server middleware served through Express (HMR via `server/vite.ts`)

### Database
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema** (in `shared/schema.ts`):
  - `users` — user table (id UUID, username, password hashed)
  - `checkpoints` — customs checkpoint locations (id, name)
  - `checkpoint_fees` — fees associated with each checkpoint
  - `products` — product/tariff data (HS code, CST code, description, unit, min/avg/max values)
  - `session` — express-session table (auto-created by connect-pg-simple)
- **Seeding**: `server/seed.ts` loads product data from `attached_assets/TSC_2025-10-13_full.json` (10,488 products)

### Key Files
- `client/src/App.tsx` — Main app with SidebarProvider, routing
- `client/src/components/app-sidebar.tsx` — Right-side navigation sidebar
- `client/src/hooks/use-auth.ts` — Authentication hook (login/register/logout)
- `client/src/pages/login.tsx` — Login/Register page
- `client/src/pages/search.tsx` — Product search page
- `client/src/pages/about.tsx` — About/Info page
- `server/index.ts` — Express server with session middleware
- `server/routes.ts` — All API routes including auth
- `server/storage.ts` — Database storage interface (IStorage + DatabaseStorage)
- `server/seed.ts` — Database seeding logic

### Build Process
- **Development**: `npm run dev` runs tsx with the Express server + Vite middleware
- **Production Build**: `npm run build` → builds client with Vite + bundles server with esbuild
- **Production Start**: `npm start` runs `node dist/index.cjs`

## External Dependencies

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** — Database ORM and migration tooling
- **express** v5 — HTTP server
- **express-session** + **connect-pg-simple** — Session management with PostgreSQL store
- **bcryptjs** — Password hashing
- **zod** — Runtime validation
- **@tanstack/react-query** — Client-side data fetching/caching
- **wouter** — Client-side routing
- **shadcn/ui** components (Radix UI primitives + Tailwind)
- **lucide-react** — Icons

### Reference Data
- `attached_assets/TSC_2025-10-13_full.json` — 10,488 product entries extracted from TSC PDF
- `attached_assets/iraq_customs_extracted/` — Original Python prototype and legacy data
