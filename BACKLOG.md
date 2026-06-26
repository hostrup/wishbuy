# 📋 Backlog — Hostrup Hub

Konsolidering af `wishbuy`, `wishbuy_analytics` og `ugeplan` til ét samlet husholdningssystem.

Sprint 1-3 (hardening, Python-oprydning, bankimport) er gennemført — commit `aaec1ef`, 25. juni 2026.
Sprint 4 (navngivning + velkomstside) er gennemført — commit `70fe8f4`, 26. juni 2026.

---

## ✅ Sprint 0: Tema-kritiske fejl — GENNEMFØRT

Alle seks tema-fejl identificeret 26. juni 2026 er udbedret og verificeret med `npm run lint && npm run build`.

---

### TEMA-0.1: Hardkodede hex-farver i ApexCharts omgår temaet

**Fil:** `src/routes/dashboard/finance/+page.svelte`

**Problem:** Alle fire chart-konfigurationer (`donutOptions`, `barOptions`, `cumulativeOptions`, `dayOfWeekOptions`) er `$derived`-værdier der bruger rå hex-farver. Disse opdateres aldrig baseret på temaet:

```typescript
// barOptions linje ~87:
colors: ['#6366f1']; // standard Tailwind indigo — burde være Electric Indigo #6c5ce7

// cumulativeOptions linje ~119:
colors: ['#10b981']; // hardkodet emerald

// dayOfWeekOptions linje ~143:
colors: ['#f43f5e']; // hardkodet rose/red

// donutOptions linje ~64:
stroke: {
	colors: [isDarkMode ? '#1e293b' : '#ffffff'];
}

// barOptions + cumulativeOptions grid:
grid: {
	borderColor: isDarkMode ? '#334155' : '#e2e8f0';
}
```

**Fix:** Tilføj en `getCssVar`-hjælper øverst i `<script>`-blokken (kræver at den kaldes fra `onMount` eller `$effect`, da `document` ikke er tilgængeligt under SSR):

```typescript
// Hjælper — kald kun client-side
function getCssVar(name: string): string {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
```

Opdatér chart-configs til at bruge den. Da configs er `$derived` fra `isDarkMode`, er det nok at kalde `getCssVar` inde i `$derived`-blokkene — de genevalueres automatisk når `isDarkMode` skifter. Eksempel for `barOptions`:

```typescript
let barOptions = $derived({
	// ...
	colors: [getCssVar('--color-indigo-500')],
	grid: {
		borderColor: isDarkMode ? getCssVar('--color-slate-700') : getCssVar('--color-slate-200'),
		strokeDashArray: 4
	},
	theme: { mode: isDarkMode ? 'dark' : 'light' }
});
```

Gør tilsvarende for alle fire chart-configs. For `donutOptions.stroke.colors` brug `getCssVar('--color-slate-800')` i mørk og `'#ffffff'` i lys (hvid separator er korrekt her).

**Acceptkriterier:**

- [x] Ingen hex-literals (bortset fra `'#ffffff'` og `'transparent'`) i chart-configs
- [x] Charts skifter farve korrekt ved tema-toggle
- [x] `npm run lint` passerer (ingen `any`-typer indført)

- **Prioritet:** 🔴 Høj
- **Kompleksitet:** Lav

---

### TEMA-0.2: Inline conic-gradient i Wishes omgår temaet

**Fil:** `src/routes/dashboard/wishes/+page.svelte`

**Problem:** Tre KPI-donut-kort bruger inline `style`-attributter med hardkodede hex. Tailwind kan ikke nå inline styles, så disse ignorerer temaet fuldstændigt:

```html
<!-- "Økonomisk Tyngde" kort, ca. linje 496 -->
style="background: conic-gradient(#6366f1 0% {wishVsBuyPct}%, #cbd5e1 {wishVsBuyPct}% 100%)"

<!-- "Drømme-fordeling" kort, ca. linje 523 -->
style="background: conic-gradient(#8b5cf6 0% {sharedPct}%, #f43f5e {sharedPct}% 100%)"

<!-- "Forbrugs-fordeling" kort, ca. linje 549 -->
style="background: conic-gradient(#10b981 0% {buySharedPct}%, #f59e0b {buySharedPct}% 100%)"
```

**Fix:** Erstat hex med `var(--color-*)` CSS custom properties. Korrekte farvevalg per kort:

```html
<!-- Drømme vs. Købt -->
style="background: conic-gradient(var(--color-indigo-500) 0% {wishVsBuyPct}%, var(--color-slate-300)
{wishVsBuyPct}% 100%)"

<!-- Fælles vs. Ego (drømme) -->
style="background: conic-gradient(var(--color-violet-500) 0% {sharedPct}%, var(--color-rose-500)
{sharedPct}% 100%)"

<!-- Fælles vs. Ego (forbrug) -->
style="background: conic-gradient(var(--color-emerald-500) 0% {buySharedPct}%, var(--color-rose-400)
{buySharedPct}% 100%)"
```

