# AGENTS.md — Hostrup Hub Agent Guide

Den autoritative guide til AI-agenter der arbejder på dette projekt. Læs den inden du skriver en eneste linje kode.

> **Verificeret 8. august 2026** mod `prisma/schema.prisma`, `src/routes/layout.css`, `deploy.sh` og den kørende container. Finder du en uoverensstemmelse mellem dette dokument og koden, er **koden facit** — ret dokumentet i samme commit som du opdager fejlen.

---

## Dokumentkort

| Dokument                | Rolle                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `AGENTS.md`             | **Denne fil.** Arkitektur, designsystem, konventioner, deployment. |
| `CLAUDE.md`             | Peger hertil. Claude Code læser den automatisk.                    |
| `README.md`             | Menneskevendt intro + opsætning til lokal udvikling.               |
| `BACKLOG.md`            | Reelt åbne opgaver. Kun ting der ikke er lavet endnu.              |
| `docs/arkiv/sprints.md` | Gennemførte sprints. Historik — ikke facit om nuværende kode.      |
| `ERROR-LOG.md`          | Auto-genereret af Crash Watcher. **Rediger kun status/noter.**     |

---

## Projektets formål

**Hostrup Hub** er et samlet husholdningssystem for familien Hostrup med fire domæner:

- 📊 **Økonomi** (`/dashboard/finance`) — forbrugsanalyse, ApexCharts-grafer og AI-rådgivning
- 🏦 **Bankimport** (`/dashboard/import`) — CSV-import med MD5-deduplikering, mapping-regler og AI-kategoriforslag
- 📅 **Ugeplan** (`/dashboard/weekly`) — madplan, fremmøde, gæster og ICS-feed til Home Assistant
- 📈 **Aktier** (`/dashboard/stocks`) — porteføljemonitorering, cron-sync mod Yahoo Finance og AI-aktieanalyser

Kører som Docker-container bag Nginx Proxy Manager + Authelia på `wishbuy.hostrup.org`.

> **Ønske-domænet findes ikke længere.** `Item`, `Category`, `Rating` og `/dashboard/wishes` er fjernet fra projektet. Møder du en henvisning til dem i arkivet eller i gamle commits, er den historisk.

---

## Teknologistack

| Lag            | Teknologi                                                            |
| -------------- | -------------------------------------------------------------------- |
| Frontend + API | SvelteKit 2 (`adapter-node`), Svelte 5 runes, Vite 8                 |
| Database       | PostgreSQL (container `postgresql`, database `wishbuy_db`)           |
| ORM            | Prisma 7 med `@prisma/adapter-pg` (driver adapter, ikke Rust-engine) |
| AI             | `@google/generative-ai` — Gemini (modelvalg, se nedenfor)            |
| Styling        | Tailwind CSS v4 via `@tailwindcss/vite` + `@theme` i `layout.css`    |
| Grafer         | ApexCharts 5 via `src/lib/actions/apexcharts.ts`                     |
| Test           | Vitest — 17 tests i `src/lib/server/stocks/`                         |
| Deployment     | Docker + `./deploy.sh`                                               |

### AI-modelvalg

| Kaldsted                                               | Model                                        |
| ------------------------------------------------------ | -------------------------------------------- |
| `dashboard/finance/+page.server.ts` (rådgivning)       | `GEMINI_MODEL` → fallback `gemini-3.6-flash` |
| `dashboard/import/+page.server.ts` (kategorisering)    | `GEMINI_MODEL` → fallback `gemini-3.6-flash` |
| `dashboard/stocks/+page.server.ts` (porteføljeanalyse) | hardkodet `gemini-2.5-flash`                 |

Afvigelsen på stocks er **utilsigtet-eller-udokumenteret** og er registreret som **AI-1** i `BACKLOG.md`. Ret den ikke uden at afklare hvilken vej det skal gå.

---

## Arkitektur & dataflow

