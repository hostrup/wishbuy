# WishBuy — Antigravity Agent Guidelines

This is a wishlist application built with SvelteKit, Prisma, and PostgreSQL.

## Architecture & Database
- **Framework**: SvelteKit (Vite/Node.js).
- **Database**: PostgreSQL database.
- **ORM**: Prisma. The Prisma schema is located in `prisma/schema.prisma`.
- **Authentication**: Proxied by Authelia, passing down the user through the `Remote-User` header (defined in `AUTH_HEADER` env).

## Commands & Actions
- **Development**: `npm run dev` starts the SvelteKit local dev server.
- **Lint & Format**: `npm run lint` and `npm run format`.
- **Database Migration**: `npx prisma db push` or `npx prisma migrate dev` to sync schema modifications.
- **Build Verification**: `npm run build` to verify production compilation.
- **Deploy**: Run `./deploy.sh` to update Prisma client, push migrations, and rebuild the container.

## Global Behavior & Project Rules
1. **No Manual Logs**: Do not create or read manual log files to track state. Rely on Git history (`git log -n 5`, `git diff`) and the current conversational context.
2. **Local Skills**: Use the local skills in `.agents/skills/` (like `/build-check`, `/db-migrate`, or `/deploy`) when appropriate. Keep tasks atomic.
3. **Self-Verification**: Always verify changes by running `npm run build` or deploying via `./deploy.sh` before reporting back.
