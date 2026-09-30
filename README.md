# GymSync V1 — Guía de Inicio

Plataforma web de gestión de gimnasios y centros deportivos.  
Stack: React 18 · TypeScript · Vite · Tailwind · Express · PostgreSQL · Prisma · Docker

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | `npm --version` |
| Docker | 24+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |
| Git | cualquiera | `git --version` |

---

## Opción A — Desarrollo local (recomendada para desarrollo activo)

El backend y la BD corren en Docker. El frontend corre con Vite directamente en el host para aprovechar el HMR.

### 1. Clonar y preparar variables de entorno

```bash
git clone <repo-url> gymsync-v1
cd gymsync-v1
cp .env.example .env
```

Editar `.env` y establecer al menos:

```
JWT_SECRET=<cadena-aleatoria-minimo-32-chars>
```

Generar un JWT_SECRET seguro:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Instalar dependencias del monorepo

```bash
# Dependencias raíz (concurrently, prettier)
npm install

# Dependencias del backend
cd backend && npm install && cd ..

# Dependencias del frontend
cd frontend && npm install && cd ..
```

### 3. Levantar base de datos con Docker

```bash
docker compose up db -d
```

Verificar que PostgreSQL está listo:

```bash
docker compose ps
# El servicio 'db' debe mostrar status: healthy
```

### 4. Aplicar el esquema de base de datos

```bash
# Desde la raíz del monorepo:
npm run db:migrate
# Nombre de la migración cuando pregunte: init

# O directamente:
cd backend && npx prisma migrate dev --name init && cd ..
```

### 5. Poblar la BD con datos de desarrollo

```bash
npm run db:seed
```

Esto crea tres usuarios de prueba:

| Email | Contraseña | Rol |
|---|---|---|
| admin@gymsync.dev | Admin123! | ADMIN |
| empleado@gymsync.dev | Employee123! | EMPLOYEE |
| socio@gymsync.dev | Client123! | CLIENT |

### 6. Levantar el backend

```bash
npm run dev:backend
# O: cd backend && npm run dev
```

El servidor arranca en `http://localhost:3000`.  
Debe mostrar en consola: `✅ Conexión a PostgreSQL establecida`

### 7. Levantar el frontend (terminal separada)

```bash
npm run dev:frontend
# O: cd frontend && npm run dev
```

El servidor de Vite arranca en `http://localhost:5173`.

### 8. Verificar que todo funciona

Abrir `http://localhost:5173/health` en el navegador.  
Deben aparecer tres tarjetas en verde:

- ✅ Frontend React
- ✅ Backend API
- ✅ PostgreSQL

Alternativamente, verificar por terminal:

```bash
# Health de la API
curl http://localhost:3000/api/v1/health
# Respuesta esperada: {"success":true,"data":{"status":"ok",...}}

# Health de la BD
curl http://localhost:3000/api/v1/health/db
# Respuesta esperada: {"success":true,"data":{"status":"ok","database":"postgresql",...}}
```

---

## Opción B — Todo en Docker (incluido el backend con hot reload)

```bash
cp .env.example .env
# Editar .env con JWT_SECRET

docker compose up --build
```

El backend corre con `tsx watch` dentro del contenedor, montando el código fuente como volumen para hot reload.  
El frontend sigue corriendo localmente con `npm run dev:frontend`.

---

## Herramientas de desarrollo

### Prisma Studio — explorador visual de la BD

```bash
npm run db:studio
# Abre http://localhost:5555
```

### Ejecutar linter

```bash
npm run lint          # frontend + backend
npm run lint:frontend
npm run lint:backend
```

### Verificar tipos TypeScript

```bash
npm run typecheck
```

### Formatear código

```bash
npm run format
```

---

## Estructura del proyecto

```
gymsync-v1/
├── frontend/        # React 18 + TypeScript + Vite + Tailwind
├── backend/         # Express 5 + TypeScript + Prisma
│   └── prisma/      # schema.prisma + migraciones
├── shared/
│   └── schemas/     # Schemas Zod compartidos (fuente única de verdad)
├── docker/
│   ├── nginx/       # nginx.conf para producción
│   ├── backend.dockerfile
│   └── frontend.dockerfile
├── docker-compose.yml       # Desarrollo
├── docker-compose.prod.yml  # Producción
└── .env.example
```

---

## Estado de las fases de desarrollo

| Fase | Módulo | Estado |
|---|---|---|
| Fase 0 | Inicialización, estructura, Docker, Prisma | ✅ Completa |
| Fase 1 | Autenticación (JWT, login, register) | 🔜 Siguiente |
| Fase 2 | Gestión de usuarios (CRUD + RBAC) | ⏳ Pendiente |
| Fase 3 | Gestión de suscripciones | ⏳ Pendiente |
| Fase 4 | Dashboard y KPIs | ⏳ Pendiente |

---

## Solución de problemas comunes

**Error: `JWT_SECRET must have at least 32 characters`**  
El archivo `.env` no existe o JWT_SECRET está vacío. Ejecutar el comando de generación indicado en el paso 1.

**Error: `Cannot connect to PostgreSQL`**  
El contenedor de la BD no está listo. Verificar con `docker compose ps` que el servicio `db` tiene status `healthy`. Esperar 10-15 segundos y reintentar.

**Error: `relation "users" does not exist`**  
Las migraciones no se han aplicado. Ejecutar `npm run db:migrate`.

**Puerto 5432 ya en uso**  
Otra instancia de PostgreSQL está corriendo en el host. Cambiar `POSTGRES_PORT` en `.env` a otro valor (ej: 5433) o detener el proceso existente.

**El frontend no conecta con el backend**  
Verificar que el backend está corriendo en el puerto 3000. El proxy de Vite (`/api → localhost:3000`) solo funciona cuando ambos servicios están activos.
