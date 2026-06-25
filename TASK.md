# 📋 Wishbuy → [Nyt Navn] — Task Backlog

Konsolidering af `wishbuy`, `wishbuy_analytics` og `ugeplan` til ét samlet husholdningssystem.

> **Beslutning 25. juni 2026:** Antigravity SDK droppet — Node `@google/generative-ai` beholdes.

---

## ✅ Sprint 1-3: Gennemført 25. juni 2026

Hardening (7 fixes), Python oprydning, bankimport med CSV/MD5/mapping rules. Commit `aaec1ef`.

---

## 🏃 Sprint 4: Navngivning & Fælles Velkomstside ⭐ NU

Før vi bygger videre, skal systemet have en identitet og en fælles indgang.

### NAVN-4.1: Find et dækkende navn til det samlede system
- **Beskrivelse:** Systemet er nu et komplet husholdningsværktøj:
  - 🎁 Ønskeseddel (gamle wishbuy)
  - 📊 Økonomi dashboard + AI-rådgivning
  - 🏦 Bankimport med auto-kategorisering
  - 📅 Ugeplan (madplan, fremmøde, gæster — kommer i Sprint 7)
- **Forslag til overvejelse:**
  - **Hostrup Hub** — engelsk, moderne, samler alt under ét brand
  - **Hjemmebasen** — dansk, varmt, familiært
  - **Familiestyring** — dansk, deskriptivt
  - **Husholderen** — dansk, personligt, lidt kant
  - **Samlingspunktet** — dansk, fællesskabsorienteret
  - Noget helt andet?
- **Status:** ⬜ Afventer Ronnis valg

### FRONT-4.2: Byg fælles velkomstside (tile-menu)
- **Beskrivelse:** Erstat nuværende `src/routes/+page.svelte` (Brønden) med en tile-baseret landing page. Nuværende brønd flyttes til `/dashboard/wishes`.
- **Design:**
  ```
  ┌──────────────────────────────────────────────────┐
  │                                                  │
  │            🏠 Velkommen til [Navn]               │
  │                                                  │
  │   ┌──────────┐  ┌──────────┐  ┌──────────┐     │
  │   │  🎁      │  │  📊      │  │  🏦      │     │
  │   │          │  │          │  │          │     │
  │   │ Ønsker   │  │ Økonomi  │  │ Bank-    │     │
  │   │          │  │          │  │ import   │     │
  │   └──────────┘  └──────────┘  └──────────┘     │
  │                                                  │
  │   ┌──────────┐  ┌──────────┐                    │
  │   │  📅      │  │  ⚙️      │                    │
  │   │          │  │          │                    │
  │   │ Ugeplan  │  │ Profil   │                    │
  │   │          │  │          │                    │
  │   └──────────┘  └──────────┘                    │
  │                                                  │
  └──────────────────────────────────────────────────┘
  ```
- **Tekniske detaljer:**
  - `/` → ny velkomstside med tiles
  - `/dashboard/wishes` → nuværende brønd (flyttes fra `/`)
  - `/dashboard/finance` → nuværende cockpit (flyttes fra `/dashboard`)
  - `/dashboard/import` → bankimport (allerede på plads)
  - `/dashboard/weekly` → ugeplan (placeholder indtil Sprint 7)
- **Status:** ⬜ Udestående

---

## 🏃 Sprint 5: AI Kategorisering i Import-flowet

### AI-5.1: `suggestCategories` server action
- **Beskrivelse:** Ny action i `/dashboard/import/+page.server.ts` der sender ukendte transaktioner til Gemini 2.5 Flash og får kategoriforslag + keywords retur som JSON.
- **Status:** ⬜ Udestående

### AI-5.2: UI-integration i preview
- **Beskrivelse:** "🤖 Kategorisér med AI" knap på preview-siden. Viser resultater inline i tabellen med markering. Brugeren godkender før gem.
- **Status:** ⬜ Udestående

### AI-5.3: Auto-oprettelse af MappingRules
- **Beskrivelse:** Når AI foreslår et keyword, oprettes en `MappingRule` så fremtidige imports auto-mapper samme butik.
- **Status:** ⬜ Udestående

---

## 🏃 Sprint 6: Performance & Afvikling

- [ ] **PERF-6.1: Database-aggregationer på forsiden** — Erstat in-memory loops med Prisma `_sum`/`groupBy`
- [ ] **PERF-6.2: SQL-optimeret dashboard transaktionsliste**
- [ ] **DEPLOY-6.3: Pensionér Streamlit** — Fjern `wishbuy_analytics` fra `projects.yml`, frigør port 8501

---

## 🏃 Sprint 7: Ugeplan Migration

- [ ] **UP-7.1: Portér database-schema** — `Person`, `Recipe`, `WeekPlan`, `DayPlan`, `DayPlanPerson` ind i wishbuy Prisma
- [ ] **UP-7.2: Portér UI** — `[year]/[week]/+page.svelte`, `DayCard.svelte`, `settings`
- [ ] **UP-7.3: Portér kalender-feed** — `/api/calendar/feed.ics` med HA bypass
- [ ] **UP-7.4: Fjern standalone ugeplan container** fra `projects.yml`

---

## 🏃 Sprint 8: Branding & Polish

- [ ] **BRAND-8.1: Opdatér app-name, favicon, meta-tags** til nyt navn
- [ ] **BRAND-8.2: Opdatér Docker service-navn & NPM proxy host**