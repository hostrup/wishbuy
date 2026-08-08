# 📋 Backlog — Hostrup Hub

**Baseline (8. august 2026):** `svelte-check` 0 fejl / 0 advarsler · `vitest` 17/17 grønne · `prettier + eslint` rene · container `wishbuy` up, ingen fejl i logs.

Gennemførte sprints ligger i [`docs/arkiv/sprints.md`](docs/arkiv/sprints.md). Arkitektur, designsystem og konventioner står i [`AGENTS.md`](AGENTS.md) — læs den før du tager et punkt herfra.

**Prioritetsnøgle:** 🔴 Høj · 🟡 Medium · 🟢 Lav

---

## Kræver brugerbeslutning

### U1: `amber-*` — hvad er den semantiske rolle? 🟡

**Status pr. 8. august 2026:** Den gamle formulering af U1 byggede på en fejlagtig antagelse om at `amber` var omkortet til pink i `@theme`. Det er den **ikke** — `src/routes/layout.css` remapper `slate`, `indigo`, `emerald`, `rose`, `sky` og `violet`, men rører aldrig `amber`. Alle `amber-*`-klasser i koden rammer altså ægte Tailwind-orange.

**Reel brug i dag** (`grep -rn "amber-" src/`):

| Sted                                                       | Rolle                           |
| ---------------------------------------------------------- | ------------------------------- |
| `src/lib/stocks/glossary.ts:61,88`                         | Advarsels-badge på nøgletal     |
| `src/routes/dashboard/import/+page.svelte:322,325,329,433` | "Allerede importeret"-dubletter |
| `src/routes/+layout.svelte:190`                            | Ugeplan-ikon i navigationen     |
| `src/routes/dashboard/weekly/settings/+page.svelte:17`     | Dekorativ baggrundsglød         |

