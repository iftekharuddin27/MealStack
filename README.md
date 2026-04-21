# MealStack — Zero-Waste Kitchen Engine

> Manage your kitchen inventory, match recipes to exactly what you have, and eliminate food waste. Built as a CSE488 (Big Data Analytics) capstone portfolio project.

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
1. Build a `Map<ingredientName, baseQuantity>` from the user's inventory in O(N)
2. For each recipe, check that every ingredient's required base quantity ≤ available base quantity
3. Return matched (cookable) and unmatched (with per-ingredient shortfall details)

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

### 4. Auto-Deduction — `POST /api/inventory/deduct`

When a user clicks "Mark as Cooked":
1. CookModal shows a preview of remaining quantities per ingredient
2. On confirm, calls `POST /api/inventory/deduct` with `{ recipe_id }`
3. Server fetches `quantity_base` for each ingredient in the user's inventory
4. Subtracts the recipe's `quantity_base` for each ingredient
5. Writes updated `quantity` and `quantity_base` back to `user_inventory`
6. Logs entry to `cooking_history` with `money_saved` calculated from `price_per_unit × quantity_used`
7. TanStack Query invalidates `['inventory']` and `['analytics']` caches → UI re-renders

### 5. Optimistic Updates — `hooks/useInventory.ts`

Adding an item to inventory feels instant:
1. `onMutate`: immediately append the new item to the TanStack Query cache
2. Supabase `upsert` runs in the background
3. `onError`: roll back cache to the previous snapshot if the write fails
4. `onSettled`: always refetch to sync with server truth

### 6. Waste Analytics

The `cooking_history` table stores `money_saved` per cook (calculated as: sum of `ingredient.price_per_unit × quantity_base_used` for all ingredients). This powers:
- Total BDT saved in last 30 days
- Savings breakdown by food category (donut chart)
- Weekly savings trend (line chart)
- Items rescued before expiry (count from cooking near expiry dates)

---

## Database Schema

5 tables in Supabase PostgreSQL:

```
ingredients          — Master ingredient catalog (name, category, unit, price)
user_inventory       — Per-user fridge contents (linked to auth.users via RLS)
recipes              — Recipe catalog
recipe_ingredients   — Join table (recipe ↔ ingredient with quantities)
cooking_history      — Audit log of cooks, used for Waste Analytics
```

Row-Level Security (RLS) is enabled on `user_inventory` and `cooking_history` — users can only read and write their own rows.

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



### 3. Start the dev server

```bash
npm run dev
```

---

