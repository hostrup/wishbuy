---
name: deploy
description: Udfører fuld genbygning og deployment af wishbuy containeren
---

Din opgave er at bygge og deploye de nyeste ændringer til wishbuy containeren.

### Arbejdsproces:

1. Kør `./deploy.sh` i projektroden.
2. Scriptet vil generere Prisma klienten, push'e schema-ændringer og genstarte containeren.
3. Kontroller, at containeren er healthy bagefter.