Bemærk: `#f59e0b` (amber/orange) må **ikke** erstattes med `var(--color-amber-500)` da amber er remappet til pink i temaet — brug `rose-400` eller `rose-500`.

**Acceptkriterier:**

- [x] Alle tre conic-gradient-kort bruger CSS custom properties
- [x] Ingen hex-literals i `style`-attributter i filen
- [x] Kortene ser korrekte ud i lys OG mørk tilstand

- **Prioritet:** 🔴 Høj
- **Kompleksitet:** Meget lav

---

### TEMA-0.3: To sider bruger hardkodet mørk baggrund `bg-[#0b1120]`

**Filer:**

- `src/routes/dashboard/finance/+page.svelte` ca. linje 369: `dark:bg-[#0b1120]`
- `src/routes/dashboard/import/+page.svelte` ca. linje 89: `dark:bg-[#0b1120]`

**Problem:** Finance og Import har hardkodet mørk sidebaggr. der omgår temaet. Wishes bruger `dark:bg-slate-900` (tema-klasse). Tre sider, tre visuelt forskellige mørke baggrunde.

**Fix:** Find og erstat `dark:bg-[#0b1120]` → `dark:bg-slate-950` i begge filer.

`slate-950` er defineret som `#080c08` i `layout.css` — det mørkeste trin i Deep Forest-paletten. Det er tættere på den tilsigtede feel end `slate-900` (`#0d110d`). Opdatér ligeledes Wishes fra `dark:bg-slate-900` til `dark:bg-slate-950` for fuld konsistens.

**Acceptkriterier:**

- [x] Alle tre dashboard-sider bruger `dark:bg-slate-950` som sidebaggr.
- [x] Ingen `bg-[#...]`-literals på rod-`<div>`-elementerne

- **Prioritet:** 🔴 Høj
- **Kompleksitet:** Meget lav

---

### TEMA-0.4: Svelte 5 `$derived`-mutation i Finance tema-opdatering

**Fil:** `src/routes/dashboard/finance/+page.svelte` ca. linje 248–273

**Problem:** `onMount` bruger en `MutationObserver` der forsøger at mutere `$derived`-objekter direkte:

```typescript
// Dette virker IKKE i Svelte 5 — $derived kan ikke muteres:
donutOptions.theme.mode = mode;
donutOptions.stroke.colors = [strokeColor];
barOptions.theme.mode = mode;
barOptions.grid = { borderColor: gridColor, strokeDashArray: 4 };
// osv.
```

Mutationerne overskriver kortvarigt, men ved næste reaktiv genberegning nulstilles de til de `$derived`-beregnede værdier. Chart-farver og tema-tilstand opdateres ikke korrekt ved toggle.

**Fix:** Fjern hele `onMount`-blokken med `MutationObserver`. Erstat med en `$effect` der opdaterer `isDarkMode` korrekt:

```typescript
// Erstat onMount-blokken med dette:
$effect(() => {
	// Sæt initial tilstand
	isDarkMode = document.documentElement.classList.contains('dark');

	const observer = new MutationObserver(() => {
		isDarkMode = document.documentElement.classList.contains('dark');
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['class']
	});

	return () => observer.disconnect();
});
```

Da alle chart-configs (`donutOptions`, `barOptions`, `cumulativeOptions`, `dayOfWeekOptions`) er `$derived` fra `isDarkMode`, vil de automatisk genevalueres når `isDarkMode` skifter. `{#key isDarkMode}`-wrappers på chart-elementerne sikrer at ApexCharts-instansen genudstyres.

Sørg for at `isDarkMode` er erklæret som `$state` (ikke allerede som `$state(false)` i script-toppen — tjek om den er det, og behold den erklæring som den er).

**Acceptkriterier:**

- [x] Tema-toggle opdaterer chart-farver korrekt (test manuelt i browser)
- [x] Ingen direkte mutation af `$derived`-objekter i filen
- [x] Ingen `onMount`-import hvis den ikke bruges til andet

- **Prioritet:** 🔴 Høj
- **Kompleksitet:** Lav

---

### TEMA-0.5: Amber remappet til pink — semantisk kollision

**Filer:**

- `src/routes/layout.css` linje 62–73 (amber-remapping)
- `src/routes/dashboard/finance/+page.svelte` ca. linje 402–406 (amber på nav-knap)
- `src/routes/dashboard/finance/+page.svelte` ca. linje 592–608 (amber på KPI-kort)
- `src/routes/dashboard/wishes/+page.svelte` ca. linje 916 (`text-amber-400` på stjerner)

