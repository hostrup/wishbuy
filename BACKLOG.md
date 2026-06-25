# 📋 Backlog — Hostrup Hub

Konsolidering af `wishbuy`, `wishbuy_analytics` og `ugeplan` til ét samlet husholdningssystem.

Sprint 1-3 (hardening, Python-oprydning, bankimport) er gennemført — commit `aaec1ef`, 25. juni 2026.

---

## 🔴 Sprint 0: Tema-kritiske fejl (gør nu — blokerer alt andet design)

Disse fejl er identificeret i [kodeanalyse 25. juni 2026] og betyder at designsystemet ikke virker ensartet på tværs af sider. Løs dem inden nyt UI-arbejde startes.

---

### TEMA-0.1: Hardkodede hex-farver i ApexCharts omgår temaet

**Fil:** `src/routes/dashboard/finance/+page.svelte`

**Problem:** ApexCharts-konfigurationerne (`barOptions`, `cumulativeOptions`, `dayOfWeekOptions`) bruger rå hex-farver der aldrig vil skifte med temaet:
- `colors: ['#6366f1']` — standard Tailwind indigo, ikke Electric Indigo `#6c5ce7`
- `colors: ['#10b981']`, `['#f43f5e']`
- `borderColor: '#334155'` / `'#e2e8f0'` (grid-farver)
- `stroke.colors: ['#1e293b']` / `['#ffffff']` (donut separator)

**Fix:** Hent CSS custom properties dynamisk i `onMount` og byg en `themeColors`-hjælper:
```typescript
function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
// Brug i chart options:
colors: [getCssVar('--color-indigo-500')]
```

**Acceptkriterium:** Alle chart-farver trækker fra `--color-*` CSS-variabler. Ingen hex-literals i chart-config bortset fra transparente (`'transparent'`, `'#ffffff00'`).

- **Prioritet:** 🔴 Høj
- **Kompleksitet:** Lav

---

### TEMA-0.2: Inline conic-gradient i Wishes omgår temaet

**Fil:** `src/routes/dashboard/wishes/+page.svelte`

**Problem:** KPI-kortene bruger inline `style`-attributter med hardkodede hex-farver:
```html
style="background: conic-gradient(#6366f1 0% {wishVsBuyPct}%, #cbd5e1 ...)"
style="background: conic-gradient(#8b5cf6 0% {sharedPct}%, #f43f5e ...)"
style="background: conic-gradient(#10b981 0% {buySharedPct}%, #f59e0b ...)"
```

**Fix:** Brug `var(--color-*)` i inline styles:
```html
style="background: conic-gradient(var(--color-indigo-500) 0% {wishVsBuyPct}%, var(--color-slate-300) {wishVsBuyPct}% 100%)"
```

**Acceptkriterium:** Alle tre conic-gradient-kort bruger CSS custom properties. Ingen hex-literals i `style`-attributter.

- **Prioritet:** 🔴 Høj
- **Kompleksitet:** Lav

---

### TEMA-0.3: Inkonsistente mørke sidebaggr. — to sider bruger `bg-[#0b1120]`

**Filer:** `src/routes/dashboard/finance/+page.svelte` linje 369, `src/routes/dashboard/import/+page.svelte` linje 89

**Problem:** Finance og Import bruger `dark:bg-[#0b1120]` (hardkodet hex), mens Wishes bruger `dark:bg-slate-900` (tema-klasse). Resultatet er tre sider med tre visuelt forskellige mørke baggrunde.

**Fix:** Udskift `dark:bg-[#0b1120]` med `dark:bg-slate-950` på både finance og import (svarende til `#080c08` fra temaet — mørkest trin, passer til intended look).

**Acceptkriterium:** Alle tre dashboard-sider har samme mørke baggrunds-klasse. Ingen `bg-[#...]`-literals på sidebaggr.

- **Prioritet:** 🔴 Høj
- **Kompleksitet:** Meget lav

---

### TEMA-0.4: Svelte 5 `$derived`-mutation fejler stille i Finance

**Fil:** `src/routes/dashboard/finance/+page.svelte` linje 249–272

**Problem:** `onMount`-koden forsøger at mutere `$derived`-objekterne direkte:
```typescript
donutOptions.theme.mode = mode;     // $derived — kan ikke muteres
barOptions.grid = { ... };          // $derived — kan ikke muteres
```
Mutationen lykkedes kortvarigt men næste reaktiv genberegning nulstiller til de `$derived`-beregnede værdier. Tema-skift i charts virker ikke korrekt.

