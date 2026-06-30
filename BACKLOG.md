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

## ✅ Sprint 7: Ugeplan Migration — GENNEMFØRT

Alle UP-7.1–UP-7.9 tasks er fuldt implementeret, udrullet og verificeret 26. juni 2026. Den standalone ugeplan-container samt dens kildekode-filer er slettet, og ugeplanen er 100% konsolideret på Hostrup Hub. Port 3005 på host-IP 10.0.0.2 er mappet til wishbuy-containeren, så Home Assistant kalender-feedet fungerer uafbrudt.

## 🔵 Sprint 7 (arkiv): Ugeplan Migration

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

## ✅ Sprint 8: Branding & Finpudsning — GENNEMFØRT

### BRAND-8.1: Opdatér app-identitet — GENNEMFØRT

**Filer:**

- `src/routes/+layout.svelte`: `<title>` og `<meta name="description">` ✅
- `static/favicon.png` (eller `.ico`): Erstat med Hostrup Hub-favicon (nyt premium SVG-ikon indført) ✅
- `package.json`: `"name": "hostrup-hub"` er allerede sat ✅
- OpenGraph meta-tags, PWA-manifest (`static/manifest.json`), app-ikon fully set up ✅

---

### BRAND-8.2: Nyt domæne hub.hostrup.org — UDSKUDT / BEHOLDT EKSISTERENDE DOMÆNER

**Status:** Udskudt efter brugerønske for at give tid til at lære de nye navne at kende. De eksisterende domæner (`wish.hostrup.org` og `ugeplan.hostrup.org`) bevares og peger begge 100% konsolideret på Hostrup Hub-containeren.

**Udførte delopgaver:**

- Opdateret eventuelle hardkodede URL-referencer i kalender-feedet (`src/routes/api/calendar/feed.ics/+server.ts`) til den aktive `wish.hostrup.org` i stedet for legacy `wishbuy.hostrup.org`. ✅

---

## ✅ Gennemførte sprints

| Sprint     | Indhold                                                                     | Dato          |
| ---------- | --------------------------------------------------------------------------- | ------------- |
| Sprint 1–3 | Hardening (7 fixes), Python-oprydning, bankimport med CSV/MD5/mapping rules | 25. juni 2026 |
| Sprint 4   | Navngivning (Hostrup Hub), tile-velkomstside, navigation harmoniseret       | 26. juni 2026 |

---

# 📈 Sprint 9: Aktiemonitorering (`/dashboard/stocks`)

Ny, fuldt integreret side i Hostrup Hub der giver Ronni og Mathilde et visuelt, pædagogisk overblik over deres fælles AI-modelportefølje (købt **4. juni 2026**). Understøtter løbende køb/salg, automatisk kurssynkronisering, scenarie-simulering og **AI-drevet porteføljeanalyse gemt i databasen**.

> **Kilde:** Denne sprint er den berigede, implementeringsklare migrering af `stock_backlog.md`. Den oprindelige fil er slettet efter migrering.

> **🚧 Status (27. juni 2026):** Backend-fundamentet er bygget og verificeret lokalt (`npm run check`, `npm run lint`, `npm run test` — alle grønne):
>
> - **9.1 Datamodel** ✅ kode færdig — 5 modeller + `StockTransType` + `User.stockAnalyses` i `prisma/schema.prisma`; `prisma validate`/`generate` OK. Seed-script `prisma/seed-stocks.ts` (`npm run db:seed:stocks`) klar. **Mangler:** `prisma db push` + seed køres ved deploy (DB-host `postgresql` nås kun i Docker-netværket).
> - **9.3 Beregningskerne** ✅ færdig — `src/lib/server/stocks/calc.ts` + `calc.test.ts` (12 tests, vitest tilføjet, `npm run test`).
> - **9.2 Sync & cron** ✅ kode færdig — `src/lib/server/stocks/fetchPrices.ts` (yahoo-finance2 + Frankfurter), `src/routes/api/stocks/sync/+server.ts` (Bearer-beskyttet), bypass i `hooks.server.ts`, `CRON_SECRET` i `.env`. **Mangler ops:** tilføj `CRON_SECRET` til `/hostrup/docker/.env` (runtime-env til containeren) + host-crontab + Authelia-regel (9.9).
> - **9.4 Hovedside & UI** ✅ kode færdig — `src/routes/dashboard/stocks/+page.server.ts` (load fra DB-cache via beregningskernen, inkl. historik der beregner position som-af-dagen) + `+page.svelte` (KPI-bjælke, performance-bar mod scenarier, porteføljetabel med tese-status + stale-badge, allokerings-donut + værdi/kostpris-area, tom-tilstand). Aktie-tile tilføjet på landing. **Mangler:** visuel verifikation i browser med rigtige kurser (kræver deploy + seed + sync).
> - **9.5 CRUD-transaktioner** ✅ kode færdig — actions `addTransaction` (validering: oversalg blokeret via beregningskernen, ingen fremtidig dato, positive tal, auto 0,25 % valutaveksling), `addStock`, `deleteTransaction`. Modal med live kostpris-preview, handelshistorik med slet, fejl-banner. `npm run build` + `check` + `lint` + `test` grønne.
>
> **🚀 LIVE i produktion (27. juni 2026):** 9.1–9.5 udrullet og verificeret med rigtige data.
>
> - `prisma db push` kørt mod produktions-DB; seed indlæst (4 aktier + benchmarks + ALAB-reference + fx). Container rebuilt fra `main`.
> - Siden renderer HTTP 200 med rigtige kurser: porteføljeværdi **8.610 kr.**, urealiseret **−1.102 kr. (−11,35 %)**, kostpris 9.713 kr.
> - **Bugfix fundet ved go-live:** `yahoo-finance2` v3 kræver `new YahooFinance()` (commit `c0d7052`).
> - **Infra:** `CRON_SECRET` tilføjet til `/hostrup/docker/.env` + `stacks/projects.yml`. Host-crontab installeret (kurser hver time i markedstid + nat-job), cron-dæmon aktiv. Initial sync OK (6/6 tickers).
> - **Resterer for fuld sikkerhed (9.9):** Authelia `two_factor`-regel for `^/dashboard/stocks` + `^/api/stocks/(?!sync)` — ligger i Authelia `configuration.yml` uden for repoet; ikke ændret endnu.
> - **Næste:** 9.8 (AI-analyse gemt i DB).
>
> **📊 Statusaudit (30. juni 2026):** System har kørt i ~4 handelsdage. Cron kører fejlfrit (0 fejl over 8 successive kald), alle 6 tickers opdateres, Yahoo Finance + Frankfurter FX leverer stabilt. Primært problem: kun 2 dage historisk prisdata (25/6 + 29/6) pga. `updateDailyCloses()` kun gemmer seneste dag. Cron-logformat ulæseligt (ingen newlines). Se Sprint 9.11 for hardening-opgaver.

## 🎯 Designprincipper (gælder hele Sprint 9)

