# 📋 Wishbuy & Analytics Assimilering - Task Backlog

Dette er den eksekverbare task-liste for assimileringen af `wishbuy_analytics` ind i `wishbuy` samt udvidelsen til et samlet husholdningssystem. Listen er struktureret i prioriterede Sprints.

> **Beslutning 25. juni 2026:** Sprint 4 (Antigravity SDK) udskydes. Eksisterende `@google/generative-ai` Node SDK beholdes til både insights og kategorisering. Python child process tilføjer unødvendig kompleksitet uden funktionel gevinst.

---

## 🏃 Sprint 1: Kritiske Retninger & Type-sikkerhed (Hardening & Bug-fixing)

Disse opgaver løser akutte compiler-fejl, sårbarheder og mulige servernedbrud i SvelteKit-projektet.

- [ ] **TS-1.1: Fiks variable hoisting fejl i dashboard**
  - **Beskrivelse:** Flyt definitionen af `isDarkMode = $state(false)` til toppen af `<script>` i `src/routes/dashboard/+page.svelte`.
  - **Status:** ⬜ Udestående
- [ ] **TS-1.2: Løs type-mismatch ved kategori-ikoner**
  - **Beskrivelse:** Opdater state-typen `editingCategory` i Svelte til at tillade `icon: string | null`.
  - **Status:** ⬜ Udestående
- [ ] **TS-1.3: Indfør try-catch omkring JSON.parse**
  - **Beskrivelse:** Sikr parsing af `transactionIds` i `bulkGroupToWish` server action i `+page.server.ts`.
  - **Status:** ⬜ Udestående
- [ ] **TS-1.4: Validering af dato-parametre i url-load**
  - **Beskrivelse:** Indfør regex-tjek (`/^\d{4}-\d{2}-\d{2}$/`) på `from` og `to` parametre i `+page.server.ts`.
  - **Status:** ⬜ Udestående
- [ ] **TS-1.5: Authorization check på server actions**
  - **Beskrivelse:** Valider at det pågældende `itemId` tilhører den loggede bruger (`locals.user.id`) før ændringer udføres i actions som `deleteItem`, `toggleStatus` osv.
  - **Status:** ⬜ Udestående
- [ ] **TS-1.6: XSS-validering af ønske-URL'er**
  - **Beskrivelse:** Valider at links starter med `http://` eller `https://` under `createItem`.
  - **Status:** ⬜ Udestående
- [ ] **TS-1.7: HTML-sanitering af AI Advisor output**
  - **Beskrivelse:** Integrer `DOMPurify` (eller `isomorphic-dompurify`) til at sanitere AI-markdown outputtet før rendering i `+page.svelte`.
  - **Status:** ⬜ Udestående

---

## 🏃 Sprint 2: Konceptuel Oprydning (Category & Service Clean)

Disse opgaver sikrer den rette opdeling af kategorier og fjerner unødvendige baggrundsscripts.

- [ ] **DB-2.1: Ensret transaktionskategorier**
  - **Beskrivelse:** Udrul den endelige liste over transaktionskategorier (baseret på 2026-migreringen) til `TransactionCategory` tabellen i databasen.
  - **Status:** ⬜ Udestående
- [ ] **DB-2.2: Bevar adskilte tabeller for ønsker og økonomi**
  - **Beskrivelse:** Valider at ønsker (`Category`) og transaktioner (`TransactionCategory`) forbliver i separate tabeller for at undgå datalæk mellem domænerne.
  - **Status:** ⬜ Udestående
- [ ] **DB-2.3: Fjern deaktiverede Python scripts**
  - **Beskrivelse:** Slet `db_analysis.py`, `migrate_categories.py` og `auto_map.py` i `wishbuy_analytics` for at undgå forvirring.
  - **Status:** ⬜ Udestående

---

## 🏃 Sprint 3: Bank-import i SvelteKit (Feature Porting)

Disse opgaver genskaber Streamlits CSV-upload og regelhåndtering i SvelteKit.

- [ ] **FE-3.1: Design importside i SvelteKit**
  - **Beskrivelse:** Opret ruten `/dashboard/import` med en flot fil-uploader.
  - **Status:** ⬜ Udestående