**Fix:** Erstat `MutationObserver`-mønsteret med Svelte 5's reaktive system. `isDarkMode` skal aflæses ved mount og reagere på HTML class-ændringer via `$effect`:
```typescript
let isDarkMode = $state(false);

$effect(() => {
  const observer = new MutationObserver(() => {
    isDarkMode = document.documentElement.classList.contains('dark');
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  isDarkMode = document.documentElement.classList.contains('dark');
  return () => observer.disconnect();
});
```
Da `barOptions`, `donutOptions` osv. er `$derived` fra `isDarkMode`, opdateres de automatisk. `{#key isDarkMode}` på chart-wrappers sikrer at ApexCharts gendannes.

**Acceptkriterium:** Tema-toggle opdaterer charts korrekt. Ingen direkte mutation af `$derived`-objekter.

- **Prioritet:** 🔴 Høj
- **Kompleksitet:** Lav

---

### TEMA-0.5: Amber remappet til pink — semantisk kollision

**Fil:** `src/routes/layout.css` linje 63–73, `src/routes/dashboard/finance/+page.svelte` linje 402–406

**Problem:** `--color-amber-500` er remappet til Editorial Pink (`#e8879e`) i temaet. Finance-siden bruger `amber`-klasser på "Ønsker"-navigationsknappen og "Top Kategori" KPI-kortet forventende en varm orange-farve — men de renderer nu pink.

Wishes-siden bruger ligeledes `⭐ text-amber-400` til stjernedisplay — `amber-400` = `#f5b87a` (stadig lys orange) men `amber-500`+ er pink. Inkonsistensen skabes af at amber-skalaen er halvt orange / halvt pink.

**Fix-muligheder (vælg én):**
- **A (Anbefalet):** Fjern amber-remapping fra `layout.css`. Brug i stedet eksplicitte `rose-*`-klasser de steder der ønsker pink.
- **B:** Remap amber konsistent (alle trin → orange-nuancer) og brug `rose-*` til pink-accenter.

**Acceptkriterium:** Amber-klasser giver ét konsistent resultat (enten orange eller pink — ikke begge). Ingen visuel forvirring på finance-navigationens farveintention.

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Lav

---

### TEMA-0.6: Inkonsistent kortstruktur — glassmorphism vs. flad

**Problem:** Finance bruger gennemgående glassmorphism (`bg-white/80 backdrop-blur-xl border-slate-200/50`). Wishes bruger flade kort (`bg-white shadow-sm border-slate-200`). Import blander begge stilarter.

**Fix:** Alle dashboard-sider bruger glassmorphism-mønsteret defineret i CLAUDE.md. Opdatér Wishes og Import til at matche Finance.

```html
<!-- Standardkort på alle sider -->
<div class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80">
```

**Acceptkriterium:** Alle tre dashboard-sider har visuelt konsistent kortstruktur.

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Medium (mange steder i wishes/import)

---

## 🟠 Sprint 4: Navngivning & Velkomstside

### NAVN-4.1: Bekræft app-navn

- App-package hedder allerede `hostrup-hub` i `package.json`
- Titel i `+layout.svelte` er allerede "Hostrup Hub"
- **Status:** ✅ Effektivt besluttet — brug "Hostrup Hub"

---

### FRONT-4.2: Byg fælles velkomstside (tile-menu)

**Beskrivelse:** `src/routes/+page.svelte` er i dag Ønskebrønden. Den flyttes til `/dashboard/wishes` og erstattes af en tile-baseret landing page.

**Rute-omlægning:**
- `/` → ny velkomstside (tiles)
- `/dashboard/wishes` → Ønskebrønden (flyttes fra `/`)
- `/dashboard/finance` → Cockpit (allerede korrekt)
- `/dashboard/import` → Bankimport (allerede korrekt)
- `/dashboard/weekly` → Ugeplan (placeholder til Sprint 7)

**Tile-layout:**
```
┌──────────────────────────────────────────────────┐
│              🏠 Hostrup Hub                       │
│                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│   │  🎁      │  │  📊      │  │  🏦      │     │
│   │ Ønsker   │  │ Økonomi  │  │ Bankimp. │     │
│   └──────────┘  └──────────┘  └──────────┘     │
│                                                  │
│   ┌──────────┐  ┌──────────┐                    │
│   │  📅      │  │  ⚙️      │                    │
│   │ Ugeplan  │  │ Profil   │                    │
│   └──────────┘  └──────────┘                    │
└──────────────────────────────────────────────────┘
```

**Teknisk:**
- Flyt nuværende `+page.svelte` + `+page.server.ts` til `src/routes/dashboard/wishes/`
- Opret ny `src/routes/+page.svelte` som statisk tile-menu (ingen server-load)
- Ugeplan-tile linker til `https://ugeplan.hostrup.org` (eksisterende app, til migrering i Sprint 7)
- Profil-tile: åbner profil-modal (samme som nuværende modal i wishes)

**Acceptkriterier:**
- [ ] `/` viser tile-menu med alle 5 tiles
- [ ] `/dashboard/wishes` viser Ønskebrønden (ingen funktionsregression)
- [ ] Alle interne links i finance/import opdateret til `/dashboard/wishes`
- [ ] `npm run build` passerer