```
Browser ──► Nginx Proxy Manager ──► Authelia ──► SvelteKit (Node, port 3000)
                                                        │
   /                          Landing page (tile-menu)   │
   /dashboard                 302 → /dashboard/finance    │
   /dashboard/finance         Økonomi + AI-rådgivning     │
   /dashboard/import          Bankimport (CSV)            │
   /dashboard/weekly[/y/w]    Ugeplan + indstillinger     │
   /dashboard/stocks          Aktier + AI-analyse         │
                                                        ▼
                                        PostgreSQL (Prisma + pg-pool)
                                                        ▲
   Uden om Authelia (se hooks.server.ts):                │
   /api/calendar/feed.ics ◄── Home Assistant   (CALENDAR_TOKEN)
   /api/stocks/sync       ◄── host-cron        (CRON_SECRET, Bearer)
                                    │
                                    ├──► Yahoo Finance (kurser, nøgletal)
                                    ├──► frankfurter.app (USD/DKK)
                                    └──► Telegram Bot API (kostpris-alarmer)
```

### Authentication

Authelia proxyer alle requests og injicerer `Remote-User`-headeren (navnet er konfigurerbart via `AUTH_HEADER`). Der er **ingen session-management i applikationen** — brugeren bestemmes udelukkende af headeren, og `hooks.server.ts` upserter en `User`-række ud fra den.

Mangler headeren:

- **Kun** hvis `NODE_ENV=development` eller `DEV_MODE=true` falder appen tilbage til brugeren `ronni_dev`.
- Ellers svares `401 Unauthorized`.

To ruter er bevidst uden om header-tjekket, fordi de kaldes lokalt uden om proxyen. **Fjern aldrig disse bypasses** — de beskytter sig selv med hver sit token, og Authelia blokerer offentlig adgang til dem:

| Rute                     | Kaldes af      | Beskyttelse                           |
| ------------------------ | -------------- | ------------------------------------- |
| `/api/calendar/feed.ics` | Home Assistant | `?token=` mod `CALENDAR_TOKEN`        |
| `/api/stocks/sync`       | host-cron      | `Authorization: Bearer <CRON_SECRET>` |

### Miljøvariabler

Sættes i `/hostrup/docker/.env` og mappes ind via `stacks/projects.yml`. Til lokal udvikling: kopiér `.env.example` til `.env`.

| Variabel           | Påkrævet  | Rolle                                                            |
| ------------------ | --------- | ---------------------------------------------------------------- |
| `DATABASE_URL`     | ja        | PostgreSQL-connection string                                     |
| `AUTH_HEADER`      | nej       | Header med brugernavn. Default `remote-user`                     |
| `DEV_MODE`         | nej       | `true` aktiverer fallback-bruger uden for `NODE_ENV=development` |
| `GEMINI_API_KEY`   | ja (AI)   | Google Generative AI-nøgle                                       |
| `GEMINI_MODEL`     | nej       | Overstyrer modelvalg i finance + import                          |
| `CRON_SECRET`      | ja (sync) | Bearer-token til `/api/stocks/sync`                              |
| `CALENDAR_TOKEN`   | ja (HA)   | Query-token til ICS-feed                                         |
| `TELEGRAM_TOKEN`   | nej       | Bot-token til kostpris-alarmer                                   |
| `TELEGRAM_CHAT_ID` | nej       | Modtager-chat                                                    |

---

## Kritiske arkitekturregler

### 1. Brug altid Prisma — aldrig rå SQL

```typescript
// ✅ Korrekt
import { prisma } from '$lib/server/prisma';
const rows = await prisma.transaction.findMany({ where: { isIgnored: false } });

// ❌ Forbudt
pool.query('SELECT * FROM "Transaction"');
```

Prisma-klienten er en singleton i `src/lib/server/prisma.ts` og bruger `@prisma/adapter-pg` med en delt `pg.Pool`. Opret **aldrig** en ny `PrismaClient` andre steder.

### 2. Forretningslogik i `+page.server.ts` — pure funktioner i `$lib/server`

Der er **intet service- eller repository-lag**. `load`-funktioner og `actions` taler direkte med Prisma.