- [ ] **BE-3.2: CSV Parsing & MD5 hashing i backend**
  - **Beskrivelse:** Opret server action der modtager CSV, parser den via `papaparse` og beregner MD5 hashes på transaktioner (`Dato + Tekst + Beløb + Løbenummer`) i TypeScript.
  - **Status:** ⬜ Udestående
- [ ] **BE-3.3: Port kort-identifikation og mapping-regler**
  - **Beskrivelse:** Implementer regex-matching på kortoplysninger (Mathilde/Ronni) og automatisk lookup i `MappingRule` tabellen i server-koden.
  - **Status:** ⬜ Udestående
- [ ] **FE-3.4: Opret Svelte Data Editor**
  - **Beskrivelse:** Implementer en interaktiv tabel i frontend, hvor brugeren kan godkende eller manuelt ændre kategorier før gemning.
  - **Status:** ⬜ Udestående

---

## 🏃 Sprint 4: AI Kategorisering i SvelteKit (Node SDK)

Erstatter det gamle Python Gemini-kald med eksisterende `@google/generative-ai` Node SDK (samme som bruges til AI Advisor).

> **Ændring fra oprindelig plan:** Vi beholder Node SDK'et. Ingen Python child process. Ingen Antigravity SDK.

- [ ] **AI-4.1: AI-kategorisering i import-flowet**
  - **Beskrivelse:** Genbrug Gemini 2.5 Flash via `@google/generative-ai` til at kategorisere transaktioner der ikke matches af eksisterende mapping rules. Returner `{category, keyword}` structured output.
  - **Status:** ⬜ Udestående
- [ ] **AI-4.2: Retrospektiv AI-databaseoprydning**
  - **Beskrivelse:** Tilføj en "Kør AI Oprydning" knap på dashboardet, der kalder Gemini til at kategorisere historiske u-kategoriserede poster.
  - **Status:** ⬜ Udestående

---

## 🏃 Sprint 5: Performance-Optimering & Afvikling

Disse opgaver optimerer side-loads og pensionerer den gamle Streamlit app.

- [ ] **PERF-5.1: Skift forside-load til database-aggregationer**
  - **Beskrivelse:** Erstat in-memory summering af transaktioner i `+page.server.ts` med Prisma database aggregates (`_sum` og `groupBy`).
  - **Status:** ⬜ Udestående
- [ ] **PERF-5.2: Optimering af dashboard transaktionsliste**
  - **Beskrivelse:** Flyt in-memory sortering og filtrering til SQL-forespørgsler i database-laget.
  - **Status:** ⬜ Udestående
- [ ] **DEPLOY-5.3: Pensionering af Streamlit container**
  - **Beskrivelse:** Fjern `wishbuy_analytics` servicen fra `projects.yml` og frigør port 8501. Kør deploy for at genstarte systemerne.
  - **Status:** ⬜ Udestående

---

## 🏃 Sprint 6: Samlet Startside (Tile Navigation)

Opret en ny landingsside der fungerer som "hub" for hele systemet.

- [ ] **NAV-6.1: Design og implementer tile-menu landing page**
  - **Beskrivelse:** Erstat nuværende forside (`/`) med et tile-baseret dashboard med store, ikon-tunge knapper:
    - 🎁 **Ønskebrønden** → `/dashboard/wishes`
    - 📊 **Økonomi** → `/dashboard/finance` (nuværende dashboard)
    - 🏦 **Bankimport** → `/dashboard/import`
    - 📅 **Ugeplan** → `/dashboard/weekly`
  - **Status:** ⬜ Udestående
- [ ] **NAV-6.2: Reorganisér rute-struktur**
  - **Beskrivelse:** Flyt nuværende dashboard til `/dashboard/finance`. Opret placeholder routs for `/dashboard/wishes` (nuværende forside) og `/dashboard/weekly` (ugeplan).
  - **Status:** ⬜ Udestående

---

## 🏃 Sprint 7: Ugeplan Migration

Migrér `ugeplan` projektets funktionalitet ind i det samlede system.

- [ ] **UP-7.1: Portér ugeplan database-schema til wishbuy**
  - **Beskrivelse:** Tilføj `Person`, `Recipe`, `WeekPlan`, `DayPlan`, `DayPlanPerson` tabeller til wishbuys Prisma-schema. Bevar eksisterende data via migrering.
  - **Status:** ⬜ Udestående