**Problem:** `layout.css` remapper `--color-amber-500` til `#e8879e` (Editorial Pink). Men `amber-400` (`#f5b87a`) er stadig gullig-orange, så amber-skalaen er halvt orange / halvt pink. Finance bruger amber til varm-orange farver (nav-knappen til Ønsker, Top Kategori KPI) — de renderer nu pink i stedet.

**Fix (anbefalet — Option A):** Fjern hele amber-remapping-blokken fra `layout.css` (linje 62–73). Amber beholder dermed sin naturlige Tailwind-farve (gul-orange). Opdatér steder der bruger amber med _hensigten_ om pink til eksplicitte `rose-*`-klasser:

1. I `layout.css`: Slet `--color-amber-50` til `--color-amber-900`-definitionerne
2. Gennemgå alle `.svelte`-filer for `amber-`-klasser og vurdér intention:
   - Ønsker orange/varm → behold `amber-*`
   - Ønsker pink → skift til `rose-*`

På finance-siden: `amber`-nav-knappen og KPI-kortet ønsker orange/varm → `amber-*` beholdes (virker nu korrekt).
På wishes-siden: `text-amber-400` til stjerner ønsker gul/guld → `amber-*` beholdes.

**Acceptkriterier:**

- [x] `amber-*` klasser giver konsistent orange/gul farve på alle sider
- [x] Ingen steder bruger `amber` med forventning om pink
- [x] `npm run lint && npm run build` passerer

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Lav

---

### TEMA-0.6: Inkonsistent kortstruktur — glassmorphism vs. flade kort

**Filer:** `src/routes/dashboard/wishes/+page.svelte`, `src/routes/dashboard/import/+page.svelte`

**Problem:** Finance bruger gennemgående glassmorphism. Wishes og Import bruger en blanding af flade og halvt-gennemsigtige kort. Visuel inkonsistens på tværs af dashboard-sider.

**Glassmorphism-standarden (defineret i CLAUDE.md):**

```html
<!-- Standardkort -->
<div
	class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
>
	<!-- Lille/kompakt kort -->
	<div
		class="rounded-2xl border border-slate-200/50 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/80"
	></div>
</div>
```

**Hvad der skal opdateres i Wishes:**

- Sticky formular-kort (ca. linje 619): `rounded-2xl border border-slate-100 bg-white shadow-sm` → glassmorphism
- Ønske-kort i grid (ca. linje 801): `rounded-2xl border border-slate-200 bg-white shadow-sm` → glassmorphism
- Købt-kort (ca. linje 1024): `rounded-2xl border border-slate-200 bg-slate-100` → bevares som dæmpet variant: `rounded-2xl border border-slate-200/50 bg-slate-100/80 backdrop-blur-md dark:border-white/5 dark:bg-slate-700/50`
- KPI-scroll-kort (ca. linje 458–612): Blanding — harmonisér til glassmorphism

**Hvad der skal opdateres i Import:**

- Gennemgå alle kort og opdatér til glassmorphism-standard

**Acceptkriterier:**

- [x] Wishes- og Import-sider har visuelt konsistent kortstruktur med Finance
- [x] Ingen `bg-white shadow-sm border-slate-200` på hovedniveaukort (kun glassmorphism)
- [x] `npm run build` passerer

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Medium (mange steder at opdatere)

---

## 🟠 Sprint 4: Navngivning & Velkomstside ✅ Gennemført

- App-navn: "Hostrup Hub" (`package.json` + `+layout.svelte`) ✅
- Velkomstside med tile-menu på `/` ✅
- Ønskebrønden på `/dashboard/wishes` ✅
- Navigation harmoniseret ✅

Commit: `70fe8f4`, 26. juni 2026.

---

## ✅ Sprint 5: AI Kategorisering i Import — GENNEMFØRT

### AI-5.1: `suggestCategories` server action

**Fil:** `src/routes/dashboard/import/+page.server.ts`

**Beskrivelse:** Ny SvelteKit `action` der modtager en liste af ukendte transaktioner og returnerer AI-forslag. Gemini 2.5 Flash bruges (samme som `generateInsight` i finance).

**Eksisterende mønster at følge:** Se `generateInsight`-action i `src/routes/dashboard/finance/+page.server.ts` for korrekt brug af `@google/generative-ai`.

**Input til action:** `transactionTexts` — kommasepareret streng eller JSON-array af `{ text, amount }` for transaktioner der har `categoryName === 'Ukendt'`.

**Forventet AI-output (struktureret JSON):**

```json
[
	{ "transactionText": "NETTO BROGADE", "suggestedCategory": "Dagligvarer", "keyword": "NETTO" },
	{ "transactionText": "SPOTIFY", "suggestedCategory": "Abonnementer", "keyword": "SPOTIFY" }
]
```

