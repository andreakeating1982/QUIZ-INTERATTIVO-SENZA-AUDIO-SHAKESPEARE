# =============================================================================
# Dockerfile (root) — build COMPLETO in un solo stage (comodo per docker compose
# e per chi vuole verificare l'app in container partendo dal codice sorgente).
#   docker build -t quiz-interattivo .
#   docker run --rm -p 3000:3000 -e DATABASE_URL=... -e BETTER_AUTH_SECRET=... quiz-interattivo
#
# ⚠️ NON usare questo Dockerfile per il deploy su Render: lì serve
#    deploy/Dockerfile.render (referenziato da render.yaml). Il Dockerfile
#    "semplice" con dist/ già buildata resta deploy/Dockerfile.
# =============================================================================
FROM node:20-alpine

WORKDIR /app

# Abilita pnpm (packageManager in package.json)
RUN corepack enable pnpm

# package.json + lockfile prima del resto (cache layer)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copia tutto il resto e builda: vite → dist/public, esbuild server → dist/index.js
COPY . .
RUN pnpm build

# Le migrazioni DB girano all'avvio (drizzle-kit push) via docker-entrypoint.sh,
# che poi lancia il comando passato come argomento.
RUN chmod +x deploy/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "deploy/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