1. **Følg Hostrup Hubs arkitektur 100%** — Prisma (aldrig rå SQL), ad-hoc `+page.server.ts` (intet service-lag), Svelte 5 runes, glassmorphism, temafarver via CSS custom properties (aldrig hardkodet hex), dansk UI / engelske identifiers. Se `AGENTS.md`.
2. **Eksterne API-kald sker ALDRIG synkront i `load`** — alle kurser/nøgletal læses fra DB-cache; opdatering sker via baggrunds-endpoint (9.2).
3. **Al beregningslogik samles i `src/lib/server/stocks/`** — `load`-funktioner og MCP-tools (Sprint 10) deler præcis samme udregningskerne, så DKK-tal aldrig divergerer mellem UI og agent.
4. **Dansk talformatering overalt** — `Intl.NumberFormat('da-DK')`: `9.715 kr.`, `-3,24 %`, komma som decimalseparator, punktum som tusindtalsseparator.
5. **Robuste tilstande** — hver visning håndterer tom portefølje, manglende kurser (stale-badge), API-fejl og loading.

## 🎨 Farve-semantik (temaklasser, ikke hex)

| Betydning          | Klasse                                    | Brug                        |
| ------------------ | ----------------------------------------- | --------------------------- |
| Gevinst / positivt | `emerald-500` / `emerald-400`             | Positivt afkast, tese OK    |
| Tab / negativt     | `rose-500` / `rose-400`                   | Negativt afkast, tesebrud   |
| Neutral / kostpris | `slate-400` / `slate-500`                 | Nullinje, kostpris-markør   |
| Primær accent      | `indigo-500`                              | KPI-fremhævning, CTA        |
| Sekundære serier   | `violet-500`, `indigo-400`, `rose-400`    | Donut-segmenter pr. ticker  |
| Advarsel           | `amber-500` (**ægte orange** — IKKE pink) | Tese under pres, stale kurs |

> ⚠️ **Husk TEMA-0.5:** `amber-*` er IKKE længere remappet til pink (fixet i Sprint 0). Brug `amber-*` til ægte advarsels-orange og `rose-*` til tab/negativt.

---

## 📖 9.0 Reference: Pædagogisk aktie-matematik

Denne viden driver UI-tekst, tooltips og den pædagogiske AI-prompt (9.8). Implementér som genbrugelige tooltip-tekster i en konstant-fil `src/lib/stocks/glossary.ts` (klient-sikker, ingen secrets).

| Begreb                     | Kernepointe til UI/tooltip                                                                                          | Formel                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Kostpris (cost basis)**  | Aktiepris + valutaveksling (0,25 %) + kurtage (min. 25 kr./handel). Små portioner straffes af den flade kurtage.    | `aktiepris_dkk + aktiepris_dkk·0,0025 + 25` |
| **Urealiseret afkast**     | Papir-gevinst; først skattepligtig ved salg.                                                                        | `(kurs_nu·antal·fx_nu) − kostpris`          |
| **Valuta-stødpude**        | Afkast i DKK = aktieafkast (USD) × valutaafkast. Stærkere dollar afbøder kursfald.                                  | `(1+r_usd)·(1+r_fx)−1`                      |
| **P/E (trailing/forward)** | År af indtjening man betaler. Forward = forventet næste 12 mdr. Stor trail>forward-forskel = forventet vækstspring. | `kurs / EPS`                                |
| **EPS / EPS CAGR**         | Overskud pr. aktie; CAGR = årlig vækstrate (rentes rente).                                                          | `EPS_slut/EPS_start)^(1/n)−1`               |
| **Multipel-kompression**   | God indtjeningsvækst kan give 0 % afkast hvis markedet sænker P/E.                                                  | Kerneformel i simulatoren (9.6)             |

**Pædagogiske billeder der genbruges i tooltips og AI-output:**

- _To pizzeriaer_ (P/E): Google P/E 27 = stabilt veletableret pizzeria; Palantir P/E 160 = robot-pizzeria man betaler for fremtidig eksplosiv vækst (joker-position).
- _Multipel-kompression_ (PLTR-eksempel): EPS firedobles ($0,91→$4,09) men hvis P/E falder 160x→35x bliver kursen $146→$143 = **+349 % indtjening, ~0 % kursafkast**.

---

## 🏁 Sprint 9.1: Datamodel & Database (Prisma)

**Fil:** `prisma/schema.prisma` (tilføj i slutningen, bevar alt eksisterende uændret).

Udvid den oprindelige spec med: `isBenchmark`-flag (til indeks-sammenligning), `targetPriceUsd` (analytiker-kursmål), `sector`/`theme` (allokerings-grupperinger), `lastPriceSyncedAt` (stale-detektion), og en ny **`StockAnalysis`-model** der gemmer AI-analyser som historik-log (ikke upsert — vi vil se udviklingen i rådgivningen over tid).

```prisma
model Stock {
  id                 String             @id @default(cuid())
  ticker             String             @unique
  name               String
  currency           String             @default("USD")
  description        String             @db.Text
  investmentThesis   String             @db.Text
  breakThesisSignal  String             @db.Text
  sector             String?            // "Semiconductors", "Software", ...
  theme              String?            // "AI Compute", "AI Software", ...
  isActive           Boolean            @default(true)
  isBenchmark        Boolean            @default(false) // S&P500 / Nasdaq-100 til sammenligning

  // Nøgletal (cache — opdateres via sync-job 9.2)
  currentPrice       Float?
  previousClose      Float?             // til dagsændring i %
  peTrailing         Float?
  peForward          Float?
  epsTTM             Float?
  epsCAGR5Year       Float?
  targetPriceUsd     Float?             // analytiker-konsensus kursmål
  marketCap          Float?
  lastPriceSyncedAt  DateTime?          // stale-badge hvis > 24t / markedet lukket

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  transactions       StockTransaction[]
  dailyPrices        StockPriceDaily[]
  analyses           StockAnalysis[]
}

model StockTransaction {
  id             String          @id @default(cuid())
  stockId        String
  stock          Stock           @relation(fields: [stockId], references: [id], onDelete: Cascade)
  type           StockTransType
  date           DateTime
  shares         Float
  priceUsd       Float
  rateDkkUsd     Float
  brokerageDkk   Float           @default(25.0)
  exchangeFeeDkk Float           @default(0.0)
  comment        String?         @db.Text
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([stockId, date])
}

enum StockTransType {
  BUY
  SELL
}

model StockPriceDaily {
  id         String   @id @default(cuid())
  stockId    String
  stock      Stock    @relation(fields: [stockId], references: [id], onDelete: Cascade)
  date       DateTime
  closePrice Float

  @@unique([stockId, date])
  @@index([stockId, date])
}

model ExchangeRateDaily {
  id     String   @id @default(cuid())
  base   String   @default("USD")
  target String   @default("DKK")
  date   DateTime
  rate   Float

  @@unique([base, target, date])
}

model StockAnalysis {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  scope            String   // 'PORTFOLIO' | 'STOCK'
  stockId          String?  // sat når scope == 'STOCK'
  stock            Stock?   @relation(fields: [stockId], references: [id], onDelete: Cascade)
  model            String   @default("gemini-2.5-flash")
  verdict          String?  // 'HOLD' | 'REDUCE' | 'ADD' | 'SELL' | 'MIXED'
  content          String   @db.Text  // markdown til visning
  data             Json?    // struktureret output (per-position-domme, risici) — se 9.8
  snapshotValueDkk Float?   // porteføljeværdi (DKK) på analysetidspunktet
  createdAt        DateTime @default(now())

  @@index([userId, scope, createdAt])
}
```

