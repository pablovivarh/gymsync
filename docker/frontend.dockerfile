# docker/frontend.dockerfile
#
# Multi-stage build:
#   1. builder  → instala deps y compila el frontend con Vite
#   2. runner   → Nginx sirve el build estático + actúa como reverse proxy

# ── Stage 1: Build del frontend ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar solo lo necesario para instalar dependencias (mejora caché de Docker)
COPY frontend/package.json frontend/package-lock.json* ./frontend/
COPY shared/ ./shared/

WORKDIR /app/frontend
RUN npm ci

# Copiar el resto del código y compilar
COPY frontend/ ./
COPY shared/ ../shared/

# El build de producción incluye tree-shaking y chunking (vite.config.ts)
RUN npm run build

# ── Stage 2: Nginx ────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

# Eliminar configuración por defecto de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuración de GymSync
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf

# Copiar el build estático del frontend
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Nginx corre como usuario no-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
