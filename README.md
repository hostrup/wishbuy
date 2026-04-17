# Ønskebrønden (WishBuy Tracker)

En psyko-økonomisk ønskeseddel og budget-tracker til husstanden. Bygget til at synliggøre "penge sparet" ved at udskyde behov, holde styr på fælles og personlige ønsker, og give et lækkert overblik over realiseret forbrug.

## ✨ Features

* **Psyko-Økonomisk Dashboard**: Real-time KPI'er der viser værdien af udsatte drømme, totalt forbrug, og fordelingen mellem fælles og personlige ("Ego") udgifter.
* **Ønsker vs. Realiseret**: Et "Swipe-venligt" (Mobile First) interface til at kaste ting i brønden, og senere markere dem som købt.
* **Personlige Profiler**: Brugere kan selv tilpasse deres viste navn og vælge en personlig emoji via profil-modulen.
* **Collaborative Voting**: Vurder hinandens ønsker (👍/👎) for at skabe enighed om fælles investeringer.
* **PWA Ready**: Kan gemmes direkte på iOS og Android hjemmeskærme som en fuldskærms-app med eget ikon.
* **Seamless Authentication**: Designet til at køre usynligt bag Nginx Proxy Manager og Authelia (Header-based `Remote-User` auth).

## 🛠️ Tech Stack

* **Frontend**: [SvelteKit](https://kit.svelte.dev/) (Svelte 5 Runes) + [Tailwind CSS v4](https://tailwindcss.com/)
* **Backend**: Node.js (via SvelteKit Server Routes)
* **Database**: PostgreSQL
* **ORM**: [Prisma v7](https://www.prisma.io/) (med `@prisma/adapter-pg`)
* **Deployment**: Docker & Docker Compose

---

## 🚀 Deployment (Docker)

Applikationen er bygget til at køre i et Linux/Docker miljø. 

### 1. Byg og start containeren
Når du har klonet kildekoden, bygger du og starter containeren i baggrunden:
```bash
docker compose up -d --build wishbuy
2. Synkroniser Databasen (VIGTIGT)
Første gang applikationen startes, eller når der laves ændringer i schema.prisma (fx tilføjelse af nye kolonner), skal databasen opdateres. Kør dette mens containeren er tændt:

Bash
docker compose exec wishbuy npx prisma db push
3. Visuel Database Administration (Prisma Studio)
Prisma kommer med et indbygget, genialt web-interface til at se, rette og slette data direkte i databasen (uden at skrive SQL). Du kan starte det inde i containeren med:

Bash
docker compose exec wishbuy npx prisma studio
(Bemærk: For at tilgå Prisma Studio udefra, kræver det at port 5555 er mappet ud i din docker-compose.yml). Alternativt kan du køre npx prisma studio på din lokale maskine, hvis den har adgang til databasen.

💻 Lokal Udvikling
Hvis du vil udvikle på applikationen lokalt uden for Docker:

Installer afhængigheder:

Bash
npm install
Sørg for at du har en .env fil med din database-streng:

Kodestykke
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
Opdater databasen og generer klienten:

Bash
npx prisma db push
npx prisma generate
Start udviklingsserveren:

Bash
npm run dev