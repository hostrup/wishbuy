FROM node:22-slim

# Installer openssl som Prisma kræver
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Tving npm til at køre scripts uden at droppe root-rettigheder under byggefasen
ENV NPM_CONFIG_UNSAFE_PERM=true

# Kopier KUN package filerne ind først
COPY package*.json ./

# Nu vil npm install køre gnidningsfrit, da AppArmor ikke længere blokerer UNIX sockets!
RUN npm install

# Kopier resten af kildekoden ind
COPY . .

# Dummy URL, så Prisma ikke afbryder byggefasen
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN npx prisma generate
RUN npm run build

# --- SIKRING AF CONTAINER TIL RUNTIME ---
# Vi sletter den langsomme chown! Node-brugeren kan læse filerne automatisk.
# Skift direkte til 'node' brugeren, så selve appen IKKE kører som root, når den startes
USER node

EXPOSE 3000
ENV NODE_ENV=production

# Start den kompilerede applikation
CMD ["node", "build/index.js"]