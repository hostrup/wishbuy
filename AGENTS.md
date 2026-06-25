# WishBuy / Hostrup Hub — Agent Guidelines

**LÆS `CLAUDE.md` INDEN DU SKRIVER KOD.** Det er den autoritative guide med arkitekturregler, tema-konventioner og hvad du IKKE må gøre.

---

## Framework & Commands

- **Framework**: SvelteKit (Svelte 5), Tailwind CSS v4, Prisma + PostgreSQL
- **Dev server**: `npm run dev`
- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Type check**: `npm run check`
- **Build verification**: `npm run build`
- **DB migration**: `npx prisma db push` (dev) / automatisk i `deploy.sh`
- **Deploy**: `./deploy.sh "commit message"` — kører lint → build → prisma push → docker rebuild

## Kritiske regler (uddybet i CLAUDE.md)

1. **Ingen hardkodede hex-farver** — brug Tailwind-klasser eller `var(--color-*)` CSS custom properties
2. **Ingen mutation af `$derived`** — brug `$effect` til side-effekter, `{#key ...}` til re-render
3. **Amber er pink** — `amber-500`+ er omkortet til Editorial Pink i temaet. Brug `rose-*` til pink, find et alternativ til orange
4. **Glassmorphism på alle kort** — `bg-white/80 backdrop-blur-xl border-slate-200/50 dark:bg-slate-800/80`
5. **Mørke baggrunde via tema** — `dark:bg-slate-950`, ALDRIG `dark:bg-[#xxxxxx]`
6. **Ingen direkte SQL** — brug altid Prisma

## Global Behavior

1. **No Manual Logs**: Brug `git log -n 5` og `git diff` til kontekst — aldrig manuelle logfiler
2. **Self-Verification**: Kør `npm run build` og `npm run lint` inden du rapporterer opgaven som done
3. **Strict Working Directory**: Opret ALDRIG filer uden for `/hostrup/docker/projects/wishbuy/`
4. **Backlog**: Se `BACKLOG.md` for prioriterede opgaver. Sprint 0 (tema-fejl) har højeste prioritet
