# CLAUDE.md — Hostrup Hub Agent Guide

Dette er den autoritative guide til AI-agenter der arbejder på dette projekt. Læs den inden du skriver en eneste linje kode.

---

## Projektets formål

**Hostrup Hub** er et samlet husholdningssystem for familien Hostrup. Det kombinerer:
- 🎁 **Ønskebrønden** — delt ønskeseddel med cooldown, ratings og reality-check
- 📊 **Cockpit** — forbrugsanalyse med AI-rådgivning (Gemini 2.5 Flash)
- 🏦 **Bankimport** — CSV-import med MD5-deduplication, mapping-regler og kategori-forslag
- 📅 **Ugeplan** — (kommer i Sprint 7) madplan, fremmøde og gæster

Kører som Docker-container bag Nginx + Authelia på `wishbuy.hostrup.org`. Navn og URL skifter til `hub.hostrup.org` i Sprint 8.

---

## Teknologistack

| Lag | Teknologi |
|---|---|
| Frontend + API | SvelteKit (Vite/Node.js), Svelte 5 |
| Database | PostgreSQL |
| ORM | Prisma (`prisma/schema.prisma`) |
| AI-rådgivning | `@google/generative-ai` — Gemini 2.5 Flash |
| Styling | Tailwind CSS v4 |
| Deployment | Docker + `deploy.sh` |

---

## Arkitektur & Dataflow

```
Browser
  │
  ├── /                          → Landing page (tile-menu)
  ├── /dashboard/wishes          → Ønskebrønden
  ├── /dashboard/finance         → Cockpit / finansoverblik
  └── /dashboard/import          → Bankimport (CSV)
                                        │
                                        ▼
                                 PostgreSQL (Prisma)
                                        │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
                  SvelteKit SSR              Gemini 2.5 Flash
                  (+page.server.ts)          (AI-rådgivning i finance)
```

### Authentication

Authelia proxyer alle requests og injecter `Remote-User`-headeren (konfigurerbar via `AUTH_HEADER` env). Der er **ingen session-management i applikationen** — brugeren bestemmes udelukkende af denne header. Mangler headeren i dev, bruges fallback til første bruger i databasen.

---

## Kritiske arkitekturregler

### 1. Brug altid Prisma — aldrig rå SQL

```typescript
// ✅ Korrekt
import { prisma } from '$lib/server/prisma';
const items = await prisma.item.findMany({ where: { userId } });

// ❌ Forbudt
import { db } from '$lib/db';
db.query('SELECT * FROM items'); // Brug aldrig rå SQL-queries
```

### 2. Server-actions og load-funktioner er ad-hoc — ingen service-lag

Dette projekt bruger SvelteKit's `+page.server.ts` direkte. Der er **ikke** et separat service-lag eller repository-mønster (i modsætning til workout-projektet). Forretningslogik hører direkte i `load`-funktionerne og `actions`.

### 3. TypeScript — ingen `any`

Svelte-check og lint fanger `any`-typer. Brug `unknown` som fallback. I ApexCharts-konfigurationer er `any` kun acceptabelt i event-handlers med eksplicit kommentar.

### 4. Svelte 5 — brug $state, $derived, $effect korrekt

- `$derived`-værdier må **aldrig** direkte muteres (returnerer en read-only binding)
- Brug `$effect` til side-effekter der reagerer på state-ændringer
- Brug `$state` til alt lokalt mutable state
- Chart-options der afhænger af `isDarkMode` skal være `$derived` og re-renderes via `{#key isDarkMode}`

```typescript
// ✅ Korrekt — chart gendannes ved tema-skift
{#key isDarkMode}
  <div use:chart={chartOptions}></div>
{/key}

// ❌ Forkert — mutation af $derived i onMount
onMount(() => {
  chartOptions.theme.mode = isDarkMode ? 'dark' : 'light'; // Virker ikke
});
```

### 5. Tema-system — ALDRIG hardkodede hex-farver

