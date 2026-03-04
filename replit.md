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
- **Feb 2026**: TSC values converted to IQD (×1000), calculation logic compares invoice IQD vs TSC IQD
- **Feb 2026**: Added Iraqi Customs logo to sidebar header and home page
- **Feb 2026**: Added goods category system with 19 predefined Iraqi tariff categories (food 5%, industrial 15%, consumer 30%, luxury 40-80%, tobacco/alcohol 100-150%)
- **Feb 2026**: Added additional taxes: sales tax (5%), municipal tax (2%) on (customs_value + duty)
- **Feb 2026**: Added product protection rate (p) per item: duty = V × (t + p)
- **Feb 2026**: Added "previously paid" input and "difference due" calculation (total - paid)
- **Feb 2026**: Removed reconstruction tax (was 3% luxury only)
- **Feb 2026**: Updated checkpoint data with 6 fee types each (SONAR, XRAY, WEIGHING, STAMP, PERMIT, DOCS)
- **Feb 2026**: Checkpoints now re-seed on every startup to keep data fresh
- **Feb 2026**: Added manifest upload page (`/manifest`) with AI-powered image extraction using OpenAI GPT-4o Vision
- **Feb 2026**: Manifest page: drag-and-drop image upload, extracts HS codes/descriptions/quantities/values from customs documents
- **Feb 2026**: Manifest extracted items can be selected and sent to calculator page via URL parameter
- **Feb 2026**: Added paid amount input in USD (converted to IQD), Ibrahim Khalil checkpoint
- **Feb 2026**: Manifest extraction now captures checkpoint name, duty paid, tax paid, total value from documents
- **Feb 2026**: Manifest → Calculator auto-fills checkpoint (Arabic name mapping), paid amount, and all items
- **Feb 2026**: Added per-item duty difference: each product shows its own duty/tax breakdown, paid amount, and difference
- **Feb 2026**: Calculator results show per-item "فرق المنتج" (item difference) with color coding (red=underpaid, green=overpaid)
- **Feb 2026**: Added "منفذ دهوك" checkpoint with 6 fee types (total 120,000 IQD)
- **Feb 2026**: Copy summary includes per-item breakdowns and differences
- **Feb 2026**: Major manifest reading upgrade: comprehensive AI prompt with Iraqi customs document structure knowledge, Arabic-Indic numeral handling, handwritten text support
- **Feb 2026**: Manifest now extracts 10+ metadata fields: declaration number, date, importer, origin country, currency, FX rate, packages, transport method, container number
- **Feb 2026**: Multi-image manifest upload (up to 5 pages) with thumbnail previews and per-image removal
- **Feb 2026**: HS code auto-validation against TSC database after extraction with visual indicators
- **Feb 2026**: Professional manifest UI with editable items table, document metadata grid, financial summary cards
- **Feb 2026**: AI auto-classifies goods into 23 Iraqi tariff categories (food, industrial, consumer, luxury, etc.)
- **Feb 2026**: Calculator now accepts goods_category directly from manifest extraction
- **Feb 2026**: Added discount rate (نسبة التخفيض) — default 25%, configurable. DutyAfterDiscount = DutyBefore × (1 - discount%)
- **Feb 2026**: New tax base formula: TaxBase = CustomsValue + DutyAfterDiscount (sales 5% + municipal 2% on this base)
- **Feb 2026**: Separated paid inputs: "رسوم جمركية مدفوعة" + "ضرائب مدفوعة" (both in USD)
- **Feb 2026**: Calculator results show فرق الجمرك (duty diff) and فرق الإجمالي (total diff) in both IQD and USD
- **Feb 2026**: Removed old asycuda_discount checkbox, replaced with configurable discount rate field
- **Feb 2026**: CIF valuation rule: if CIF < GDS_MIN → raise to reference minimum; if CIF > GDS_MAX → flag for audit; Duty = CIF × tariff rate
- **Feb 2026**: Per-item valuation_flag (normal/raised/audit) with color-coded badges, GDS min/max display, strikethrough on raised invoice values
- **Feb 2026**: Integrated Iraqi Customs Tariff Law No. 22/2010 — extracted 2,200 HS code duty rates from official PDF, added `duty_rate` column to products table
- **Feb 2026**: All 10,488 products now have duty_rate populated: 8-digit HS lookup → 6-digit fallback → chapter-level default → 20% (Article 2 fallback)
- **Feb 2026**: Calculator auto-fills duty rate from law when product is selected (no longer defaults to category rate)
- **Feb 2026**: Duty rate field always visible per item, labeled "نسبة الرسم (قانون 22)", editable for override
- **Feb 2026**: Search page shows duty rate column in products table and in product detail card
- **Feb 2026**: Goods category change no longer overrides the law-based duty rate (only updates tax deposit rate)
- **Mar 2026**: Integrated Council of Ministers duty reduction tables (جداول تقليص فئات الرسوم الكمركية) — consolidated chapter-level rates supersede Law 22 per-item rates
- **Mar 2026**: All 10,488 products updated: 4 rate tiers (5% gems, 10% food/chemicals/metals, 15% textiles/wood/vehicles, 30% alcohol/tobacco/electronics/weapons/antiques)
- **Mar 2026**: Duty rates auto-refresh on every startup from tariff_law22_2010.json
- **Mar 2026**: Removed checkpoint selector — calculator is now general (no specific checkpoint required)
- **Mar 2026**: Removed from results: checkpoint fees, duty-before-discount, municipal tax (2%), tax deposit (أمانة ضريبية)
- **Mar 2026**: All calculations now in USD; final IQD conversion shown only on totals
- **Mar 2026**: Simplified formula: Duty = CIF × rate × (1 - discount); no sales tax/municipal/tax deposit/checkpoint fees
- **Mar 2026**: Added supplementary product data from tariff_clean (5,632 items) and summary_products_full (5,632 items with Arabic product names)
- **Mar 2026**: Database expanded from 10,488 to 32,240 products with 2,251 unique HS codes (was 2,060)

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