Brug `responseMimeType: 'application/json'` og `responseSchema` i Gemini API-kaldet.

**Fejlhåndtering:** Gemini kan time out (60s+). Returnér `{ error: 'AI-analyse tog for lang tid' }` ved timeout. Brug `AbortSignal.timeout(45000)`.

**Acceptkriterier:**

- [x] Action returnerer korrekt JSON-struktur
- [x] Kun transaktioner med `categoryName === 'Ukendt'` sendes
- [x] Timeout håndteres med brugervenlig fejlbesked
- [x] `npm run lint` passerer

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Lav-medium

---

### AI-5.2: UI-integration i import preview

**Fil:** `src/routes/dashboard/import/+page.svelte`

**Beskrivelse:** Tilføj "🤖 Kategorisér med AI"-knap i preview-trinnet. Viser AI-forslag inline i tabellen. Brugeren godkender individuelt eller samlet inden endelig gem.

**UI-flow:**

1. Knap vises kun i `step === 'preview'` og kun hvis der er rækker med `categoryName === 'Ukendt'`
2. Klik → `isAiSuggesting = true`, knap viser spinner
3. `enhance`-form-submit til `?/suggestCategories`
4. Svar opdaterer `previewRows` med `aiSuggestedCategory`-felt per række
5. Rækker med AI-forslag markeres med `bg-indigo-50/50 dark:bg-indigo-900/10` og 🤖-ikon
6. Brugeren kan stadig override via dropdown

**State der tilføjes:**

```typescript
let isAiSuggesting = $state(false);
let aiSuggestionCount = $state(0);
```

**Acceptkriterier:**

- [x] Knap er synlig og korrekt disabled/hidden
- [x] Loading-state under AI-analyse
- [x] Forslag vises tydeligt markeret i tabellen
- [x] Bruger kan override forslag inden gem

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Medium

---

### AI-5.3: Auto-oprettelse af MappingRules ved godkendelse

**Fil:** `src/routes/dashboard/import/+page.server.ts`

**Beskrivelse:** Når brugeren gemmer import (action `saveTransactions`) og en transaktion har fået et AI-forslag, oprettes en `MappingRule` for keywordet.

**Logik i `saveTransactions`-action:**

```typescript
// For hver transaktion med aiKeyword og godkendt kategori:
if (row.aiKeyword && row.categoryId) {
	await prisma.mappingRule.upsert({
		where: { keyword: row.aiKeyword.toLowerCase() },
		update: { categoryId: row.categoryId },
		create: { keyword: row.aiKeyword.toLowerCase(), categoryId: row.categoryId }
	});
}
```

Brug `upsert` — hvis keyword allerede eksisterer med anden kategori, opdateres den (brugerens godkendelse er eksplicit).

**Acceptkriterier:**

- [x] `MappingRule` oprettes kun for transaktioner der faktisk gemmes
- [x] `upsert` bruges — ingen uniq-fejl ved duplikat keyword
- [x] `npm run lint` passerer

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Lav

---

## ✅ Sprint 6: Performance & Afvikling — GENNEMFØRT

### PERF-6.1: Database-aggregationer i Finance load

**Fil:** `src/routes/dashboard/finance/+page.server.ts`

**Problem:** KPI-beregninger (`periodExpenses`, `avgDailySpend`, top-kategori, største transaktion) sker via in-memory TypeScript-loops over alle transaktioner i perioden. For datasæt >500 transaktioner er dette langsomt.

**Fix:** Udskift in-memory aggregering med Prisma-kald:

```typescript
// Samlet forbrug:
const totalResult = await prisma.transaction.aggregate({
	where: { date: { gte: from, lte: to }, isIgnored: false },
	_sum: { amount: true }
});

// Top kategori:
const byCategory = await prisma.transaction.groupBy({
	by: ['categoryId'],
	where: { date: { gte: from, lte: to }, isIgnored: false },
	_sum: { amount: true },
	orderBy: { _sum: { amount: 'asc' } },
	take: 1
});

// Største transaktion:
const largest = await prisma.transaction.findFirst({
	where: { date: { gte: from, lte: to }, isIgnored: false, amount: { lt: 0 } },
	orderBy: { amount: 'asc' }
});
```

**Acceptkriterier:**

- [x] Ingen in-memory aggregering af KPI-data
- [x] Siden loader mærkbart hurtigere ved >200 transaktioner
- [x] `npm run build` passerer

- **Prioritet:** 🟢 Lav-medium
- **Kompleksitet:** Medium

---

### PERF-6.2: Server-side sortering og paginering i transaktionslisten

**Fil:** `src/routes/dashboard/finance/+page.server.ts` + `+page.svelte`