> **`User`-modellen** skal have tilføjet `analyses StockAnalysis[]` i sin relations-blok (modsvarende `aiInsight`-mønsteret).

**Seed-data** (`prisma/seed-stocks.ts`, idempotent via `upsert` på `ticker`) — de 4 købte aktier + benchmark. Kurser sættes til `null` (fyldes af første sync) men transaktioner indlæses præcist:

| Ticker | Navn           | Antal | Købskurs USD | Kostpris DKK | Sektor / Tema                  | Tesebrud-signal                            |
| ------ | -------------- | ----- | ------------ | ------------ | ------------------------------ | ------------------------------------------ |
| NVDA   | NVIDIA Corp.   | 2     | 212,297      | 2.766        | Semiconductors / AI Compute    | Markedsandel < 75 % el. vækst < 30 % y/y   |
| AVGO   | Broadcom Inc.  | 1     | 406,140      | 2.647        | Semiconductors / Custom ASIC   | AI-vækst < 50 % y/y el. mister Google/Meta |
| GOOGL  | Alphabet Inc.  | 1     | 366,025      | 2.387        | Software / Cloud+Modeller      | Cloud-vækst < 30 % y/y                     |
| PLTR   | Palantir Tech. | 2     | 146,093      | 1.915        | Software / AI Software (joker) | Vækst < 40 % y/y el. GAAP-margin < 30 %    |

Total: 6 aktier, **9.715 kr.** investeret (= $1.488,95 ved fx 6,44). Benchmark: seed `^GSPC` (S&P 500) og evt. `QQQ` (Nasdaq-100) med `isBenchmark = true`, `isActive = false`.

Valutakurs `USD→DKK = 6,44` for 4. juni 2026 seedes i `ExchangeRateDaily`.

**Acceptkriterier:**

- [ ] `npx prisma db push` kører fejlfrit; 5 nye tabeller + `StockTransType`-enum eksisterer
- [ ] Eksisterende tabeller uændrede; `User.analyses`-relation tilføjet
- [ ] `npm run db:seed:stocks` (eller `tsx prisma/seed-stocks.ts`) indlæser de 4 aktier + 5 transaktioner + benchmark idempotent
- [ ] Kostpris pr. transaktion matcher tabellen ± 1 kr.
- **Prioritet:** 🔴 Høj · **Kompleksitet:** Lav-medium

---

## 🔌 Sprint 9.2: Datakilder, sync & cron

**Mål:** Cache kurser, nøgletal og valuta i DB. Ingen eksterne kald i `load`.

**Datakilder (gratis):**

- Aktiekurser + nøgletal (P/E, EPS, previousClose, marketCap): **`yahoo-finance2`** npm-pakke (`quote` + `quoteSummary` for `defaultKeyStatistics`/`financialData` til targetPrice). Tilføj via `npm install yahoo-finance2`.
- Valutakurs USD/DKK: **Frankfurter API** (`https://api.frankfurter.app/latest?from=USD&to=DKK`, ECB-data, 100 % gratis, ingen nøgle). Fallback: Open Exchange Rates.

**Filer:**

- `src/lib/server/stocks/fetchPrices.ts` — `updateStockQuotes()`, `updateDailyCloses()`, `updateExchangeRate()`. Hver wrappet i try/catch pr. ticker (én fejlende ticker må ikke vælte resten). Logger fejl, fortsætter.
- `src/routes/api/stocks/sync/+server.ts` — `POST`-endpoint der kører sync. Beskyttet med `Authorization: Bearer ${CRON_SECRET}`. Query `?mode=quotes|daily|fx|all`.

**Cron-strategi** (projektet har ingen scheduler i dag — vi bruger host-crontab der kalder endpoint, i tråd med Docker-deployment):

- Tilføj `CRON_SECRET` til `.env` + `.env.example`.
- Tilføj `/api/stocks/sync` til `isBypassedPath` i `src/hooks.server.ts` (bypass Authelia-header-tjek, men kræv selv Bearer-token i endpointet). **Sikkerhedsnote i koden** ligesom calendar-feed.
- Host-crontab (dokumentér i denne task, opsættes på serveren):
  ```cron
  # Kurser hver time i US-markedstid (15:30–22:00 dansk, man-fre)
  0 16-22 * * 1-5  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:PORT/api/stocks/sync?mode=quotes
  # Nat-job 23:05: dagsslutkurser + nøgletal + valutakurs
  5 23 * * 1-5     curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:PORT/api/stocks/sync?mode=all
  ```
- **Markedslukke-detektion:** spring quote-sync over hvis `quote.marketState !== 'REGULAR'` og kursen allerede er frisk (< 1t) — undgå unødige kald.

**Acceptkriterier:**

- [ ] `POST /api/stocks/sync?mode=all` opdaterer `currentPrice`, `previousClose`, P/E, EPS, `targetPriceUsd`, `lastPriceSyncedAt` for alle aktive aktier + benchmark
- [ ] Dagens slutkurser skrives til `StockPriceDaily`, valutakurs til `ExchangeRateDaily` (begge upsert på unique-nøgle)
- [ ] Endpoint afviser kald uden korrekt Bearer-token med 401
- [ ] Én fejlende ticker afbryder ikke de øvrige
- [ ] Ingen eksterne API-kald i nogen `load`-funktion
- **Prioritet:** 🔴 Høj · **Kompleksitet:** Medium

---

## 🧮 Sprint 9.3: Beregningskerne (delt logik)

**Mål:** Én sandhed for alle DKK-/afkast-tal. Bruges af `load` (9.4), CRUD (9.5), AI-analyse (9.8) og MCP-tools (Sprint 10).

**Fil:** `src/lib/server/stocks/calc.ts` — rene funktioner, ingen Prisma-import (tager data ind, returnerer tal), 100 % testbare.

Implementér:

- `costBasis(tx)` → reel kostpris i DKK inkl. gebyrer.
- `positionFromTransactions(txs)` → `{ shares, avgCostUsd, totalCostDkk, realizedGainDkk }` med **average cost basis** (gennemsnitlig anskaffelsespris ved efterfølgende køb; ved SELL realiseres forholdsmæssig andel).
- `unrealized(position, currentPrice, fxNow)` → `{ valueDkk, valueUsd, gainDkk, gainPct }`.
- `currencyDecomposition(...)` → opdel samlet afkast i **aktiekurs-effekt** vs **valuta-effekt** (stødpude-visualisering): `(1+r_usd)·(1+r_fx)−1`.
- `portfolioTotals(positions)` → samlet værdi, kostpris, urealiseret afkast, allokering pr. ticker (%).
- `concentrationHHI(weights)` → Herfindahl-indeks (koncentrationsrisiko 0–1; advar ved > 0,4 eller enkeltposition > 35 %).
- `scenarioBands(costBasis)` → de fem dec-2026-scenarier: Krise (−28 %), Kostpris (0 %), Solidt (+13 %), Base Case (+25 %), Eufori (+55 %) — beregnet relativt til kostpris (afløser de hardkodede tal fra spec'en, så de skalerer med faktiske køb).
- `futurePrice(epsTTM, cagr, years, terminalPE)` → simulator-kerne (9.6).
- `benchmarkReturn(...)` → porteføljens tidsvægtede afkast vs indeks i samme periode.

**Acceptkriterier:**

- [ ] Vitest-suite `calc.test.ts` dækker kostpris (AVGO-eksempel = 2.647 kr. ± 1), average cost ved 2 køb, realiseret gevinst ved delsalg, valuta-dekomponering, HHI
- [ ] Ingen `any`; alle funktioner rent typede med eksplicitte interfaces
- [ ] `npm run lint` passerer
- **Prioritet:** 🔴 Høj · **Kompleksitet:** Medium

---

## 🖥️ Sprint 9.4: Hovedside & visuelt design (frontend)

**Filer:** `src/routes/dashboard/stocks/+page.server.ts` (load via beregningskerne) + `+page.svelte`. Tilføj aktie-tile på `src/routes/+page.svelte` (landing). Tilføj navigations-link.

**Layout (glassmorphism, Deep Forest):**

1. **KPI-topbjælke** (4 glassmorphism-kort):
   - Porteføljeværdi (stor DKK + sekundær USD), dagsændring i % (emerald/rose).
   - Urealiseret afkast (kr. + %, farvekodet).
   - Kostpris (samlet investeret inkl. gebyrer).
   - USD/DKK-kurs med ændringsindikator + lille "valuta-stødpude"-bidrag i kr.
2. **Visuel performance-bar** — horisontal bar der placerer aktuel værdi mellem `scenarioBands` (Krise → Kostpris → Solidt → Base → Eufori) med "DU ER HER"-markør. Markører og labels via temafarver.
3. **Porteføljetabel** — Ticker, selskab, antal, gns. kostpris/aktie, aktuel kurs (USD + dagsændring), urealiseret afkast (DKK/USD/%), **tese-status** (🟢 OK / ⚠️ under pres / 🔴 tesebrud — afledt af `breakThesisSignal` + nøgletal hvor muligt), afstand til `targetPriceUsd`. Stale-badge hvis `lastPriceSyncedAt` er gammel.
4. **Grafer (ApexCharts, CSS-variabel-farver via `getCssVar` + `{#key isDarkMode}`** — følg TEMA-0.1-mønsteret):
   - **Allokering (donut)** pr. ticker; segmentfarver fra `--color-indigo-500`, `--color-violet-500`, `--color-indigo-400`, `--color-rose-400`.
   - **Historisk udvikling (area)** — akkumuleret porteføljeværdi (fra `StockPriceDaily` + daglig fx) vs samlet kostpris-linje. Valgfri benchmark-overlay (S&P 500 normaliseret til samme startkapital).

**Acceptkriterier:**

- [ ] `/dashboard/stocks` loader udelukkende fra DB-cache (ingen eksterne kald)
- [ ] KPI'er, performance-bar, tabel og begge grafer renderer korrekt i lys + mørk tilstand
- [ ] Ingen hex-literals i chart-configs (kun `'#ffffff'`/`'transparent'`); charts skifter farve ved tema-toggle
- [ ] Tom-tilstand vises pænt hvis ingen positioner; stale-badge ved gamle kurser
- [ ] Aktie-tile tilføjet på landing page; `npm run build` passerer
- **Prioritet:** 🔴 Høj · **Kompleksitet:** Medium-høj

---

## ➕ Sprint 9.5: CRUD-transaktionshåndtering

**Fil:** `src/routes/dashboard/stocks/+page.server.ts` (actions) + modal i `+page.svelte`.

- Modalformular: Dato, Ticker (vælg eksisterende el. opret ny aktie inline), Type (Køb/Salg), Antal (brøkdele tilladt), Kurs USD, Valutakurs USD/DKK (auto-foreslå fra seneste `ExchangeRateDaily`), Kurtage (default 25), Valutaveksling (auto-beregn 0,25 % af summen, redigerbar).
- Actions: `addTransaction`, `deleteTransaction`, `addStock` (ny ticker → trigger straks en quote-sync for den).
- **Validering:** kan ikke sælge flere aktier end ejet (brug `positionFromTransactions`); dato ikke i fremtiden; positive tal.
- Live-preview af beregnet kostpris i modalen (genbrug `costBasis` via lille klient-spejling eller server-roundtrip).

**Acceptkriterier:**

- [ ] Tilføj/slet køb og salg opdaterer portefølje + KPI'er korrekt
- [ ] Oversalg blokeres med dansk fejlbesked
- [ ] Gns. anskaffelsespris genberegnes korrekt ved flere køb
- [ ] Ny ticker kan oprettes og får kurser ved næste/straks-sync
- [ ] `npm run lint && npm run build` passerer
- **Prioritet:** 🟡 Medium · **Kompleksitet:** Medium

---

## 🎛️ Sprint 9.6: Simulator & Joker-Duel

**Fil:** Komponenter i `src/lib/components/stocks/` (`ScenarioSimulator.svelte`, `JokerDuel.svelte`).

1. **5-års scenarie-simulator** (juni 2031):
   - Vælg aktie + to sliders: EPS CAGR (0–60 %) og terminal P/E (15x–200x).
   - Reaktivt (`$derived`) via `futurePrice` fra beregningskernen; viser fremtidig kurs + samlet afkast %.
   - Pædagogisk dynamisk tekst ved multipel-kompression (negativt afkast trods høj vækst) — genbrug glossary-tekst.
   - **Berigelse:** lille følsomheds-heatmap (CAGR × P/E-grid farvelagt grøn→rød efter afkast) så man ser "break-even"-linjen visuelt.
2. **Joker-Duel: PLTR vs ALAB** — sammenlign seneste kvartalstal (omsætningsvækst, P/E, marginer) side-om-side; rotation-anbefaling. Data hentes via samme quote-mekanik (tilføj ALAB som `isActive = false` reference-stock så den synkroniseres uden at indgå i porteføljen).

**Acceptkriterier:**

- [ ] Simulator opdaterer kurs/afkast øjeblikkeligt ved slider-ændring; viser kompressions-forklaring korrekt
- [ ] Heatmap renderer med temafarver
- [ ] Joker-duel viser friske tal for PLTR og ALAB
- [ ] Ingen direkte mutation af `$derived`; `npm run build` passerer
- **Prioritet:** 🟢 Lav-medium · **Kompleksitet:** Medium

---

## 📊 Sprint 9.7: Avanceret analyse (benchmark, risiko, allokering)

**Berigelse ud over oprindelig spec** — gør siden til et reelt analyseværktøj.

- **Benchmark-sammenligning:** porteføljens afkast vs S&P 500 (og evt. Nasdaq-100) over valgt periode — "slår vi markedet?" KPI + overlay på historik-grafen.
- **Risiko-/koncentrationspanel:** HHI-koncentration, største enkeltposition, sektor/tema-fordeling (alle 4 er AI/halvleder/software → eksplicit klyngerisiko-advarsel). Visualisér tema-allokering som stacked bar.
- **Valuta-eksponering:** hvor stor del af afkastet skyldes USD/DKK vs aktiekurser (fra `currencyDecomposition`).
- **Tese-overvågning:** automatisk flag pr. position når et `breakThesisSignal`-kriterie kan udledes af nøgletal (fx vækst/margin hvor tilgængeligt); ellers manuelt "tjek"-flag.
- **(Valgfri/senere) Udbytte:** GOOGL/AVGO betaler udbytte — overvej `StockDividend`-model og udbytte-justeret afkast. Markeret som fremtidig.

**Acceptkriterier:**

- [ ] Benchmark-KPI + overlay virker for valgt periode
- [ ] Koncentrations-/sektorpanel viser HHI og klyngeadvarsel
- [ ] Valuta-effekt vises separat fra kurs-effekt
- [ ] `npm run build` passerer
- **Prioritet:** 🟢 Lav-medium · **Kompleksitet:** Medium

---

## 🤖 Sprint 9.8: AI-porteføljeanalyse (gemt i DB)

**Mål:** Bruger trykker "Anmod om AI-analyse" og får en gemt, struktureret vurdering. Følg eksisterende `generateInsight`-mønster i `finance/+page.server.ts` (Gemini 2.5 Flash, `@google/generative-ai`, `GEMINI_API_KEY`).

**Fil:** `src/routes/dashboard/stocks/+page.server.ts` — actions `requestPortfolioAnalysis` og `requestStockAnalysis` (scope STOCK).

**Prompt-kontekst** (byg server-side fra beregningskernen — send strukturerede tal, ikke rå tabeller): pr. position {ticker, navn, antal, kostpris, aktuel kurs, urealiseret afkast %, P/E trailing/forward, EPS, targetPrice, investeringstese, tesebrud-signal}, porteføljetotaler, koncentration (HHI), benchmark-afkast, valuta-effekt. Inkludér glossary-tonen ("forklar jordnært for voksne danskere").

**Struktureret output** — brug `responseMimeType: 'application/json'` + `responseSchema`:

```json
{
	"overallVerdict": "HOLD | REDUCE | ADD | SELL | MIXED",
	"summaryMarkdown": "kort pædagogisk dansk opsummering",
	"positions": [
		{
			"ticker": "PLTR",
			"verdict": "REDUCE",
			"thesisStatus": "UNDER_PRESSURE",
			"rationale": "...",
			"keyRisk": "..."
		}
	],
	"portfolioRisks": ["høj koncentration i AI/halvledere", "..."],
	"suggestions": ["overvej rotation PLTR→ALAB hvis vækst < 40%", "..."]
}
```

**Robusthed:** `AbortSignal.timeout(45000)`; ved timeout returnér `{ error: 'AI-analyse tog for lang tid' }`. Sanitér API-nøgle som i finance (`replace(/^["']|["']$/g, '')`).

**DB-lagring:** gem hver analyse som ny `StockAnalysis`-række (historik, ikke upsert) med `scope`, `stockId?`, `model`, `verdict = overallVerdict`, `content = summaryMarkdown`, `data = hele JSON-objektet`, `snapshotValueDkk`.

**UI:** "Anmod om AI-analyse"-knap (spinner under kald, `use:enhance`); vis seneste analyse som kort med per-position-domme farvekodet; **historik-accordion** ("Tidligere analyser") så man ser, hvordan rådgivningen har ændret sig over tid. Per-aktie kan man anmode om en fokuseret analyse fra porteføljetabellen.

**Acceptkriterier:**

- [ ] `requestPortfolioAnalysis` returnerer valid struktureret JSON og gemmer en `StockAnalysis`-række
- [ ] Per-aktie-analyse (scope STOCK) virker fra tabellen
- [ ] Timeout/fejl håndteres med dansk besked uden at crashe siden
- [ ] Historik vises; seneste analyse fremhæves
- [ ] Kun `gemini-2.5-flash`; ingen nøgle lækket til klient; `npm run lint` passerer
- **Prioritet:** 🟡 Medium · **Kompleksitet:** Medium

---

## 🔒 Sprint 9.9: Authelia-sikkerhed

Aktieporteføljen er følsom finansdata → kræv **`two_factor`**.

I Authelia `configuration.yml` (på serveren — dokumentér i denne task):

```yaml
- domain: wish.hostrup.org
  resources:
    - '^/dashboard/stocks.*'
    - '^/api/stocks/(?!sync).*' # sync beskyttes af Bearer-token, ikke 2FA
  policy: two_factor
```

> `/api/stocks/sync` (9.2) tilgås af host-cron uden om Authelia og beskyttes i stedet af `CRON_SECRET`. Sørg for at Authelia-reglen ikke fanger sync-stien (eller at den ekskluderes som vist).

**Acceptkriterier:**

- [ ] `/dashboard/stocks` og `/api/stocks/*` (undtagen sync) kræver 2FA
- [ ] `/api/stocks/sync` virker for cron med Bearer-token, men afvises uden
- **Prioritet:** 🔴 Høj · **Kompleksitet:** Lav

---

## ✅ Sprint 9.10: Test & deploy

- [ ] `calc.test.ts` grøn (`npm run test` / vitest)
- [ ] Manuel verifikation i browser: lys + mørk, tom + fyldt portefølje, AI-analyse, simulator
- [ ] `npm run lint && npm run build` — zero type-fejl
- [ ] Deploy: `./deploy.sh "Add stock portfolio monitoring page (Sprint 9)"`
- [ ] Verificér 2FA + cron-sync i produktion; slet evt. midlertidige scripts

---

## 🛠️ Sprint 9.11: Post-launch hardening (historisk data + drift)

> **Oprindelse:** Statusaudit 30. juni 2026 afslørede 5 driftsproblemer der skal løses før 9.8 (AI-analyse) giver mening — AI'en har brug for historisk data der endnu ikke findes.

> **Forudsætning:** 9.1–9.5 er LIVE. Cron kører stabilt. Container OK. Ingen kodeændringer i 9.1–9.5 kræves.

> **Deployment:** Alle opgaver i denne sprint deployes samlet via `./deploy.sh "Sprint 9.11: Historical backfill + sync hardening"` efter at alle acceptkriterier er opfyldt.

---

### STOCK-11.1: Backfill historiske priser + FX siden porteføljens start 🔴

**Problem:** `StockPriceDaily` har kun **2 rækker pr. aktie** (25/6 + 29/6) ud af ~18 mulige handelsdage siden porteføljens start 4. juni. Den historiske graf på `/dashboard/stocks` er dermed nærmest tom. AI-analysen (9.8) vil heller ikke have nok data at arbejde med.

**Årsag:** `updateDailyCloses()` i `src/lib/server/stocks/fetchPrices.ts` (linje 98–135) henter kun chart-data med et 5-dages vindue (`period1 = now - 5`) og gemmer **kun den seneste** lukkekurs (`rows.at(-1)`). Dage uden nat-sync er permanent tabt.

**Løsning:** Tilføj en ny funktion `backfillDailyCloses()` i `src/lib/server/stocks/fetchPrices.ts` og eksponér den via sync-endpointet.

**Fil:** `src/lib/server/stocks/fetchPrices.ts`

Tilføj denne funktion (efter `updateDailyCloses`, ca. linje 135):

```typescript
/**
 * Backfill af historiske daglige slutkurser fra porteføljens tidligste transaktion
 * til i dag. Kører kun én gang (idempotent via upsert). Henter chart-data med
 * interval '1d' fra Yahoo Finance for hele perioden.
 */
export async function backfillDailyCloses(): Promise<SyncResult> {
	const stocks = await prisma.stock.findMany({
		where: { OR: [{ isActive: true }, { isBenchmark: true }] },
		include: { transactions: { orderBy: { date: 'asc' }, take: 1 } }
	});
	const result: SyncResult = { updated: [], failed: [] };

	// Tidligste transaktion bestemmer startdatoen for hele porteføljen
	const allFirstDates = stocks.flatMap((s) => s.transactions).map((t) => t.date.getTime());
	if (allFirstDates.length === 0) return result;
	const period1 = new Date(Math.min(...allFirstDates));

	for (const stock of stocks) {
		try {
			const chart = (await yahooFinance.chart(stock.ticker, {
				period1,
				interval: '1d'
			})) as unknown as YahooChart;
			const rows = chart.quotes.filter((q) => typeof q.close === 'number');
			let upserted = 0;
			for (const row of rows) {
				if (typeof row.close !== 'number') continue;
				const date = startOfDayUtc(new Date(row.date));
				await prisma.stockPriceDaily.upsert({
					where: { stockId_date: { stockId: stock.id, date } },
					update: { closePrice: row.close },
					create: { stockId: stock.id, date, closePrice: row.close }
				});
				upserted++;
			}
			result.updated.push(`${stock.ticker} (${upserted} dage)`);
		} catch (error) {
			result.failed.push({
				ticker: stock.ticker,
				error: error instanceof Error ? error.message : 'Ukendt fejl'
			});
		}
	}

	return result;
}
```

**Fil:** `src/routes/api/stocks/sync/+server.ts`

Tilføj import af `backfillDailyCloses` (linje 3–7) og en ny mode-gren i POST-handleren (linje 31–39):

```typescript
// Tilføj til import:
import { ..., backfillDailyCloses } from '$lib/server/stocks/fetchPrices';

// Tilføj i POST-handleren (efter 'fx'-blokken, ca. linje 38):
if (mode === 'backfill' || mode === 'all-backfill') {
  out.backfill = await backfillDailyCloses();
}
```

> **Vigtigt:** `mode=backfill` skal IKKE være en del af `mode=all` — det er en engangsoperation der henter mange datapunkter. Kald det manuelt.

**Backfill af FX-kurser:**

Frankfurter API understøtter historiske serier: `https://api.frankfurter.app/2026-06-04..2026-06-30?from=USD&to=DKK`. Tilføj en `backfillExchangeRates()` funktion i `fetchPrices.ts`:

```typescript
export async function backfillExchangeRates(): Promise<{
	rates: number;
	from: string;
	to: string;
}> {
	const firstTx = await prisma.stockTransaction.findFirst({ orderBy: { date: 'asc' } });
	if (!firstTx) return { rates: 0, from: '', to: '' };

	const from = firstTx.date.toISOString().slice(0, 10);
	const to = new Date().toISOString().slice(0, 10);

	const res = await fetch(`https://api.frankfurter.app/${from}..${to}?from=USD&to=DKK`);
	if (!res.ok) throw new Error(`Frankfurter svarede ${res.status}`);
	const data = (await res.json()) as { rates: Record<string, { DKK: number }> };

	let count = 0;
	for (const [dateStr, rateObj] of Object.entries(data.rates)) {
		const date = startOfDayUtc(new Date(dateStr));
		await prisma.exchangeRateDaily.upsert({
			where: { base_target_date: { base: 'USD', target: 'DKK', date } },
			update: { rate: rateObj.DKK },
			create: { base: 'USD', target: 'DKK', date, rate: rateObj.DKK }
		});
		count++;
	}

	return { rates: count, from, to };
}
```

Eksponér den i sync-endpointet under samme `mode=backfill` gren:

```typescript
if (mode === 'backfill' || mode === 'all-backfill') {
	out.backfill = await backfillDailyCloses();
	out.fxBackfill = await backfillExchangeRates();
}
```

**Verifikation efter kørsel:**

```bash
# Kør backfill manuelt
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "http://10.0.0.2:3005/api/stocks/sync?mode=backfill" | python3 -m json.tool

