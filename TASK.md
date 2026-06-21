# 📋 Wishbuy & Analytics Assimilering - Task Backlog

Dette er den eksekverbare task-liste for assimileringen af `wishbuy_analytics` ind i `wishbuy` samt opgradering til **Antigravity SDK**. Listen er struktureret i prioriterede Sprints.

---

## 🏃 Sprint 1: Kritiske Retninger & Type-sikkerhed (Hardening & Bug-fixing)

Disse opgaver løser akutte compiler-fejl, sårbarheder og mulige servernedbrud i SvelteKit-projektet.

- [ ] **TS-1.1: Fiks variable hoisting fejl i dashboard**
  - **Beskrivelse:** Flyt definitionen af `isDarkMode = $state(false)` til toppen af `<script>` i [dashboard/+page.svelte](file:///hostrup/docker/projects/wishbuy/src/routes/dashboard/%2Bpage.svelte).
  - **Status:** ⬜ Udestående
- [ ] **TS-1.2: Løs type-mismatch ved kategori-ikoner**
  - **Beskrivelse:** Opdater state-typen `editingCategory` i Svelte til at tillade `icon: string | null`.
  - **Status:** ⬜ Udestående
- [ ] **TS-1.3: Indfør try-catch omkring JSON.parse**
  - **Beskrivelse:** Sikr parsing af `transactionIds` i `bulkGroupToWish` server action i [+page.server.ts](file:///hostrup/docker/projects/wishbuy/src/routes/dashboard/%2Bpage.server.ts).
  - **Status:** ⬜ Udestående
- [ ] **TS-1.4: Validering af dato-parametre i url-load**
  - **Beskrivelse:** Indfør regex-tjek (`/^\d{4}-\d{2}-\d{2}$/`) på `from` og `to` parametre i [+page.server.ts](file:///hostrup/docker/projects/wishbuy/src/routes/dashboard/%2Bpage.server.ts).
  - **Status:** ⬜ Udestående
- [ ] **TS-1.5: Authorization check på server actions**
  - **Beskrivelse:** Valider at det pågældende `itemId` tilhører den loggede bruger (`locals.user.id`) før ændringer udføres i actions som `deleteItem`, `toggleStatus` osv.
  - **Status:** ⬜ Udestående
- [ ] **TS-1.6: XSS-validering af ønske-URL'er**
  - **Beskrivelse:** Valider at links starter med `http://` eller `https://` under `createItem`.
  - **Status:** ⬜ Udestående
- [ ] **TS-1.7: HTML-sanitering af AI Advisor output**
  - **Beskrivelse:** Integrer `DOMPurify` (eller `isomorphic-dompurify`) til at sanitere AI-markdown outputtet før rendering i [dashboard/+page.svelte](file:///hostrup/docker/projects/wishbuy/src/routes/dashboard/%2Bpage.svelte).
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

## 🏃 Sprint 4: Antigravity SDK & AI Refactoring

Disse opgaver erstatter de gamle Gemini API-kald med det nye Antigravity SDK.

- [ ] **AI-4.1: Opret wishbuy_agent.py**
  - **Beskrivelse:** Opret `src/lib/agents/wishbuy_agent.py` der benytter `google.antigravity` SDK til at køre agent-operationerne `analyse` (indsigt) og `categorize` (transaktions-mapping).
  - **Status:** ⬜ Udestående
- [ ] **AI-4.2: Integrer agent-kald i SvelteKit**
  - **Beskrivelse:** Opdater server action `generateInsight` i [+page.server.ts](file:///hostrup/docker/projects/wishbuy/src/routes/dashboard/%2Bpage.server.ts) til at kalde `wishbuy_agent.py` via Node `child_process.execFile` i stedet for det gamle JS SDK.
  - **Status:** ⬜ Udestående
- [ ] **AI-4.3: Bulk AI-kategorisering i importen**
  - **Beskrivelse:** Implementer AI-kategoriseringen i CSV-importen via `wishbuy_agent.py` med `google_search` tool enabled som fallback.
  - **Status:** ⬜ Udestående
- [ ] **AI-4.4: Retrospektiv AI-databaseoprydning**
  - **Beskrivelse:** Tilføj en "Kør AI Oprydning" knap på dashboardet, der kalder agenten til at kategorisere historiske u-kategoriserede poster i databasen.
  - **Status:** ⬜ Udestående

---

## 🏃 Sprint 5: Performance-Optimering & Afvikling

Disse opgaver optimerer side-loads og pensionerer den gamle Streamlit app.

- [ ] **PERF-5.1: Skift forside-load til database-aggregationer**
  - **Beskrivelse:** Erstat in-memory summering af transaktioner i [+page.server.ts](file:///hostrup/docker/projects/wishbuy/src/routes/%2Bpage.server.ts) med Prisma database aggregates (`_sum` og `groupBy`).
  - **Status:** ⬜ Udestående
- [ ] **PERF-5.2: Optimering af dashboard transaktionsliste**
  - **Beskrivelse:** Flyt in-memory sortering og filtrering to SQL-forespørgsler i database-laget.
  - **Status:** ⬜ Udestående
- [ ] **DEPLOY-5.3: Pensionering af Streamlit container**
  - **Beskrivelse:** Fjern `wishbuy_analytics` servicen fra `projects.yml` og frigør port 8501. Kør `./deploy.sh` for at genstarte systemerne.
  - **Status:** ⬜ Udestående