**Problem:** `recentTransactions` henter alle transaktioner i perioden (`findMany` uden `take`) og sorterer/filtrerer i Svelte client-side (`filteredTransactions $derived`). Dette skalerer dårligt.

**Fix:** Tilføj URL-parametre `?sort=date&dir=desc&page=1` og push sortering til Prisma `orderBy`. Implementer paginering med `take: 100, skip: (page-1)*100`. Behold client-side søgning (søgning er interaktiv og skal ikke kræve navigation).

**Acceptkriterier:**

- [x] Default: Henter max 100 transaktioner sorteret by date desc
- [x] URL-parametre styrer sortering
- [x] Paginerings-UI i tabellen

- **Prioritet:** 🟢 Lav
- **Kompleksitet:** Medium

---

### DEPLOY-6.3: Pensionér `wishbuy_analytics` Streamlit-container

**Beskrivelse:** `wishbuy_analytics` er en legacy Streamlit-app (Python) der lavede finansanalyser — nu erstattet af Finance-dashboardet. Den kører stadig og bruger ressourcer.

**Hvad der skal gøres:**

1. Kontrollér at Finance-dashboardet dækker alle Streamlit-features (visuelt tjek)
2. Stop containeren: `docker stop wishbuy_analytics`
3. Fjern service fra `projects.yml` (eller hvad docker-compose-filen hedder på serveren)
4. Verificér at port 8501 er fri: `ss -tlnp | grep 8501`

**Acceptkriterium:** [x] `wishbuy_analytics`-containeren kører ikke, port 8501 er fri.

- **Prioritet:** 🟢 Lav
- **Kompleksitet:** Meget lav

---

## 🔵 Sprint 7: Ugeplan Migration

**Kontekst:** `ugeplan` er en standalone SvelteKit-app på `ugeplan.hostrup.org` (lokalt: port 3005). Den har sin egen PostgreSQL-database og sit eget Docker-container. Målet er at porterere al funktionalitet ind i Hostrup Hub og lukke den standalone app.

**VIGTIGT — Tema-arkitektur:** Ugeplan bruger et shadcn-inspireret token-system (`bg-background`, `text-foreground`, `text-muted-foreground`, `teal-*` som alias for Electric Indigo) der er ukendt for Hostrup Hub. Al porteret kode **skal** refaktoreres til Hostrup Hubs glassmorphism-system (se CLAUDE.md). Der må ikke indføres shadcn-tokens i wishbuy.

**Klasse-mapping ved portering:**

| Ugeplan (shadcn/teal)                  | Hostrup Hub (glassmorphism)                         |
| -------------------------------------- | --------------------------------------------------- |
| `bg-background`                        | `bg-slate-50 dark:bg-slate-950`                     |
| `text-foreground`                      | `text-slate-900 dark:text-slate-100`                |
| `text-muted-foreground`                | `text-slate-500 dark:text-slate-400`                |
| `bg-card`                              | `bg-white/80 backdrop-blur-xl`                      |
| `border-border`                        | `border-slate-200/50 dark:border-white/10`          |
| `text-teal-400` / `text-teal-500`      | `text-indigo-400` / `text-indigo-500`               |
| `bg-teal-500`                          | `bg-indigo-500`                                     |
| `focus:ring-teal-500`                  | `focus:ring-indigo-500`                             |
| `bg-white/[0.02]` (mørk-first kort)    | `bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl` |
| `border-white/[0.04]`                  | `border-slate-200/50 dark:border-white/10`          |
| `text-emerald-500` (= pink i ugeplan!) | `text-rose-500`                                     |

---

### UP-7.1: Tilføj dependencies til wishbuy

**Fil:** `package.json` (wishbuy-projektet)

Ugeplan bruger tre packages der ikke findes i wishbuy:

```bash
npm install ical-generator date-fns @lucide/svelte
```

- `ical-generator`: Genererer `.ics`-kalender-feed til Home Assistant
- `date-fns`: ISO-ugenummerberegning (`getISOWeeksInYear`, `addDays`)
- `@lucide/svelte`: SVG-ikonbibliotek brugt i DayCard og settings

**OBS:** `shadcn-svelte`, `clsx`, `tailwind-merge`, `tailwind-variants` fra ugeplan installeres **ikke** — disse er shadcn-infrastruktur der droppes ved portering.

**Acceptkriterium:** [x] `npm install` kører uden fejl, `npm run build` passerer.

---

### UP-7.2: Portér Prisma-schema

**Fil:** `prisma/schema.prisma`

Tilføj følgende 5 modeller til slutningen af wishbuy's schema. Behold al eksisterende schema-indhold uændret:

```prisma
model Person {
  id                    String          @id @default(uuid())
  name                  String
  emoji                 String?         @default("👤")
  default_presence_days String          // Kommasepareret: "1,2,3,4,5" (1=Man, 7=Søn)
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  dayPlans              DayPlanPerson[]
}

model Recipe {
  id        String    @id @default(uuid())
  name      String
  note      String?
  last_used DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  dayPlans  DayPlan[]
}

model WeekPlan {
  id          String    @id @default(uuid())
  year        Int
  week_number Int
  note        String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  dayPlans    DayPlan[]

  @@unique([year, week_number])
}

model DayPlan {
  id          String          @id @default(uuid())
  date        DateTime
  note        String?
  guests_note String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  weekPlanId  String
  weekPlan    WeekPlan        @relation(fields: [weekPlanId], references: [id], onDelete: Cascade)
  recipeId    String?
  recipe      Recipe?         @relation(fields: [recipeId], references: [id], onDelete: SetNull)
  persons     DayPlanPerson[]

  @@unique([date])
}

model DayPlanPerson {
  dayPlanId String
  personId  String
  dayPlan   DayPlan @relation(fields: [dayPlanId], references: [id], onDelete: Cascade)
  person    Person  @relation(fields: [personId], references: [id], onDelete: Cascade)

  @@id([dayPlanId, personId])
}
```

Kør derefter:

```bash
npx prisma generate
npx prisma db push
```

**Acceptkriterier:**

- [x] `npx prisma db push` kører uden fejl
- [x] De 5 nye tabeller eksisterer i PostgreSQL
- [x] Eksisterende tabeller er uændrede

---

### UP-7.3: Migrér data fra ugeplan-database til wishbuy-database

**Kontekst:** Ugeplan og wishbuy kører med separate PostgreSQL-containere. Begge har en `User`-tabel med (sandsynligvis) de samme `username`-værdier — disse skal dedupliceres.

**Forberedelse — Kontrollér database-connection strings:**

```bash
# Ugeplan:
cat /hostrup/docker/projects/ugeplan/prisma.config.ts
# Wishbuy:
cat /hostrup/docker/projects/wishbuy/prisma/schema.prisma
# Eller .env-filer i begge projekter
```

**Migreringsrækkefølge (rækkefølgen er vigtig pga. foreign keys):**

1. **`Person`** (ingen foreign keys til andre migrerede tabeller)
2. **`Recipe`** (ingen foreign keys til andre migrerede tabeller)
3. **`WeekPlan`** (ingen foreign keys)
4. **`DayPlan`** (foreign key til WeekPlan og Recipe)
5. **`DayPlanPerson`** (foreign keys til DayPlan og Person)

**User-deduplicering:** Ugeplan's `User`-tabel har samme `username`-format som wishbuy. Ved indsættelse af data der peger på `userId` (ikke relevant for de 5 nye modeller — `Person` er ikke en `User`) skal du verificere at der ikke er username-konflikter.

**Praktisk approach — brug Prisma direkte:**
Opret et midlertidigt migrations-script `migrate_ugeplan.ts` i wishbuy-roden:

```typescript
// migrate_ugeplan.ts
import { PrismaClient as WishbuyPrisma } from './node_modules/.prisma/client/index.js';
// Konfigurér ugeplan-DB via env variabel UGEPLAN_DATABASE_URL
import { PrismaClient as UgeplanPrisma } from '/hostrup/docker/projects/ugeplan/node_modules/.prisma/client/index.js';

const wishbuy = new WishbuyPrisma();
const ugeplan = new UgeplanPrisma({
	datasources: { db: { url: process.env.UGEPLAN_DATABASE_URL } }
});

// Migrer Person, Recipe, WeekPlan, DayPlan, DayPlanPerson i den rigtige rækkefølge
```

Alternativt: `pg_dump` fra ugeplan-containeren og tilpasset `INSERT`-script.

Slet `migrate_ugeplan.ts` efter vellykket kørsel.

**Acceptkriterier:**

- [x] Alle `Person`-records eksisterer i wishbuy-DB
- [x] Alle `Recipe`-records eksisterer i wishbuy-DB
- [x] Alle `WeekPlan` + `DayPlan` + `DayPlanPerson`-records eksisterer med korrekte relationer
- [x] Migreringsscript er slettet

---

### UP-7.4: Portér kalender-API med auth-bypass

**To filer der oprettes i wishbuy:**

**Fil 1:** `src/hooks.server.ts` (tilføj bypass til eksisterende fil)

Find den eksisterende `isBypassedPath`-logik (eller `isPublicPath`) i wishbuy's `hooks.server.ts` og tilføj kalender-feed-stien:

```typescript
// Tilføj til bypass-listen — bevar eksisterende bypasses:
const isBypassedPath =
  event.url.pathname === '/api/calendar/feed.ics' ||
  event.url.pathname === '/manifest.json' ||
  // ... eksisterende bypasses
```