# Verificer i databasen
docker exec postgresql psql -U wishbuy_db -d wishbuy_db -c "
SELECT s.ticker, COUNT(*) as days, MIN(dp.date)::date as from_date, MAX(dp.date)::date as to_date
FROM \"StockPriceDaily\" dp JOIN \"Stock\" s ON s.id = dp.\"stockId\"
GROUP BY s.ticker ORDER BY s.ticker;
"
# Forventet: ~18 handelsdage pr. ticker (4. juni → 30. juni)

docker exec postgresql psql -U wishbuy_db -d wishbuy_db -c "
SELECT COUNT(*) as fx_count, MIN(date)::date, MAX(date)::date FROM \"ExchangeRateDaily\";
"
# Forventet: ~18–19 rækker (en pr. ECB-handelsdag)
```

**Acceptkriterier:**

- [ ] `backfillDailyCloses()` henter alle daglige slutkurser fra 4. juni 2026 til i dag for alle aktive aktier + benchmarks
- [ ] `backfillExchangeRates()` henter alle USD/DKK-kurser fra 4. juni til i dag via Frankfurter API
- [ ] Sync-endpointet understøtter `?mode=backfill` (kræver Bearer-token, 401 uden)
- [ ] `StockPriceDaily` har ≥15 rækker pr. ticker efter kørsel (afhænger af antal handelsdage)
- [ ] `ExchangeRateDaily` har ≥15 rækker efter kørsel
- [ ] Historisk graf i UI viser en sammenhængende kurve fra 4. juni til i dag
- [ ] Eksisterende `mode=all` og `mode=daily` er uændrede
- [ ] `npm run lint && npm run build` passerer
- **Prioritet:** 🔴 Høj · **Kompleksitet:** Medium

---

### STOCK-11.2: `updateDailyCloses()` — gem alle dage, ikke kun seneste 🟡

**Problem:** `updateDailyCloses()` (kaldt af nat-cron kl. 23:05 via `mode=all`) henter chart-data 5 dage tilbage men gemmer **kun den seneste** lukkekurs (`rows.at(-1)`). Hvis en nat-sync fejler, mister man permanent den dags data.

**Fil:** `src/lib/server/stocks/fetchPrices.ts`, linje 98–135

**Nuværende kode (problematisk):**

```typescript
const last = rows.at(-1);
if (!last || typeof last.close !== 'number') {
	throw new Error('Ingen slutkurs i svar');
}
const date = startOfDayUtc(new Date(last.date));
await prisma.stockPriceDaily.upsert({
	where: { stockId_date: { stockId: stock.id, date } },
	update: { closePrice: last.close },
	create: { stockId: stock.id, date, closePrice: last.close }
});
```

**Fix — iterér over ALLE rows og upsert hver:**

```typescript
if (rows.length === 0) {
	throw new Error('Ingen slutkurs i svar');
}
let saved = 0;
for (const row of rows) {
	if (typeof row.close !== 'number') continue;
	const date = startOfDayUtc(new Date(row.date));
	await prisma.stockPriceDaily.upsert({
		where: { stockId_date: { stockId: stock.id, date } },
		update: { closePrice: row.close },
		create: { stockId: stock.id, date, closePrice: row.close }
	});
	saved++;
}
```

Det 5-dages vindue (`period1 = now - 5`) er fint til nat-jobbet — det skaber en 5-dages overlapping buffer der fanger eventuelle manglende dage. Med denne fix gemmes **alle** dage i vinduet, ikke kun den seneste.

**Acceptkriterier:**

- [ ] `updateDailyCloses()` upsert'er alle returnerede lukkekurser i vinduet, ikke kun den seneste
- [ ] Upsert bruger `stockId_date` unique-nøgle (allerede defineret i schema) — ingen duplikater
- [ ] Nat-sync (`mode=all`) gemmer typisk 1–3 rækker pr. ticker (afh. af weekendposition)
- [ ] Eksisterende tests forbliver grønne; tilføj ikke nye tests (logikken er simpel upsert)
- [ ] `npm run lint && npm run build` passerer
- **Prioritet:** 🟡 Medium · **Kompleksitet:** Lav

---

### STOCK-11.3: Cron-logformat — tilføj newlines 🟡

**Problem:** Cron-loggen (`/hostrup/docker/projects/wishbuy/cron-sync.log`) samler alle JSON-responses på **én linje** uden separator, hvilket gør den ulæselig:

```
{"ok":true,...}{"ok":true,...}{"ok":true,...}
```

**Årsag:** Crontab-linjerne bruger `>> cron-sync.log` men curl's output ender ikke på newline.

**Nuværende crontab (fra `crontab -e`):**

```cron
0 16-22 * * 1-5 curl -fsS --max-time 90 -X POST -H "Authorization: Bearer ca07...5dd9" "http://10.0.0.2:3005/api/stocks/sync?mode=quotes" >> /hostrup/docker/projects/wishbuy/cron-sync.log 2>&1
5 23 * * 1-5 curl -fsS --max-time 120 -X POST -H "Authorization: Bearer ca07...5dd9" "http://10.0.0.2:3005/api/stocks/sync?mode=all" >> /hostrup/docker/projects/wishbuy/cron-sync.log 2>&1
```

**Fix — tilføj `; echo` efter curl så hver response får sin egen linje:**

```cron
0 16-22 * * 1-5 curl -fsS --max-time 90 -X POST -H "Authorization: Bearer ca07...5dd9" "http://10.0.0.2:3005/api/stocks/sync?mode=quotes" >> /hostrup/docker/projects/wishbuy/cron-sync.log 2>&1; echo >> /hostrup/docker/projects/wishbuy/cron-sync.log
5 23 * * 1-5 curl -fsS --max-time 120 -X POST -H "Authorization: Bearer ca07...5dd9" "http://10.0.0.2:3005/api/stocks/sync?mode=all" >> /hostrup/docker/projects/wishbuy/cron-sync.log 2>&1; echo >> /hostrup/docker/projects/wishbuy/cron-sync.log
```

**Alternativt** (renere): brug en wrapping subshell:

```cron
0 16-22 * * 1-5 (curl -fsS --max-time 90 -X POST -H "Authorization: Bearer ca07...5dd9" "http://10.0.0.2:3005/api/stocks/sync?mode=quotes"; echo) >> /hostrup/docker/projects/wishbuy/cron-sync.log 2>&1
```

**Udførelse:** Kør `crontab -e` på hosten (Fedora) og opdatér de 2 linjer. Kræver **ingen kodeændring eller deploy** — kun host-crontab.

**Verifikation:** Vent til næste cron-kørsel (kl. 16:00 CEST på en hverdag), derefter:

```bash
tail -3 /hostrup/docker/projects/wishbuy/cron-sync.log
# Forventet: hver linje er ét selvstændigt JSON-objekt
cat /hostrup/docker/projects/wishbuy/cron-sync.log | python3 -c "import sys,json; [json.loads(l) for l in sys.stdin if l.strip()]; print('OK')"
```

**Acceptkriterier:**

- [ ] Hver cron-kørsel producerer præcis én JSON-linje i logfilen
- [ ] Logfilen kan parses linje-for-linje som JSONL (ét objekt pr. linje)
- [ ] Eksisterende logindhold behøver ikke migreres (nye linjer starter bare korrekt)
- **Prioritet:** 🟡 Medium · **Kompleksitet:** Triviel (kun crontab-ændring)

---

### STOCK-11.4: Stale-badge UX — vis "Markedet lukket" uden for handelstid 🟢

**Problem:** Stale-grænsen er 26 timer (`STALE_AFTER_MS` i `+page.server.ts` linje 14). Det betyder:

- **Hver morgen** (08:00–16:00 CEST) viser UI'et "stale"-badge på alle aktier — selvom kursen er den seneste tilgængelige.
- **Hele weekenden** viser stale fra lørdag formiddag og frem.

Det er teknisk korrekt, men forvirrer brugeren ("er noget galt med sync?").

**Fil:** `src/routes/dashboard/stocks/+page.server.ts`, linje 14 + linje 67–68

**Nuværende kode:**

```typescript
const STALE_AFTER_MS = 26 * 60 * 60 * 1000;
// ...
const isStale =
	!stock.lastPriceSyncedAt || now - stock.lastPriceSyncedAt.getTime() > STALE_AFTER_MS;