- **Prioritet:** 🟠 Medium-høj
- **Kompleksitet:** Medium

---

## 🟡 Sprint 5: AI Kategorisering i Import

### AI-5.1: `suggestCategories` server action

**Beskrivelse:** Ny action i `src/routes/dashboard/import/+page.server.ts`. Sender ukendte transaktioner (kun dem med `categoryName === 'Ukendt'`) til Gemini 2.5 Flash og modtager `[{ keyword, categoryName }]` som JSON.

**Model:** Brug `gemini-2.5-flash` (samme model som `generateInsight` i finance).

**Acceptkriterier:**
- [ ] Action eksisterer og returnerer category-forslag
- [ ] Fejl-håndtering ved API-timeout (Gemini kan være langsom)
- [ ] Kun `Ukendt`-kategoriserede transaktioner sendes til AI

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Lav-medium

---

### AI-5.2: UI-integration i preview

**Beskrivelse:** "🤖 Kategorisér med AI"-knap i import preview-steget. Viser AI-forslag inline i tabellen. Brugeren godkender individuelt eller samlet inden gem.

**Acceptkriterier:**
- [ ] Knap er kun synlig i preview-trin med ukendte transaktioner
- [ ] Loading-state mens AI arbejder
- [ ] Forslag markeres tydeligt (fx gul baggrund + 🤖-ikon)
- [ ] Brugeren kan override forslaget inden gem

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Medium

---

### AI-5.3: Auto-oprettelse af MappingRules

**Beskrivelse:** Når en bruger godkender et AI-forslag, oprettes en `MappingRule` med keyword → kategori, så fremtidige imports auto-mapper samme butik/tekst.

**Acceptkriterier:**
- [ ] `MappingRule` oprettes kun ved eksplicit bruger-godkendelse (ikke automatisk)
- [ ] Duplikate keywords overskrives ikke — vis advarsel hvis keyword allerede eksisterer med anden kategori

- **Prioritet:** 🟡 Medium
- **Kompleksitet:** Lav

---

## 🟢 Sprint 6: Performance & Afvikling

### PERF-6.1: Database-aggregationer i Finance load

**Problem:** Finance-siden aggregerer transaktioner i TypeScript (in-memory loops). For store datasæt er dette langsomt.

**Fix:** Erstat med Prisma `_sum`, `_count`, `groupBy` og `aggregate` kald direkte i `+page.server.ts`.

- **Prioritet:** 🟢 Lav-medium
- **Kompleksitet:** Medium

---

### PERF-6.2: SQL-optimeret transaktionsliste

**Problem:** `recentTransactions` henter alle transaktioner i perioden og sorterer/filtrerer in-memory.

**Fix:** Push sortering og filtrering til Prisma (`orderBy`, `where`) og implementer server-side paginering.

- **Prioritet:** 🟢 Lav
- **Kompleksitet:** Medium

---

### DEPLOY-6.3: Pensionér `wishbuy_analytics` (Streamlit)

**Beskrivelse:** Fjern `wishbuy_analytics`-servicen fra `projects.yml` (docker compose), frigør port 8501.

**Forudsætning:** Finance-dashboard dækker alle Streamlit-funktioner.

**Acceptkriterium:** `wishbuy_analytics`-containeren kører ikke, port 8501 er fri.

- **Prioritet:** 🟢 Lav
- **Kompleksitet:** Meget lav

---

## 🔵 Sprint 7: Ugeplan Migration

### UP-7.1: Portér database-schema

Tilføj følgende modeller til `prisma/schema.prisma` fra den standalone ugeplan-app:
`Person`, `Recipe`, `WeekPlan`, `DayPlan`, `DayPlanPerson`

---

### UP-7.2: Portér UI

Flyt `[year]/[week]/+page.svelte`, `DayCard.svelte` og settings fra `ugeplan.hostrup.org`.

---

### UP-7.3: Portér kalender-feed

`/api/calendar/feed.ics` med Home Assistant bypass-token.

---

### UP-7.4: Fjern standalone ugeplan-container

Fjern `ugeplan`-service fra `projects.yml` efter vellykket migration.

---

## ⚪ Sprint 8: Branding & Finpudsning

### BRAND-8.1: Opdatér app-navn, favicon, meta-tags

Skift `<title>`, OpenGraph meta-tags og favicon til "Hostrup Hub".

### BRAND-8.2: Opdatér Docker service-navn & NPM proxy host

Omdøb Docker-service og skift domæne til `hub.hostrup.org`.

---

## ✅ Gennemførte sprints

| Sprint | Indhold | Dato |
|---|---|---|
| Sprint 1-3 | Hardening (7 fixes), Python-oprydning, bankimport med CSV/MD5/mapping rules | 25. juni 2026 |