**SIKKERHEDSNOTAT (bevar som kommentar):** `/api/calendar/feed.ics` tilgås lokalt af Home Assistant (fra 10.0.0.6 uden om Authelia-proxy). Offentlig adgang er blokeret i Authelia's `configuration.yml`. Fjern ALDRIG denne bypass — det vil afbryde Home Assistant-integrationen.

**Fil 2:** `src/routes/api/calendar/feed.ics/+server.ts`

Kopier `+server.ts` fra ugeplan (`/hostrup/docker/projects/ugeplan/src/routes/api/calendar/feed.ics/+server.ts`) og tilpas:

1. Opdatér import til wishbuy's prisma: `import { prisma } from '$lib/server/prisma';`
2. Opdatér URL i `cal.createEvent`: `url: 'https://wishbuy.hostrup.org'` (eller den nye hub-URL)
3. Bevar den DST-bevidste `getDinnerTimeUTC`-funktion uændret — den er korrekt implementeret

**Acceptkriterier:**

- [x] `GET /api/calendar/feed.ics` returnerer gyldig `.ics` uden auth-header
- [x] Home Assistant kan hente feedet (test med: `curl http://localhost:PORT/api/calendar/feed.ics`)
- [x] Autentificerede routes er stadig beskyttede

---

### UP-7.5: Portér ugeplan-routes med tema-refaktorering

**Filstruktur der oprettes i wishbuy:**

```
src/routes/dashboard/weekly/
  +page.server.ts          ← redirect til aktuel uge
  [year]/
    [week]/
      +page.svelte         ← ugevisning (porteret + refaktoreret)
      +page.server.ts      ← load-funktion
  settings/
    +page.svelte           ← Person/profil-admin (porteret + refaktoreret)
    +page.server.ts        ← CRUD-actions for Person, User
src/lib/components/
  DayCard.svelte           ← dagkort-komponent (porteret + refaktoreret)
```

**`src/routes/dashboard/weekly/+page.server.ts`** — enkel redirect:

```typescript
import { redirect } from '@sveltejs/kit';
import { getISOWeek, getYear } from 'date-fns';

export const load = async () => {
	const now = new Date();
	throw redirect(302, `/dashboard/weekly/${getYear(now)}/${getISOWeek(now)}`);
};
```

**`src/routes/dashboard/weekly/[year]/[week]/+page.server.ts`** — kopier load-logik fra ugeplan (`/hostrup/docker/projects/ugeplan/src/routes/[year]/[week]/+page.server.ts`). Opdatér imports.

**`src/routes/dashboard/weekly/settings/+page.server.ts`** — kopier fra ugeplan (`/hostrup/docker/projects/ugeplan/src/routes/settings/+page.server.ts`). Opdatér imports.

**Theme-refaktorering af alle porterede `.svelte`-filer:**
Brug klasse-mappingen fra Sprint 7-indledningen. Specifikke punkter:

- `@lucide/svelte`-imports beholdes (dependency er installeret i UP-7.1)
- Fjern alle `style="..."` med `rgba(...)`-farver og erstat med Tailwind-klasser
- Fjern animationsklasser (`animate-aurora-*`, `animate-rotate-slow` osv.) — ugeplan-layoutets animerede baggrund porteres **ikke** (for kompleks, lav prioritet)
- Header-navigation: Erstat ugeplan-headerens logo/navigation med Hostrup Hub's navigationsmønster (← Hub-link + side-titel som `bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent`)

**Acceptkriterier:**

- [x] `/dashboard/weekly` redirecter til aktuel uge
- [x] `/dashboard/weekly/2026/26` viser ugevisning med DayCard-komponenter
- [x] `/dashboard/weekly/settings` viser person-admin
- [x] Ingen `teal-*`, shadcn-tokens eller `rgba(...)`-literals i porteret kode
- [x] `npm run build` passerer

---

### UP-7.6: Portér og refaktorér DayCard-komponenten

**Kilde:** `/hostrup/docker/projects/ugeplan/src/lib/components/DayCard.svelte`
**Destination:** `src/lib/components/DayCard.svelte` (wishbuy)

**Specifikke klasse-rettelser i DayCard:**

```typescript
// Linje ~50-56 i original — statusColor:
// GAMMEL (teal = indigo i ugeplan, amber i Wishbuy er ikke omkortet):
let statusColor = $derived(
	presentCount === 0
		? 'text-neutral-600'
		: presentCount === allPersons.length
			? 'text-teal-400'
			: 'text-amber-400'
);

// NY (korrekt for Hostrup Hub):
let statusColor = $derived(
	presentCount === 0
		? 'text-slate-400 dark:text-slate-600'
		: presentCount === allPersons.length
			? 'text-emerald-500 dark:text-emerald-400'
			: 'text-amber-500'
);
```