Den ene bevidste undtagelse er aktie-domænet: `src/lib/server/stocks/` indeholder **rene, Prisma-frie funktioner** (`calc.ts`, `costPriceAlerts.ts`), fordi de skal give identiske tal i UI, i AI-analysen og senere i MCP-interfacet — og fordi de er de eneste dele der er unit-testet. Følg det mønster når en beregning har mere end én forbruger; ellers hold logikken i `+page.server.ts`.

### 3. TypeScript — ingen `any`

`svelte-check` skal være 0 fejl / 0 advarsler. Brug `unknown` som fallback. I ApexCharts-konfigurationer er `any` kun acceptabelt i event-handlers med en eksplicit kommentar der forklarer hvorfor.

### 4. Svelte 5 — runes brugt korrekt

- `$derived`-værdier må **aldrig** muteres direkte (read-only binding)
- `$state` til alt lokalt mutable state, `$effect` til side-effekter
- **Props fra `data` må ikke fryses:** `let x = $state(data.foo)` læser kun værdien én gang. Skal state følge nye `load`-data, synkronisér via `$effect` der reagerer på `data`
- Chart-options der afhænger af `isDarkMode` skal være `$derived` og re-renderes via `{#key isDarkMode}`

```svelte
<!-- ✅ Korrekt — chart gendannes ved tema-skift -->
{#key isDarkMode}
	<div use:chart={chartOptions}></div>
{/key}
```

### 5. Ingen hardkodede hex-farver

Alle farvehenvisninger sker via Tailwind-klasser. Hvor Tailwind ikke rækker (inline `style`, ApexCharts), bruges CSS custom properties:

```svelte
<!-- ✅ Korrekt -->
<div class="bg-indigo-500 text-rose-400"></div>
<div
	style="background: conic-gradient(var(--color-indigo-500) 0% {pct}%, var(--color-slate-200) {pct}% 100%)"
></div>

<!-- ❌ Forbudt -->
<div style="background: conic-gradient(#6366f1 0% {pct}%, #cbd5e1 100%)"></div>
<div class="dark:bg-[#0b1120]"></div>
```

Til ApexCharts hentes farverne ud af temaet på klienten:

```typescript
const indigo = getComputedStyle(document.documentElement)
	.getPropertyValue('--color-indigo-500')
	.trim();
```

### 6. Kortstruktur — ét designsprog

Alle dashboardkort bruger glassmorphism-mønsteret:

```html
<div
	class="rounded-3xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
></div>
```

Brug **ikke** tunge skygger (`shadow-2xl`) på almindelige kort — reservér dem til modaler og flydende elementer.

---

## Designsystem 2026

**Inspiration:** Linears præcision + Raycasts dybde. Implementeret som `@theme`-overrides i `src/routes/layout.css`, der **omdefinerer Tailwinds indbyggede farver**, så alle eksisterende utility-klasser automatisk rammer den nye palette. Der findes ingen separate `--bg-*`/`--accent`-tokens — paletten _er_ Tailwind-navnene.

### Omkortede farveskalaer

| Tailwind-navn | Faktisk rolle                                  | Nøgleværdier                                                                                                                     |
| ------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `slate-*`     | Deep Forest surface/tekst                      | `50` `#f5f6f2` lys bg · `100` `#ffffff` lyst kort · `800` `#181c18` mørkt kort · `900` `#0d110d` panel · `950` `#080c08` mørk bg |
| `indigo-*`    | Electric Indigo — primær accent, CTA, AI       | `500` `#6c5ce7` · `400` `#8b7fff` · `600` `#5a4bd4`                                                                              |
| `rose-*`      | Editorial Pink — sekundær accent               | `500` `#e8879e` · `400` `#f098b0`                                                                                                |
| `emerald-*`   | Success / positive tal (uændret Tailwind-grøn) | `500` `#10b981`                                                                                                                  |
| `sky-*`       | Alias til indigo (gradienter)                  | `300` `#a59aff` · `500` `#6c5ce7`                                                                                                |
| `violet-*`    | Alias til indigo                               | `500` `#6c5ce7` — **visuelt identisk med `indigo-500`**                                                                          |

