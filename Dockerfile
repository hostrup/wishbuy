FROM node:22-slim

# openssl kræves af Prisma
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Tving npm til at køre scripts uden at droppe root-rettigheder under byggefasen
ENV NPM_CONFIG_UNSAFE_PERM=true

# Kun manifesterne først, så npm-laget genbruges når kun kildekoden ændrer sig
COPY package.json package-lock.json ./

# 'ci' frem for 'install': installerer præcis det lockfilen siger, så imaget er
# reproducerbart og et build aldrig trækker nyere transitive versioner ind.
# devDependencies beholdes bevidst — 'docker exec wishbuy npx prisma db push'
# er det dokumenterede schema-flow og kræver Prisma CLI i containeren.
RUN npm ci

COPY . .

# Dummy URL, så Prisma ikke afbryder byggefasen
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN npx prisma generate
RUN npm run build

# Appen kører som 'node', ikke root
USER node

EXPOSE 3000
ENV NODE_ENV=production

# /manifest.json er en bypass-rute i hooks.server.ts og svarer uden auth-header
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:3000/manifest.json').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "build/index.js"]
