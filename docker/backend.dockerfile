# docker/backend.dockerfile
#
# Multi-stage build con dos targets:
#   development  → tsx watch para hot reload (sin compilar a JS)
#   production   → tsc build, solo dependencias de producción

# ── Stage base: dependencias comunes ─────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# Instalar dependencias del sistema necesarias para bcrypt y Prisma
RUN apk add --no-cache libc6-compat openssl

# ── Stage de dependencias ─────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copiar package.json del backend y del shared para instalar deps
COPY backend/package.json backend/package-lock.json* ./backend/
COPY shared/ ./shared/

WORKDIR /app/backend
RUN npm ci

# Generar el cliente Prisma
COPY backend/prisma ./prisma/
RUN npx prisma generate

# ── Stage de desarrollo ───────────────────────────────────────────────────────
FROM base AS development
WORKDIR /app/backend

# Copiar node_modules y cliente Prisma generado
COPY --from=deps /app/backend/node_modules ./node_modules
COPY --from=deps /app/backend/prisma ./prisma

# El código fuente se monta como volumen en docker-compose.yml
# para que tsx watch detecte cambios en tiempo real.
# Solo copiamos lo mínimo necesario para arrancar:
COPY backend/tsconfig.json ./
COPY shared/ ../shared/

EXPOSE 3000

# tsx watch compila TypeScript en tiempo real sin paso de build
CMD ["npx", "tsx", "watch", "src/server.ts"]

# ── Stage de build ────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app/backend

COPY backend/ ./
COPY shared/ ../shared/

# Compilar TypeScript a JavaScript
RUN npm run build

# ── Stage de producción ───────────────────────────────────────────────────────
FROM base AS production
WORKDIR /app/backend

ENV NODE_ENV=production

# Solo dependencias de producción (sin devDependencies)
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el build compilado y el cliente Prisma
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/backend/prisma ./prisma

# Usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 gymsync && \
    chown -R gymsync:nodejs /app
USER gymsync

EXPOSE 3000

# Ejecutar migraciones y arrancar el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