**`amber-*` er IKKE omkortet.** Det er ægte Tailwind-orange og bruges i dag til advarsler, stale-badges og dubletmarkering. Dets formelle rolle i paletten er stadig uafklaret — se **U1** i `BACKLOG.md`. Antag ikke at amber bliver pink; det gør den ikke.

Alt andet end ovenstående skalaer er upåvirket standard-Tailwind.

### Dark mode

Aktiveres med `.dark`-klassen på `<html>`; `@custom-variant dark` i `layout.css` binder Tailwinds `dark:`-variant til den. Toggle-knappen i `+layout.svelte` sætter klassen og husker valget i `localStorage`. `html.dark` sætter desuden `color-scheme: dark`, så native controls følger med.

### Typografi

Inter (300–700) og JetBrains Mono (400, 500) hentes fra Google Fonts i `+layout.svelte`. `layout.css` sætter Inter som `font-family` på `html` med system-ui-fallback.

| Rolle           | Klassemønster                                     |
| --------------- | ------------------------------------------------- |
| Sideoverskrift  | gradient `from-indigo-600 to-indigo-400`          |
| Store tal / KPI | `text-2xl`–`text-4xl` med `font-black`            |
| Labels          | `text-[10px] font-bold tracking-widest uppercase` |

### Form og dybde

Radius og skygger styres af Tailwinds egne skalaer — der er ingen custom tokens:

| Element            | Klasser                      |
| ------------------ | ---------------------------- |
| Kort og paneler    | `rounded-3xl` + `shadow-sm`  |
| Inputs og knapper  | `rounded-xl` / `rounded-2xl` |
| Pills og badges    | `rounded-full`               |
| Modaler / flydende | `shadow-2xl` (kun her)       |

---

## Databaseschema

16 modeller i `prisma/schema.prisma`, grupperet i fire domæner:

| Domæne  | Modeller                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------- |
| Fælles  | `User` (username, displayName, emoji), `AiInsight` (gemt AI-analyse pr. bruger + periode)                   |
| Økonomi | `Account`, `Transaction`, `TransactionCategory`, `MappingRule`, enum `TransactionStatus`                    |
| Ugeplan | `Person`, `Recipe`, `WeekPlan`, `DayPlan`, `DayPlanPerson`                                                  |
| Aktier  | `Stock`, `StockTransaction`, `StockPriceDaily`, `ExchangeRateDaily`, `StockAnalysis`, enum `StockTransType` |

Invarianter du skal kende:

- `Transaction.hash` er MD5 af dato+tekst+beløb+løbenummer og er dedupliceringsnøglen ved CSV-import
- `Transaction.isIgnored = true` fjerner posteringen fra **alle** udregninger uden at slette den
- `Transaction.status` styrer import-workflowet: `UNPROCESSED` → `AUTO_MAPPED` / `MANUAL_REVIEW` → `PROCESSED`
- `MappingRule.keyword` → `TransactionCategory` er auto-mapping ved import; nye regler oprettes når brugeren godkender et AI-forslag
- `StockPriceDaily` og `ExchangeRateDaily` har unikke nøgler på (stock, dato) hhv. dato — al skrivning skal være `upsert`, aldrig `create`
- `Stock.isBenchmark` markerer referencepapirer (`^GSPC`, `QQQ`) der ikke indgår i porteføljetal

---

## Deployment

```bash
./deploy.sh "Din commit-besked"
```

Scriptet stopper ved første fejl og kører i denne rækkefølge:

1. `npx prisma generate` — Prisma Client skal matche schemaet før typecheck
2. `npm run lint` — Prettier + ESLint, ingen fejl tilladt
3. `npm run check` — `svelte-check`, 0 fejl / 0 advarsler
4. `npm test` — Vitest, alle grønne
5. `npm run build` — verificerer produktionskompilering **før** noget pushes
6. Git commit + push
7. Docker rebuild + opstart
8. `docker exec wishbuy npx prisma db push` — kun hvis `prisma/schema.prisma` er ændret
9. HTTP-verifikation mod den kørende container + log-tjek

**Deploy ALDRIG med `--no-verify` eller ved at springe trin over.** Kør ikke `docker compose` manuelt — det er `deploy.sh`'s opgave.

