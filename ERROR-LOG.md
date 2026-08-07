# Error Log – wishbuy

> Auto-genereret af **Crash Watcher**. Kører kl. 12:00 og 20:00 dagligt.
> Tilføj manuelt backlog-noter og skift status for at prioritere fejlrettelser.
>
> **Status-ikoner:** 🔴 ÅBEN · 🟡 PLANLAGT · ⚪ IGNORERET · ✅ LØST

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
- **Status:** 🔴 ÅBEN
- **Backlog noter:** _(tilføj manuelt)_

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
- **Status:** 🔴 ÅBEN
- **Backlog noter:** _(tilføj manuelt)_

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
- **Status:** 🔴 ÅBEN
- **Backlog noter:** _(tilføj manuelt)_

---

