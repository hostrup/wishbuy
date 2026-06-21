---
name: db-migrate
description: Synkroniserer Prisma database-schemaet med PostgreSQL databasen
---

Din opgave er at synkronisere Prisma schemaet med databasen.

### Arbejdsproces:

1. Kør `npx prisma db push --accept-data-loss` (eller `npx prisma migrate dev` hvis du vil oprette en migration).
2. Kør derefter `npx prisma generate` for at opdatere Prisma klienten.
3. Rapporter hvis der opstår databasefejl.