> **Bemærk om `prisma db push` fra hosten:** `.env`'s `DATABASE_URL` peger på hostnavnet `postgresql`, som kun findes inde i Docker-netværket. Kør derfor altid schema-push via `docker exec wishbuy …` — ikke direkte på hosten.

---

## Nøglefiler

| Fil                                            | Rolle                                           |
| ---------------------------------------------- | ----------------------------------------------- |
| `src/hooks.server.ts`                          | Auth-header-håndtering + bypass-ruter           |
| `src/routes/layout.css`                        | Centralt tema (`@theme`, 2026-palette)          |
| `src/routes/+layout.svelte`                    | Root layout, dark mode-toggle, fonts            |
| `src/routes/+page.svelte`                      | Landing page (tile-menu)                        |
| `src/routes/dashboard/finance/+page.server.ts` | Økonomi-load (DB-aggregeringer) + AI-rådgivning |
| `src/routes/dashboard/import/+page.server.ts`  | CSV-parse, MD5-dedup, AI-kategoriforslag        |
| `src/routes/dashboard/stocks/+page.server.ts`  | Porteføljeload + AI-analyse                     |
| `src/lib/server/stocks/calc.ts`                | Ren beregningskerne (testet)                    |
| `src/lib/server/stocks/fetchPrices.ts`         | Yahoo Finance + FX-sync                         |
| `src/lib/server/telegram.ts`                   | Telegram-notifikationer                         |
| `src/lib/server/prisma.ts`                     | Prisma-singleton med pg-adapter                 |
| `src/routes/api/stocks/sync/+server.ts`        | Cron-endpoint (Bearer-beskyttet)                |
| `prisma/schema.prisma`                         | Databaseschema                                  |
| `deploy.sh`                                    | Deploy-pipeline                                 |

---

## Hvad du IKKE må gøre

- Oprette filer uden for `/hostrup/docker/projects/wishbuy/`
- Bruge hardkodede hex-farver i klasser eller inline styles — brug `var(--color-*)`
- Antage at `amber-*` er omkortet til pink (det er det ikke) eller at `violet`/`sky` er egne farver (de peger på indigo)
- Direkte mutere `$derived`-værdier
- Initialisere `$state` fra `data` uden en `$effect` der holder den synkroniseret
- Fjerne bypass-ruterne i `hooks.server.ts`
- Køre `prisma db push` mod hosten frem for inde i containeren
- Deploye uden at lint, check, test og build passerer
- Tilføje abstraktion eller features der ikke er eksplicit efterspurgt
- Skrive kommentarer der beskriver HVAD koden gør — kun HVORFOR

---

## Vigtige konventioner

- **Dansk brugervendt tekst**: al UI-tekst, fejlbeskeder og labels er på dansk
- **Engelske kodeidentifiers**: variabler, funktioner og Prisma-modeller er på engelsk
- **Ingen kommentarer der beskriver koden** — kun usynlige invarianter og workarounds
- **Ryd op efter dig selv**: ingen debug-logs, ingen midlertidige filer, ingen data-dumps i repoet
- **Backlog-berigelse**: skriver brugeren "berig" backloggen, skal den raffineres med færdige løsningsforslag — opgaverne skal **ikke** udføres med det samme
- **Dokumentation følger koden**: ændrer du schema, ruter, tema eller deploy-flow, opdaterer du dette dokument i samme commit

### Obligatorisk runtime-verifikation

1. **Tjek logs FØR**: `docker logs wishbuy --tail 50` inden du går i gang, så du kender udgangspunktet
2. **DB-schema push**: ændrer du `prisma/schema.prisma`, SKAL schemaet ud i PostgreSQL (`docker exec wishbuy npx prisma db push`), så nye kolonner findes runtime
3. **End-to-end runtime-test**: erklær aldrig en feature færdig uden et faktisk HTTP-kald mod den kørende container der svarer 200 OK
4. **Tjek logs EFTER**: `docker logs wishbuy --tail 50` umiddelbart efter udrulning — nul fejl og nul uventede exceptions