Erstat alle `text-teal-*` / `bg-teal-*` / `border-teal-*` med `indigo`-ækvivalenter.

Kortstruktur skal følge Hostrup Hub glassmorphism:

```html
<article
	class="rounded-3xl border border-slate-200/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
></article>
```

**Acceptkriterier:**

- [x] DayCard renderer korrekt i lys og mørk tilstand
- [x] Ingen `teal-*`-klasser i komponenten
- [x] Ingen `any`-typer (prop-interfaces skal typedefineres)

---

### UP-7.7: Opdatér velkomstsiden — ugeplan-tile peger på intern rute

**Fil:** `src/routes/+page.svelte`

**Problem:** Velkomstsiden (fra Sprint 4) linker ugeplan-tilen til `https://ugeplan.hostrup.org` (ekstern URL). Efter migration skal den pege på `/dashboard/weekly`.

Find ugeplan-tilen i `+page.svelte` og opdatér `href`:

```html
<!-- FØR -->
<a href="https://ugeplan.hostrup.org">📅 Ugeplan</a>

<!-- EFTER -->
<a href="/dashboard/weekly">📅 Ugeplan</a>
```

**Acceptkriterium:** Ugeplan-tilen navigerer til `/dashboard/weekly` (intern rute).

---

### UP-7.8: Opdatér Home Assistant-integration

**Kontekst:** Home Assistant (HA) tilgår kalender-feedet DIREKTE via lokalt netværk: `http://10.0.0.6:3005/api/calendar/feed.ics` (port 3005 = ugeplan-container). Wishbuy kører på en anden port.

**Hvad der skal gøres:**

1. Find wishbuy's lokale Docker-port: `docker ps | grep wishbuy` (typisk 3000 eller anden)
2. Opdatér HA's kalender-integration med den nye URL: `http://10.0.0.6:PORT/api/calendar/feed.ics`
3. Test at HA kan hente feedet

Alternativt: Konfigurér Nginx til at sende `http://10.0.0.6:3005/api/calendar/feed.ics` videre til wishbuy — dette bevarer HA-konfigurationen uændret.

**Acceptkriterium:** HA-kalender-integration viser korrekte madplaner fra wishbuy-databasen.

---

### UP-7.9: Fjern standalone ugeplan-container

**Forudsætning:** UP-7.4–7.8 er alle completed og verificerede.

**Hvad der skal gøres:**

1. Bekræft at `/dashboard/weekly` fungerer i wishbuy (manuelt tjek af 3-4 uger)
2. Bekræft at kalender-feed virker i HA
3. Stop og fjern ugeplan-container: `docker stop ugeplan && docker rm ugeplan`
4. Fjern `ugeplan`-service fra `projects.yml` (eller den relevante docker-compose-fil)
5. Verificér at `ugeplan.hostrup.org` ikke længere er tilgængeligt (Authelia/Nginx peger på lukket port)

**Acceptkriterium:** Ugeplan-container kører ikke. Nginx/Authelia returnerer 502/503 på `ugeplan.hostrup.org`. Alle features fungerer i Hostrup Hub.

---

## ⚪ Sprint 8: Branding & Finpudsning

### BRAND-8.1: Opdatér app-identitet

**Filer:**

- `src/routes/+layout.svelte`: `<title>` og `<meta name="description">`
- `static/favicon.png` (eller `.ico`): Erstat med Hostrup Hub-favicon
- `package.json`: `"name": "hostrup-hub"` er allerede sat ✅

**Nuværende `<title>`:** `Hostrup Hub` (allerede korrekt ✅)
**Hvad der mangler:** OpenGraph meta-tags, PWA-manifest (`static/manifest.json`), app-ikon

---

### BRAND-8.2: Nyt domæne `hub.hostrup.org`

**Hvad der skal gøres:**

1. Opdatér Nginx/Authelia-konfiguration med nyt domæne
2. Opdatér `cal.createEvent`-URL i `src/routes/api/calendar/feed.ics/+server.ts`
3. Opdatér eventuelle hardkodede URL-referencer i kodebasen: `grep -r "wishbuy.hostrup.org" src/`
4. SSL-certifikat til nyt domæne (Let's Encrypt via Nginx Proxy Manager)

---

## ✅ Gennemførte sprints

| Sprint     | Indhold                                                                     | Dato          |
| ---------- | --------------------------------------------------------------------------- | ------------- |
| Sprint 1–3 | Hardening (7 fixes), Python-oprydning, bankimport med CSV/MD5/mapping rules | 25. juni 2026 |
| Sprint 4   | Navngivning (Hostrup Hub), tile-velkomstside, navigation harmoniseret       | 26. juni 2026 |