`layout.css` definerer det centrale 2026-design-system via `@theme`. Det overstyrer Tailwind's built-in farver:
- `slate-*` → Deep Forest Surface-palette
- `indigo-*` → Electric Indigo (#6c5ce7)
- `rose-*` → Editorial Pink
- **`amber-*` er omkortet til pink** — brug IKKE amber til varme/orange-farver

Alle farvehenvisninger skal bruge Tailwind-klasser, **aldrig** hardkodede hex-værdier — undtagen i inline `style`-attributter hvor Tailwind ikke kan nå, og der skal bruges CSS custom properties:

```html
<!-- ✅ Korrekt -->
<div class="bg-indigo-500 text-rose-400"></div>

<!-- ✅ Korrekt til inline style -->
<div style="background: conic-gradient(var(--color-indigo-500) 0% {pct}%, var(--color-slate-200) {pct}% 100%)"></div>

<!-- ❌ Forbudt -->
<div style="background: conic-gradient(#6366f1 0% {pct}%, #cbd5e1 {pct}% 100%)"></div>
```

For ApexCharts — brug CSS custom properties hentet via `getComputedStyle`:
```typescript
const root = document.documentElement;
const indigoColor = getComputedStyle(root).getPropertyValue('--color-indigo-500').trim();
```

### 6. Kortstruktur — ét ensartet designsprog

Alle dashboardkort bruger **glassmorphism**-mønsteret:
```html
<div class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80">
```

Brug **ikke** tunge shadows (`shadow-2xl`) på almindelige kort — reserver dem til modaler og flydende elementer.

### 7. Mørk baggrund — brug temafarver, ikke custom hex

```html
<!-- ✅ Korrekt — bruger tema -->
<div class="dark:bg-slate-950">

<!-- ❌ Forbudt — omgår temaet -->
<div class="dark:bg-[#0b1120]">
```

---

## Design-system oversigt (2026-palette)

| Token | Tailwind-klasse | Brug |
|---|---|---|
| Deep Forest Surface | `slate-50` / `slate-950` | Sidebaggr. lys/mørk |
| Deep Forest Card | `slate-100` / `slate-900` | Kort-baggr. lys/mørk |
| Electric Indigo | `indigo-500` (#6c5ce7) | Primær accent, CTA-knapper |
| Editorial Pink | `rose-500` (#e8879e) | Sekundær accent, ego-items |
| Fælles/Shared | `violet-500` | Shared expense type |
| Success | `emerald-500` | Positive tal, købt-status |
| Gradient heading | `from-indigo-600 to-indigo-400` | Alle sideoverskrifter |

Dark mode aktiveres ved `.dark`-klasse på `<html>`. Toggle-knappen i `+layout.svelte` styrer dette via `localStorage`.

---

## Databaseschema (nøgletabeller)

| Tabel | Indhold |
|---|---|
| `User` | Brugere (username, displayName, emoji) |
| `Item` | Ønsker og køb (title, price, expenseType, status, desireLevel) |
| `Category` | Ønskekategorier (til Item) |
| `Rating` | Thumbs up/down pr. bruger pr. Item |
| `AiInsight` | Gemte AI-analyser pr. bruger og periode |
| `Account` | Bankkonti til import |
| `Transaction` | Bankposteringer (hash, date, text, amount, paidBy, ...) |
| `TransactionCategory` | Udgiftskategorier (til Transaction) |
| `MappingRule` | Keyword → kategori auto-mapping ved import |

`Item.expenseType` er enten `PERSONAL` eller `SHARED`. `Item.status` er `WISH`, `PURCHASED` eller `ABANDONED`.

`Transaction.isIgnored = true` fjerner posteringen fra alle udregninger uden at slette den.

---

## Deployment

```bash
./deploy.sh "Din commit-besked"
```

Scriptet kører i rækkefølge og stopper ved første fejl:
1. `npm run lint` — ingen lint-fejl tilladt
2. `npx prisma generate` — opdaterer Prisma Client
3. `npx prisma db push` — synkroniserer schema til PostgreSQL
4. `npm run build` — verificerer produktionskompilering
5. Git commit + push
6. Docker rebuild + container verify

**Deploy ALDRIG med `--no-verify` eller ved at springe build/lint over.**

---

## Nøglefiler

| Fil | Rolle |
|---|---|
| `src/routes/layout.css` | Centralt tema (Tailwind @theme, 2026-palette) |
| `src/routes/+layout.svelte` | Root layout, dark mode toggle |
| `src/routes/+page.svelte` | Landing page (tile-menu) |
| `src/routes/dashboard/wishes/+page.svelte` | Ønskebrønden UI |
| `src/routes/dashboard/wishes/+page.server.ts` | Brønd load + actions |
| `src/routes/dashboard/finance/+page.svelte` | Cockpit UI (ApexCharts) |
| `src/routes/dashboard/finance/+page.server.ts` | Finance load + AI actions |
| `src/routes/dashboard/import/+page.svelte` | Import UI |
| `src/routes/dashboard/import/+page.server.ts` | CSV parse + DB actions |
| `src/lib/server/` | Server-only hjælpefunktioner |
| `prisma/schema.prisma` | Database-schema |
| `deploy.sh` | Deploy-script |

---

## Hvad du IKKE må gøre

- Oprette filer uden for `/hostrup/docker/projects/wishbuy/`
- Bruge hardkodede hex-farver i Tailwind-klasser eller inline styles — brug CSS custom properties (`var(--color-*)`)
- Bruge `amber-*` til orange/varme farver — amber er omkortet til pink i temaet
- Direkte mutere `$derived`-værdier i Svelte 5
- Bruge `dark:bg-[#xxxxxx]` til side-baggrunde — brug tema-klasser
- Deploye uden at `npm run build` og `npm run lint` passerer
- Tilføje abstraktion eller features der ikke er eksplicit efterspurgt
- Skrive kommentarer der beskriver HVAD koden gør — kun kommentarer der forklarer HVORFOR

---

## Vigtige konventioner

- **Dansk brugervendt tekst**: Al UI-tekst, fejlbeskeder og labels er på dansk
- **Engelske kodeidentifiers**: Variabelnavne, funktioner og Prisma-modeller er på engelsk
- **Ingen kommentarer der beskriver koden** — kun usynlige invarianter og workarounds
- **Ryd op efter dig selv**: Ingen debug-logs i koden, ingen midlertidige filer
