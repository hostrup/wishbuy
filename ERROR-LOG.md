# Error Log – wishbuy

> Auto-genereret af **Crash Watcher**. Kører kl. 12:00 og 20:00 dagligt.
> Tilføj manuelt backlog-noter og skift status for at prioritere fejlrettelser.
>
> **Status-ikoner:** 🔴 ÅBEN · 🟡 PLANLAGT · ⚪ IGNORERET · ✅ LØST
>
> **Filen er undtaget fra `prettier --check`** (se `.prettierignore`), fordi et eksternt
> værktøj skriver den. Rediger kun **Status** og **Backlog noter** — resten overskrives.

---

<!-- fp:0197866fff11c45637d4fc08236d1c9a -->

### ❌ WIS-001 | Database connection refused efter startup

- **Første gang:** 2026-08-04 12:03
- **Seneste:** 2026-08-04 12:03
- **Antal forekomster:** 1
- **Severity:** MEDIUM
- **Container:** wishbuy
- **Hermes vurdering:** Databaseforbindelsen nægtes efter containeren er startet. Dette kan skyldes at databasen ikke er klar eller at der er problemer med netværkskonfigurationen. Bør undersøges hvis det sker udover de første sekunder efter startup.
- **Log-uddrag:**
  ```
  Error: connect ECONNREFUSED 127.0.0.1:5432
  ```
- **Status:** ⚪ IGNORERET
- **Backlog noter:** _Falsk positiv (verificeret 8. aug 2026)._ Appen forbinder aldrig til `127.0.0.1:5432` — `DATABASE_URL` peger på Docker-hostnavnet `postgresql`. Denne fejl kan ikke stamme fra `wishbuy`-containeren. Der er kun én forekomst, og loggen har været ren siden. Genåbn kun hvis mønsteret gentager sig med et rigtigt hostnavn.

---

<!-- fp:54df2c6db8f69cbd4c52373002ab54cf -->

### ❌ WIS-003 | Manglende miljøvariabel 'DB_PASSWORD'

- **Første gang:** 2026-08-04 12:03
- **Seneste:** 2026-08-04 12:03
- **Antal forekomster:** 1
- **Severity:** HIGH
- **Container:** wishbuy
- **Hermes vurdering:** En påkrævet miljøvariabel for databaseadgang er ikke defineret. Dette vil forhindre applikationen i at fungere korrekt. Miljøvariablen bør tilføjes i deployment-konfigurationen.
- **Log-uddrag:**
  ```
  Error: Missing required environment variable: DB_PASSWORD
  ```
- **Status:** ⚪ IGNORERET
- **Backlog noter:** _Falsk positiv (verificeret 8. aug 2026)._ `DB_PASSWORD` findes ikke i kodebasen — adgangskoden er en del af `DATABASE_URL`. Se `AGENTS.md § Miljøvariabler` for den faktiske liste. Ingen kode læser denne variabel, så fejlen kan ikke være genereret af appen.

---

<!-- fp:32a61ac4c719c0f1c6008f3fd2330463 -->

### ❌ WIS-006 | Ugyldig session token

- **Første gang:** 2026-08-04 12:03
- **Seneste:** 2026-08-04 12:03
- **Antal forekomster:** 1
- **Severity:** MEDIUM
- **Container:** wishbuy
- **Hermes vurdering:** Applikationen modtager session tokens der ikke kan valideres. Dette kan skyldes udløbne sessioner eller problemer med token-genereringen. Bør logges yderligere for at identificere roden til problemet.
- **Log-uddrag:**
  ```
  Invalid session token: abc123-def456
  ```
- **Status:** ⚪ IGNORERET
- **Backlog noter:** _Falsk positiv (verificeret 8. aug 2026)._ Appen har **ingen session-håndtering** — brugeren bestemmes udelukkende af `Remote-User`-headeren fra Authelia (`src/hooks.server.ts`). Der findes ingen sessions at validere og ingen kode der kan producere denne besked.

---

> **Note til Crash Watcher:** alle tre poster ovenfor er dateret samme minut (2026-08-04 12:03)
> med præcis én forekomst hver, og ingen af dem svarer til kode der findes i projektet. De ligner
> testdata fra watcherens egen opsætning. Verificér gerne kilden, før nye poster tages for pålydende.
