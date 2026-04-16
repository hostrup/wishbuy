FROM node:22-slim

# Installer openssl som Prisma kræver
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Brug præcis den mappe som templaten foreslår
WORKDIR /usr/src/app

# Kopier KUN package filerne ind først
COPY package*.json ./

# Kør en helt standard, rå installation
RUN npm install

# Kopier resten af kildekoden ind
COPY . .

# Dummy URL, så Prisma ikke afbryder byggefasen
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Generer Prisma og byg SvelteKit appen
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production

# Start den kompilerede applikation
CMD ["node", "build/index.js"]