**Beslutning der skal træffes:** Skal `amber` optages formelt i designsystemet som "advarsel / opmærksomhed"-farven (og dermed dokumenteres i AGENTS.md's palettabel), eller skal de fire steder skiftes til en tema-farve så paletten holdes på seks farver?

- **Optag amber:** ingen kodeændring, men paletten vokser. Kræver at amber tunes så den harmonerer med Deep Forest-baggrunden.
- **Fjern amber:** brug `rose-*` til advarsler og `indigo-*` til ugeplan-ikonet. Ensartet palette, men advarsel og "ego/sekundær accent" bliver visuelt ens.

---

## Åbne opgaver

### AI-1: Ensret Gemini-modelvalg på tværs af domæner 🟡

**Problem:** Tre kaldsteder vælger model på to forskellige måder:

| Fil                                                | Model                                      |
| -------------------------------------------------- | ------------------------------------------ |
| `src/routes/dashboard/finance/+page.server.ts:580` | `env.GEMINI_MODEL \|\| 'gemini-3.6-flash'` |
| `src/routes/dashboard/import/+page.server.ts:255`  | `env.GEMINI_MODEL \|\| 'gemini-3.6-flash'` |
| `src/routes/dashboard/stocks/+page.server.ts:58`   | hardkodet `'gemini-2.5-flash'`             |

Sætter man `GEMINI_MODEL` i miljøet, skifter to af tre domæner model — aktieanalysen bliver hængende på 2.5. Det er enten en bevidst beslutning der mangler dokumentation, eller en forglemmelse.

**Fix (hvis forglemmelse):** Lad stocks bruge samme mønster: `env.GEMINI_MODEL || 'gemini-3.6-flash'`.
**Fix (hvis bevidst):** Behold 2.5, men skriv hvorfor i en kommentar over konstanten og i AGENTS.md's AI-sektion.

**Acceptkriterier:**

- [ ] Alle tre kaldsteder følger samme mønster, eller afvigelsen er begrundet i kode + AGENTS.md
- [ ] `npm run lint && npm run check && npm test` passerer
- **Prioritet:** 🟡 Medium · **Kompleksitet:** Triviel

---

### DRIFT-1: `cron-sync.log` roterer ikke 🟢

**Problem:** Begge cron-jobs (`0 16-22 * * 1-5` og `5 23 * * 1-5`) appender til `/hostrup/docker/projects/wishbuy/cron-sync.log` uden rotation. Filen er 43 kB efter ~5 ugers drift og vokser med ~8 JSONL-linjer pr. hverdag i al fremtid.

**Fix:** Læg en logrotate-regel i `/etc/logrotate.d/wishbuy-cron`:

```
/hostrup/docker/projects/wishbuy/cron-sync.log {
    monthly
    rotate 6
    compress
    missingok
    notifempty
    copytruncate
}
```

**Acceptkriterier:**

- [ ] `logrotate -d /etc/logrotate.d/wishbuy-cron` kører uden fejl (dry-run)
- [ ] Loggen er stadig gitignoreret
- **Prioritet:** 🟢 Lav · **Kompleksitet:** Triviel

---

### SEC-1: Bankdata i git-historikken 🟡

**Problem:** `Madkonto_opd (7).csv` (102 kB rigtige bankposteringer for husstanden) blev committet i `d7aeba7` (29. juli 2026). Filen er fjernet fra HEAD, men ligger stadig i git-historikken og dermed i enhver klon og i `projects-data.tar.zst`-backuppen.

**Fix-muligheder:**

- **Accepter:** repoet er privat og ligger kun på egen server + egen backup. Lav en `.gitignore`-regel for `*.csv` så det ikke gentager sig (gjort).
- **Purge:** `git filter-repo --path 'Madkonto_opd (7).csv' --invert-paths` og force-push. Omskriver historikken — kræver at ingen andre kloner findes.

**Acceptkriterier:**

- [ ] Beslutning truffet og noteret her
- [ ] Fremtidige CSV-filer fanges af `.gitignore` (verificér med `git check-ignore -v test.csv`)
- **Prioritet:** 🟡 Medium · **Kompleksitet:** Lav (accept) / Medium (purge)

---

### DOCKER-1: Multi-stage image 🟢

**Problem:** Slutimaget indeholder devDependencies (vite, vitest, eslint, svelte-check, typescript) og hele kildekoden, fordi build og runtime deler ét stage. Imaget er derfor væsentligt større end nødvendigt.

**Hvorfor det ikke er gjort:** Det dokumenterede schema-push-flow er `docker exec wishbuy npx prisma db push`, som kræver at Prisma CLI (en devDependency) findes i containeren. Et prod-only slutstage dræber det flow.

**Fix hvis det tages:** Multi-stage build, og læg schema-synkronisering om til `prisma migrate deploy` i entrypoint med committede migrations i `prisma/migrations/` — hvilket samtidig fjerner `db push`'s risiko for datatab.

**Acceptkriterier:**

- [ ] `prisma/migrations/` findes og er committet
- [ ] Container starter, kører migrations og svarer HTTP 200 på `/dashboard/stocks`
- [ ] `deploy.sh` opdateret så `db push`-trinnet erstattes
- [ ] AGENTS.md's deploy- og runtime-sektion opdateret
- **Prioritet:** 🟢 Lav · **Kompleksitet:** Medium

---

## 🛠️ Sprint 9.11: Post-launch hardening (historisk data + drift)

> **Oprindelse:** Statusaudit 30. juni 2026 afslørede driftsproblemer omkring historisk aktiedata.
> STOCK-11.3 er gennemført og flyttet til [arkivet](docs/arkiv/sprints.md).

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

> **Bemærk (rettet 8. aug 2026):** `amber-*` er **ikke** omkortet i `@theme` — det er ægte Tailwind-orange, og det bruges allerede til stale-badget i dag. Følg den beslutning der træffes i **U1** ovenfor, før du vælger farve her.

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

> **Revideret 8. august 2026:** Sprint 10 blev skrevet mens Ønske-domænet stadig fandtes. `Item`,
> `Category` og `Rating` er siden fjernet fra `schema.prisma`, og `/dashboard/wishes` findes ikke
> længere. Alle `wishes_*`-tools nedenfor er derfor **udgået** — scopet er finans, aktier og ugeplan.

**Mål:** Eksponér hele Hostrup Hub (finans, **aktier**, ugeplan) via et **internt MCP-server-interface**, så eksterne AI-agenter (Claude m.fl.) nemt kan læse status og udføre afgrænsede handlinger — uden at gå uden om forretningslogikken. Bygger oven på beregningskernen fra 9.3 og de eksisterende Prisma-modeller.

> **Hvorfor projekt-bredt:** MCP-serveren bliver Hubs officielle agent-API. Aktie-domænet er første store forbruger, men interfacet dækker alle domæner fra dag ét, så agenter kan hjælpe på tværs (fx "kategorisér disse bank-transaktioner", "tilføj et ønske", "lav en aktieanalyse").

## 🏗️ Sprint 10.1: MCP-transport & sikkerhed

**Teknik:** `@modelcontextprotocol/sdk` (TypeScript) med **Streamable HTTP-transport** mountet i SvelteKit på `src/routes/api/mcp/+server.ts` (`POST` + `GET`). Genbruger samme Prisma-klient og `src/lib/server/stocks/calc.ts`.

- `npm install @modelcontextprotocol/sdk zod`.
- **Auth:** Bearer-token (`MCP_TOKEN` i `.env`). Tilføj `/api/mcp` til `isBypassedPath` i `hooks.server.ts` (uden om Authelia-header-tjek), men kræv selv gyldig `Authorization: Bearer`-token i endpointet → ellers 401. Sikkerhedsnote i koden som ved calendar-feed.
- **Authelia:** bloker offentlig adgang til `^/api/mcp.*` (kun lokalt net / Tailscale + token). Dokumentér regel.
- **Bruger-kontekst:** MCP-kald kører som en dedikeret agent-bruger (eller bruger sendt i token-claim) for `userId`-bundne data (AI-indsigter, analyser).

**Acceptkriterier:**

- [ ] `POST /api/mcp` taler MCP over Streamable HTTP; `initialize` + `tools/list` virker via MCP-klient
- [ ] Kald uden gyldig token afvises (401); Authelia blokerer offentlig adgang
- [ ] Ingen secrets eller rå SQL; al adgang via Prisma/beregningskerne
- **Prioritet:** 🟡 Medium · **Kompleksitet:** Medium-høj

## 🧰 Sprint 10.2: Tools & resources (read)

Read-only først (lav risiko). Alle tools zod-validerede, dansk-beskrevne.

- **Aktier:** `stocks_get_portfolio` (totaler, positioner, allokering, koncentration), `stocks_list_analyses`, `stocks_get_stock(ticker)`.
- **Finans:** `finance_get_summary(from,to)`, `finance_list_transactions(filter)`, `finance_list_categories`.
- ~~**Ønsker:** `wishes_list(status?)`, `wishes_get(id)`~~ — udgået, domænet findes ikke.
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
- `finance_categorize_transaction(id, categoryId)` og `weekly_set_recipe(...)` — genbrug eksisterende actions-logik.
- Alle write-tools logger hvem/hvad (audit) og er idempotente hvor muligt.

**Acceptkriterier:**

- [ ] Ekstern agent kan via MCP anmode om en aktieanalyse → række oprettes i `StockAnalysis` og vises i UI'ets historik
- [ ] Write-tools håndhæver samme valideringer som UI-actions; ingen handels-/overførselsfunktioner eksponeres
- [ ] `npm run lint && npm run check && npm test` passerer; dokumentér tilslutning af MCP-klient i README
- **Prioritet:** 🟢 Lav-medium · **Kompleksitet:** Medium