- [ ] **UP-7.2: Portér ugeplan UI (SvelteKit routes + komponenter)**
  - **Beskrivelse:** Flyt `[year]/[week]/+page.svelte`, `DayCard.svelte`, `settings/+page.svelte` ind i wishbuy under `/dashboard/weekly`. Bevar det "Apple-simple" design.
  - **Status:** ⬜ Udestående
- [ ] **UP-7.3: Portér kalender-feed endpoint**
  - **Beskrivelse:** Flyt `/api/calendar/feed.ics` til wishbuy. Bevar bypass i `hooks.server.ts` så Home Assistant på `10.0.0.2` kan tilgå uden auth.
  - **Status:** ⬜ Udestående
- [ ] **UP-7.4: Fjern standalone ugeplan container**
  - **Beskrivelse:** Efter succesfuld migrering, fjern `ugeplan` servicen fra `projects.yml` og frigør port 3005.
  - **Status:** ⬜ Udestående

---

## 🏃 Sprint 8: Navngivning & Branding

Find et nyt navn til det samlede system og opdatér branding.

- [ ] **BRAND-8.1: Vælg nyt navn til den samlede løsning**
  - **Beskrivelse:** Systemet er nu et komplet husholdningsværktøj (ønsker, økonomi, ugeplan, bankimport). Forslag til afvejning:
    - **Hostrup Hub** — engelsk, clean, moderne
    - **Hjemmebasen** — dansk, varmt, indbydende
    - **Familiestyring** — dansk, beskrivende, lidt tørt
    - **Husholderen** — dansk, personligt, med kant
    - **Samlingspunktet** — dansk, fællesskabsorienteret
  - **Status:** ⬜ Udestående (afventer Ronnis valg)
- [ ] **BRAND-8.2: Opdatér app-name, favicon, og meta-tags**
  - **Beskrivelse:** Skift app title, PWA manifest, favicon til nyt navn.
  - **Status:** ⬜ Udestående
- [ ] **BRAND-8.3: Opdatér Docker service-navn og NPM proxy host**
  - **Beskrivelse:** Skift container-navn og NPM proxy host fra `wishbuy` til det nye navn.
  - **Status:** ⬜ Udestående

---

## 📅 Eksekveringsplan (Sprint 1-3)

Fokus: Få samlet wishbuy og wishbuy_analytics til ét fungerende system.

### Dag 1: Sprint 1 — Hardening (estimeret: 2 timer)
1. **TS-1.1** → Flyt `isDarkMode` til toppen af script-tag
2. **TS-1.3** → `try-catch` omkring `JSON.parse` i `bulkGroupToWish`
3. **TS-1.4** → Regex-validering af `from`/`to` dato-parametre
4. **TS-1.5** → Authorization checks på `deleteItem`, `toggleStatus`, `changeItemCategory`, `changeItemUser`, `changeItemExpenseType`
5. **TS-1.6** → URL-validering i `createItem` (kun `http://`/`https://`)
6. **TS-1.2** → Type-fix for `editingCategory.icon`
7. **TS-1.7** → `DOMPurify` på AI-markdown output

### Dag 1-2: Sprint 2 — Oprydning (estimeret: 30 min)
1. **DB-2.3** → Slet de tre Python scripts
2. **DB-2.1 & 2.2** → Verificer kategorier (allerede gjort via `migrate_2026.ts` — tjek status)

### Dag 2-3: Sprint 3 — Bank-import (estimeret: 3-4 timer)
1. **FE-3.1** → Opret `/dashboard/import` route med layout
2. **BE-3.2** → CSV parser + MD5 hashing server action
3. **BE-3.3** → Kort-identifikation + mapping rules opslag
4. **FE-3.4** → Interaktiv preview/godkendelses-tabel

### Checkpoint: Efter Sprint 3
- ✅ Bank-import virker i SvelteKit
- ✅ Brugeren kan uploade, preview'e, redigere og gemme transaktioner
- 🎯 Streamlit kan pensioneres (Sprint 5.3) når alt er valideret