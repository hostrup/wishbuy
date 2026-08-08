# Hostrup Hub

Et samlet husholdningssystem for familien Hostrup — økonomi, bankimport, ugeplan og aktier i én SvelteKit-app. Kører som Docker-container bag Nginx Proxy Manager og Authelia på `wishbuy.hostrup.org`.

> Arbejder du som AI-agent på projektet: læs **[`AGENTS.md`](AGENTS.md)** først. Den er den autoritative guide til arkitektur, designsystem og konventioner.

## Domæner

| Rute                 | Indhold                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| `/dashboard/finance` | Forbrugsoverblik, kategorigrafer og AI-rådgivning på husstandens økonomi          |
| `/dashboard/import`  | CSV-import fra banken med MD5-deduplikering, mapping-regler og AI-kategoriforslag |
| `/dashboard/weekly`  | Madplan, fremmøde og gæster — med ICS-feed ind i Home Assistant                   |
| `/dashboard/stocks`  | Aktieportefølje med automatisk kurs-sync, nøgletal og AI-porteføljeanalyse        |

## Teknologi

- **SvelteKit 2** med Svelte 5 runes og `adapter-node`
- **PostgreSQL** via **Prisma 7** med `@prisma/adapter-pg`
- **Tailwind CSS v4** — hele paletten defineret som `@theme`-overrides i `src/routes/layout.css`
- **ApexCharts** til grafer, **Vitest** til beregningskernen
- **Gemini** til AI-rådgivning, kategorisering og aktieanalyse
- **Yahoo Finance** + `frankfurter.app` til kurser og USD/DKK, **Telegram** til kostpris-alarmer

## Adgang og autentificering

Appen har **ingen egen login-side**. Authelia sidder foran og injicerer `Remote-User`-headeren, som `src/hooks.server.ts` slår brugeren op på. Uden headeren svares `401` — medmindre `NODE_ENV=development` eller `DEV_MODE=true`, hvor der bruges en fallback-bruger.

To ruter går uden om header-tjekket, fordi de kaldes lokalt uden om proxyen, og beskytter sig selv med hver sit token: ICS-feedet (`CALENDAR_TOKEN`) og aktie-syncen (`CRON_SECRET`).

## Lokal udvikling

```bash
npm install
cp .env.example .env      # udfyld DATABASE_URL og evt. GEMINI_API_KEY
npx prisma generate
npx prisma db push
npm run dev
```

`DATABASE_URL` i `.env` peger som standard på Docker-hostnavnet `postgresql`, som kun kan slås op inde i Docker-netværket. Udvikler du på hosten, skal du bruge `localhost:5432` i stedet.

Sæt `DEV_MODE=true` for at slippe uden om Authelia-headeren lokalt.

### Kommandoer

| Kommando                 | Gør                                                  |
| ------------------------ | ---------------------------------------------------- |
| `npm run dev`            | Udviklingsserver                                     |
| `npm run check`          | `svelte-check` — skal give 0 fejl / 0 advarsler      |
| `npm run lint`           | Prettier-tjek + ESLint                               |
| `npm run format`         | Retter formatering                                   |
| `npm test`               | Vitest (beregningskernen i `src/lib/server/stocks/`) |
| `npm run build`          | Produktionsbuild                                     |
| `npm run db:seed:stocks` | Seeder aktier og benchmarks                          |

## Deployment

```bash
./deploy.sh "Beskrivelse af ændringen"
```

Scriptet kører hele kvalitetsporten (prisma generate → lint → check → test → build), committer og pusher, genbygger containeren, kører schema-push hvis `prisma/schema.prisma` er ændret, og verificerer til sidst at appen svarer HTTP 200 og at loggen er ren.

Kør **ikke** `docker compose` manuelt — compose-definitionen ligger i `/hostrup/docker/stacks/projects.yml` og styres af `deploy.sh`.

### Database-administration

```bash
docker exec wishbuy npx prisma db push     # synkronisér schema
docker exec -it postgresql psql -U wishbuy_db -d wishbuy_db
```

Prisma Studio kan køres lokalt mod databasen med `npx prisma studio`, hvis `DATABASE_URL` peger på `localhost:5432`.

## Automatik

| Job       | Tidspunkt                     | Hvad                                                       |
| --------- | ----------------------------- | ---------------------------------------------------------- |
| Kurs-sync | Hver hele time 16–22, man–fre | `POST /api/stocks/sync?mode=quotes` — kurser + nøgletal    |
| Nat-sync  | 23:05, man–fre                | `POST /api/stocks/sync?mode=all` — slutkurser + valutakurs |

Begge kaldes af host-cron med `CRON_SECRET` som Bearer-token og logger til `cron-sync.log` (gitignoreret).

## Dokumentation

| Fil                     | Indhold                                             |
| ----------------------- | --------------------------------------------------- |
| `AGENTS.md`             | Arkitektur, designsystem, konventioner, deploy-flow |
| `BACKLOG.md`            | Åbne opgaver                                        |
| `docs/arkiv/sprints.md` | Gennemførte sprints (historik)                      |
| `ERROR-LOG.md`          | Auto-genereret fejllog fra Crash Watcher            |
