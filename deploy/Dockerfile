# =============================================================================
# deploy/Dockerfile — build COMPLETO dal sorgente (deploy generici / VPS / EP).
# Equivalente funzionale al Dockerfile a root: installa, builda (vite → dist/public,
# esbuild → dist/index.js) ed esegue le migrazioni all'avvio.
#   docker build -f deploy/Dockerfile -t quiz-interattivo .
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

# Migrazioni DB all'avvio (drizzle-kit push) via docker-entrypoint.sh, che poi
# lancia il comando passato come argomento.
RUN chmod +x deploy/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "deploy/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