```

**Fix:** Tilføj markedstids-awareness. Returnér et nyt felt `marketOpen` (boolean) fra load:

```typescript
function isUsMarketLikelyOpen(): boolean {
	const now = new Date();
	const day = now.getUTCDay(); // 0=søndag, 6=lørdag
	if (day === 0 || day === 6) return false;
	const utcHour = now.getUTCHours();
	const utcMin = now.getUTCMinutes();
	const minutesSinceMidnight = utcHour * 60 + utcMin;
	// NYSE åben ca. 13:30–20:00 UTC (9:30–16:00 ET). Lidt slæk: 13:00–20:30.
	return minutesSinceMidnight >= 780 && minutesSinceMidnight <= 1230;
}
```

Returnér `marketOpen: isUsMarketLikelyOpen()` fra load-funktionen (tilføj til return-objektet linje 164–178).

**Fil:** `src/routes/dashboard/stocks/+page.svelte`

I UI'et: vis stale-badge **kun** hvis `data.marketOpen === true` OG kursen er stale. Hvis markedet er lukket, vis i stedet en diskret "Markedet lukket"-indikator nær "Sidst opdateret"-teksten.

Eksempel (pseudokode i Svelte):

```svelte
{#if position.isStale && data.marketOpen}
	<span class="text-amber-500">⚠️ Forældet kurs</span>
{/if}

<!-- I header/footer-sektionen: -->
{#if !data.marketOpen}
	<span class="text-xs text-slate-400">🔒 US-marked lukket</span>
{/if}
```

> **Bemærk:** `amber-*` er omkortet til pink i temaet (se AGENTS.md). Brug `text-yellow-500` eller `text-orange-500` fra standard Tailwind i stedet, eller en CSS custom property.

**Acceptkriterier:**

- [ ] Stale-badge vises **kun** under markedstid (man–fre ca. 15:30–22:00 CEST)
- [ ] Uden for markedstid vises en diskret "Marked lukket"-tekst i stedet
- [ ] Stale-logikken i `+page.server.ts` forbliver uændret (den bruges stadig til at bestemme hvornår en kurs er gammel)
- [ ] `marketOpen`-boolean returneres fra load-funktionen
- [ ] Ingen hardkodede hex-farver — brug temaklasser
- [ ] `npm run lint && npm run build` passerer
- **Prioritet:** 🟢 Lav · **Kompleksitet:** Lav

---

### STOCK-11.5: ALAB benchmark — verificer og ryd op 🟢

**Problem:** Seed-filen (`prisma/seed-stocks.ts`) opretter 3 benchmarks/referencer: `^GSPC`, `QQQ` og `ALAB`. Men kun `^GSPC` og `QQQ` er aktive i produktion. ALAB er enten deaktiveret (`isActive = false`) eller fejlet ved seed.

**Undersøgelse:**

```bash
docker exec postgresql psql -U wishbuy_db -d wishbuy_db -c "
SELECT ticker, name, \"isActive\", \"isBenchmark\", \"currentPrice\", \"lastPriceSyncedAt\"
FROM \"Stock\" WHERE ticker = 'ALAB';
"
```

**Beslutning:**

- Hvis ALAB er `isActive = false` og ikke bruges som benchmark → slet den fra databasen og seed-filen (dræber forfængeligt data).
- Hvis ALAB er `isBenchmark = true` men `isActive = false` → sæt den aktiv og kør sync, eller fjern den helt.
- Opdatér `prisma/seed-stocks.ts` så den matcher produktionstilstanden.

**Acceptkriterier:**

- [ ] ALAB's tilstand er afklaret og dokumenteret (aktiv/slettet/omsat)
- [ ] Seed-filen (`prisma/seed-stocks.ts`) matcher produktionens `Stock`-tabel
- [ ] Ingen "ghost" aktier i databasen der ikke er aktive og ikke bruges
- [ ] `npm run lint && npm run build` passerer
- **Prioritet:** 🟢 Lav · **Kompleksitet:** Triviel

---

# 🔗 Sprint 10: Internt MCP-server interface (projekt-bredt)

**Mål:** Eksponér hele Hostrup Hub (ønsker, finans, **aktier**, ugeplan) via et **internt MCP-server-interface**, så eksterne AI-agenter (Claude m.fl.) nemt kan læse status og udføre afgrænsede handlinger — uden at gå uden om forretningslogikken. Bygger oven på beregningskernen fra 9.3 og de eksisterende Prisma-modeller.

> **Hvorfor projekt-bredt:** MCP-serveren bliver Hubs officielle agent-API. Aktie-domænet er første store forbruger, men interfacet dækker alle domæner fra dag ét, så agenter kan hjælpe på tværs (fx "kategorisér disse bank-transaktioner", "tilføj et ønske", "lav en aktieanalyse").

## 🏗️ Sprint 10.1: MCP-transport & sikkerhed

**Teknik:** `@modelcontextprotocol/sdk` (TypeScript) med **Streamable HTTP-transport** mountet i SvelteKit på `src/routes/api/mcp/+server.ts` (`POST` + `GET`). Genbruger samme Prisma-klient og `src/lib/server/stocks/calc.ts`.

- `npm install @modelcontextprotocol/sdk zod`.
- **Auth:** Bearer-token (`MCP_TOKEN` i `.env`). Tilføj `/api/mcp` til `isBypassedPath` i `hooks.server.ts` (uden om Authelia-header-tjek), men kræv selv gyldig `Authorization: Bearer`-token i endpointet → ellers 401. Sikkerhedsnote i koden som ved calendar-feed.
- **Authelia:** bloker offentlig adgang til `^/api/mcp.*` (kun lokalt net / Tailscale + token). Dokumentér regel.
- **Bruger-kontekst:** MCP-kald kører som en dedikeret agent-bruger (eller bruger sendt i token-claim) for `userId`-bundne data (ønsker, analyser).

**Acceptkriterier:**

- [ ] `POST /api/mcp` taler MCP over Streamable HTTP; `initialize` + `tools/list` virker via MCP-klient
- [ ] Kald uden gyldig token afvises (401); Authelia blokerer offentlig adgang
- [ ] Ingen secrets eller rå SQL; al adgang via Prisma/beregningskerne
- **Prioritet:** 🟡 Medium · **Kompleksitet:** Medium-høj

## 🧰 Sprint 10.2: Tools & resources (read)

Read-only først (lav risiko). Alle tools zod-validerede, dansk-beskrevne.

- **Aktier:** `stocks_get_portfolio` (totaler, positioner, allokering, koncentration), `stocks_list_analyses`, `stocks_get_stock(ticker)`.
- **Finans:** `finance_get_summary(from,to)`, `finance_list_transactions(filter)`, `finance_list_categories`.
- **Ønsker:** `wishes_list(status?)`, `wishes_get(id)`.
- **Ugeplan:** `weekly_get(year,week)`.
- **Resources:** `hub://schema` (domæne-/feltbeskrivelser), `hub://glossary` (aktie-begreber fra 9.0) så agenter har kontekst.

**Acceptkriterier:**

- [ ] Hvert read-tool returnerer struktureret JSON identisk med tal i UI (delt beregningskerne)
- [ ] `tools/list` viser alle med danske beskrivelser; zod-validering afviser dårlige args
- **Prioritet:** 🟡 Medium · **Kompleksitet:** Medium

## ✍️ Sprint 10.3: Tools (afgrænset write) + AI-analyse via MCP

Write-tools med streng validering og **ingen pengeoverførsler/handler** (kun bogføring/registrering — i tråd med Hubs finansregler):

- `stocks_add_transaction` (samme validering som 9.5 — fx oversalg blokeres).
- `stocks_request_analysis(scope, ticker?)` — kører 9.8-analysen og gemmer i `StockAnalysis`; returnerer struktureret resultat. **Dette er kernen i brugerens ønske: agenter udefra kan anmode om en analyse, og den gemmes i DB.**
- `finance_categorize_transaction(id, categoryId)` og `wishes_add(...)` — genbrug eksisterende actions-logik.
- Alle write-tools logger hvem/hvad (audit) og er idempotente hvor muligt.

**Acceptkriterier:**

- [ ] Ekstern agent kan via MCP anmode om en aktieanalyse → række oprettes i `StockAnalysis` og vises i UI'ets historik
- [ ] Write-tools håndhæver samme valideringer som UI-actions; ingen handels-/overførselsfunktioner eksponeres
- [ ] `npm run lint && npm run build` passerer; dokumentér tilslutning af MCP-klient i README
- **Prioritet:** 🟢 Lav-medium · **Kompleksitet:** Medium
