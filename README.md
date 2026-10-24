# MealStack — Zero-Waste Kitchen Engine

> Track purchase lots, match recipes against non-expired stock, and measure real consumption, donation, and waste outcomes. Built as a CSE488 (Big Data Analytics) capstone portfolio project.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS · Dark-first design |
| Components | Lucide Icons · Recharts |
| Backend | Supabase (PostgreSQL + Auth) |
| State | TanStack Query v5 (optimistic updates) |
| Fonts | DM Serif Display · Syne · DM Mono |

---

## Project Structure

```
mealstack/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar shell
│   │   ├── page.tsx                # Kitchen Status dashboard
│   │   ├── recipes/page.tsx        # Recipe Feed
│   │   ├── inventory/page.tsx      # Inventory Manager
│   │   └── analytics/page.tsx      # Waste Analytics
│   ├── api/
│   │   ├── inventory/route.ts      # GET inventory
│   │   ├── inventory/deduct/route.ts  # POST auto-deduction
│   │   └── recipes/match/route.ts  # GET subset-matched recipes
│   ├── globals.css
│   ├── layout.tsx
│   └── providers.tsx
│
├── components/
│   ├── analytics/
│   │   ├── AnalyticsStats.tsx
│   │   ├── SavingsChart.tsx        # Recharts bar chart
│   │   ├── WasteDonut.tsx          # Recharts donut chart
│   │   └── WeeklyTrend.tsx         # Recharts line chart
│   ├── inventory/
│   │   ├── ExpiryBadge.tsx         # Color-coded expiry pill
│   │   ├── InventoryForm.tsx       # Fast-entry add form
│   │   └── InventoryTable.tsx      # Full inventory list
│   ├── layout/
│   │   ├── KitchenStatus.tsx       # Dashboard client component
│   │   └── Sidebar.tsx             # Navigation sidebar
│   └── recipes/
│       ├── CookModal.tsx           # Confirm + auto-deduct
│       ├── RecipeCard.tsx          # Single recipe card
│       └── RecipeFeed.tsx          # Matched + unmatched grid
│
├── hooks/
│   ├── useInventory.ts             # TanStack Query + optimistic updates
│   ├── useRecipeMatch.ts           # Fetches recipes, runs subsetMatcher
│   └── useAnalytics.ts             # Cooking history + savings data
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   └── server.ts               # Server Supabase client (RSC)
│   ├── expiryLogic.ts              # assignExpiry(), getExpiryStatus()
│   ├── subsetMatcher.ts            # THE core algorithm
│   └── unitNormalizer.ts           # toBase(), fromBase(), formatQty()
│
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed.sql
│
├── types/index.ts                  # All shared TypeScript types
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

---

## Key Engineering Features

### 1. Subset Matcher Algorithm — `lib/subsetMatcher.ts`

The core of the application. Returns **only** recipes where **every** ingredient is present in `UserInventory` at a **sufficient, unit-normalized quantity**.

```
Complexity: O(N + R×I)
  N = inventory items  (map build — one pass)
  R = number of recipes
  I = average ingredients per recipe (constant lookup per ingredient)
```

Steps:
1. Exclude expired lots and build a dimension-aware inventory map in O(N)
2. Reject mass/volume/count mismatches before comparing quantities
3. Return cookable recipes ordered by expiry urgency and closest matches with exact shortfalls

### 2. Unit Normalization — `lib/unitNormalizer.ts`

All quantities are converted to a base unit before comparison:

| Unit | Factor | Base |
|------|--------|------|
| g    | × 1    | g    |
| kg   | × 1000 | g    |
| ml   | × 1    | ml   |
| l    | × 1000 | ml   |
| tsp  | × 5    | ml   |
| tbsp | × 15   | ml   |
| pcs  | × 1    | pcs  |

Example: User has `1kg flour`. Recipe needs `250g flour`.
- Inventory base: 1000g
- Recipe base: 250g
- Match: ✓ (1000 ≥ 250). Remaining after cook: 750g.

This normalization also happens automatically in the **database** via a PostgreSQL trigger (`trg_normalize_user_inventory`) that populates `quantity_base` on every insert/update.

### 3. Smart Expiry Logic — `lib/expiryLogic.ts`

Expiry dates are assigned automatically based on ingredient category:

| Category | Shelf Life |
|----------|-----------|
| Dairy    | 7 days    |
| Protein  | 5 days    |
| Vegetable| 3 days    |
| Grain    | 180 days  |
| Spice    | 365 days  |

Dashboard color coding:
- 🔴 **RED** — < 24 hours remaining (`critical`)
- 🟡 **AMBER** — < 48 hours remaining (`warning`)
- 🟢 **GREEN** — ≥ 48 hours remaining (`ok`)

### 4. Atomic FIFO Deduction — `POST /api/inventory/deduct`

When a user clicks "Mark as Cooked":
1. CookModal shows a preview of remaining quantities per ingredient
2. On confirm, calls `POST /api/inventory/deduct` with `{ recipe_id, servings }`
3. PostgreSQL locks every required lot and validates all non-expired quantities
4. The `cook_recipe` RPC deducts earliest-expiring lots first
5. Usage and inventory-event snapshots preserve the quantity, category, value, and expiry at cook time
6. Deduction and history insertion commit together or roll back together
7. TanStack Query invalidates inventory, cooking-history, and analytics caches

### 5. Optimistic Updates — `hooks/useInventory.ts`

Adding an item to inventory feels instant:
1. `onMutate`: immediately append the new item to the TanStack Query cache
2. A new purchase lot is inserted in the background
3. `onError`: roll back cache to the previous snapshot if the write fails
4. `onSettled`: always refetch to sync with server truth

### 6. Measured Waste Analytics

`inventory_events` records consumed, donated, discarded, and expired outcomes. An item is considered rescued only when it is consumed within 48 hours of expiry. The dashboard derives:
- At-risk ingredient value rescued
- Tracked discarded value and waste-value rate
- Donated value
- Rescued lots and category breakdowns
- Five-week outcome trends

No dashboard metric is generated from a fixed percentage or heuristic.

---

## Database Schema

The main Supabase PostgreSQL tables are:

```
ingredients          — Master ingredient catalog (name, category, unit, price)
user_inventory       — Per-user purchase lots with expiry, storage, and price data
recipes              — Recipe catalog
recipe_ingredients   — Join table (recipe ↔ ingredient with quantities)
cooking_history      — Atomic cooking audit records
cooking_ingredient_usage — Immutable per-lot cooking snapshots
inventory_events     — Consumed, donated, discarded, and expired outcomes
shopping_list        — Consolidated per-user missing ingredients
```

Row-Level Security is enabled on every exposed table. Catalog data is read-only unless the row belongs to the current user; inventory, events, history, and shopping-list rows are isolated by user.

---

## Setup & Installation

### 1. Clone and install

```bash
git clone https://github.com/your-username/mealstack.git
cd mealstack
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **Anon Key** from Project Settings → API

Create `.env.local` in the project root using `.env.example` as a template:

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL` to the Project URL and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` to the project's anon key. Restart the dev
server after changing environment variables.


### 3. Start the dev server

```bash
npm run dev
```

Apply both SQL files in `supabase/migrations/` before starting the app. Keep
`NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false` outside an explicit local demo.

### 4. Verify quality gates

```bash
npm run check
```

This runs linting, strict TypeScript checks, domain tests, and a production build.

---
