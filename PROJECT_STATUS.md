# GymSync V1 — Estado del Proyecto

> Fecha de última actualización: 2026-06-04
> Estado global: **Fase 1 completada (pendiente Paso 6: tests de integración de auth)**

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Estructura de Archivos](#2-estructura-de-archivos)
3. [Estado por Fases](#3-estado-por-fases)
4. [Implementación de Auth (Fase 1)](#4-implementación-de-auth-fase-1)
5. [Modelo de Datos](#5-modelo-de-datos)
6. [Variables de Entorno](#6-variables-de-entorno)
7. [Decisiones Técnicas Importantes](#7-decisiones-técnicas-importantes)
8. [Cómo Arrancar el Proyecto desde Cero](#8-cómo-arrancar-el-proyecto-desde-cero)
9. [Endpoints Disponibles](#9-endpoints-disponibles)
10. [Próximas Fases](#10-próximas-fases)
11. [Vulnerabilidades Conocidas y Deuda Técnica](#11-vulnerabilidades-conocidas-y-deuda-técnica)

---

## 1. Arquitectura General

### Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Lenguaje | TypeScript | ^5.5.3 (strict mode) |
| Framework HTTP | Express | ^5.0.0 |
| ORM | Prisma | ^5.16.0 |
| Base de datos | PostgreSQL | 16 Alpine |
| Validación | Zod | ^3.23.8 |
| Autenticación | jsonwebtoken + bcryptjs | ^9.0.2 / ^2.4.3 |
| Logging | pino + pino-http | ^9.3.2 / ^10.2.0 |
| Tests | vitest + supertest | ^4.1.8 / ^7.0.0 |
| Frontend | React 18 + Vite + TanStack Query | — |

### Tipo de proyecto

**Monorepo sin workspaces** (plain monorepo). Cada paquete gestiona sus propias dependencias:

```
gymsync-v1/
├── backend/       ← API Node.js (@gymsync/backend)
├── frontend/      ← React SPA (@gymsync/frontend)
├── shared/        ← Schemas Zod compartidos (sin package.json propio)
├── docker/
├── docker-compose.yml        ← Desarrollo
└── docker-compose.prod.yml   ← Producción
```

### Arquitectura del backend

Patrón **Layered Architecture** estricto:

```
HTTP Request
    │
    ▼
Middlewares (orden en app.ts)
  1. Helmet          — cabeceras de seguridad
  2. CORS            — control de origen
  3. pino-http       — request logging estructurado
  4. globalRateLimit — 200 req/min por IP
  5. Body parsers    — JSON + urlencoded (límite 10kb)
    │
    ▼
Routes  (src/routes/)
  - Componen la cadena de middlewares y handler
  - No contienen lógica de negocio
    │
    ▼
Controllers  (src/controllers/)
  - Thin HTTP adapter
  - Extraen datos de req, llaman al servicio, escriben res
  - Sin try/catch (Express 5 propaga a errorMiddleware)
    │
    ▼
Services  (src/services/)
  - Toda la lógica de negocio
  - Lanzan ApiError para errores esperados
  - Único punto de acceso a Prisma
    │
    ▼
Prisma Client  (src/config/prisma.ts)
  - Singleton con reutilización en hot reload
    │
    ▼
PostgreSQL 16
```

**Error handling**: `errorMiddleware` (último middleware en app.ts) captura `ApiError`, `ZodError`, `PrismaClientKnownRequestError` (P2002, P2025) y errores genéricos → 500.

---

## 2. Estructura de Archivos

```
backend/src/
├── __tests__/
│   ├── health.test.ts         ← 7 tests de integración (health endpoints)
│   └── setup.ts               ← Variables de entorno para tests
├── config/
│   ├── env.ts                 ← Validación de env vars con Zod (fail-fast)
│   └── prisma.ts              ← Singleton del cliente Prisma
├── controllers/
│   └── auth.controller.ts     ← registerHandler, loginHandler, meHandler
├── jobs/
│   └── subscription-expiry.job.ts  ← Cron (comentado hasta Fase 3)
├── lib/
│   └── logger.ts              ← Instancia pino (silent en test, pretty en dev)
├── middlewares/
│   ├── auth.middleware.ts     ← requireAuth (JWT+DB), requireRole (RBAC)
│   ├── error.middleware.ts    ← Handler global de errores (4 params)
│   ├── ratelimit.middleware.ts ← loginRateLimit (5/15min) + globalRateLimit
│   └── validate.middleware.ts ← Fábrica Zod validate(schema, target?)
├── routes/
│   ├── auth.routes.ts         ← POST /register, POST /login, GET /me
│   ├── health.routes.ts       ← GET /health, GET /health/db
│   └── index.ts               ← Router raíz /api/v1
├── services/
│   └── auth.service.ts        ← register(), login(), getById(), verifyToken()
├── types/
│   ├── api-error.ts           ← Clase ApiError con factories estáticos
│   └── express.d.ts           ← Augmentación req.user: { id, email, role }
├── app.ts                     ← createApp() — configura Express sin escuchar
└── server.ts                  ← Entry point: valida env, conecta BD, arranca

shared/schemas/
├── auth.schemas.ts            ← RegisterSchema, LoginSchema, AuthResponseSchema
├── user.schemas.ts            ← CreateUserSchema, UserResponseSchema, passwordSchema
├── subscription.schemas.ts    ← SubscriptionResponseSchema
├── utils.ts                   ← dateStringSchema, datetimeStringSchema (Prisma Date→string)
└── index.ts                   ← Re-exporta todo

backend/prisma/
├── schema.prisma              ← Modelo de datos (User, Subscription + enums)
├── seed.ts                    ← Datos iniciales (admin por defecto)
└── migrations/
    ├── 20260603192935_init/            ← Schema inicial
    └── 20260604000001_add_active_subscription_unique_index/  ← Índice parcial RF-15
```

---

## 3. Estado por Fases

### Fase 0 — Fundación del proyecto ✅ COMPLETADA

**Objetivo**: Establecer la base técnica de calidad antes de añadir funcionalidades.

Trabajos realizados:
- [x] Configuración TypeScript strict mode con `rootDir: ".."` para monorepo
- [x] ESLint `recommended-requiring-type-checking` con overrides para tests
- [x] Prisma schema completo (User, Subscription, enums, relaciones)
- [x] Migración inicial + índice parcial PostgreSQL para unicidad de suscripción activa
- [x] `env.ts` con validación Zod fail-fast + `dotenv.config()` antes de la validación
- [x] `ApiError` con factories estáticos y `instanceof` seguro
- [x] `errorMiddleware` captura ApiError, ZodError, P2002, P2025
- [x] `validate.middleware.ts` con Zod safeParse
- [x] `pino` logger (silent en test, pretty en dev, JSON en producción)
- [x] `pino-http` conectado en app.ts (posición 3, antes de rate limit)
- [x] `globalRateLimit` + `loginRateLimit` configurados
- [x] Graceful shutdown con timeout 30s y `unref()`
- [x] Schemas Zod compartidos en `shared/` con `dateStringSchema`/`datetimeStringSchema`
- [x] `vitest.config.ts` con alias `@shared`, `include` explícito, setupFiles
- [x] 7 tests de integración (health endpoints, headers de seguridad, 404)
- [x] `tsconfig.json` corregido para monorepo: `rootDir: ".."`, `zod` en `paths`

### Fase 1 — Autenticación JWT ✅ COMPLETADA (pendiente Paso 6)

**Objetivo**: JWT Authentication completo: registro, login, middleware, RBAC.

Trabajos realizados:
- [x] **Paso 1**: `RegisterSchema` en `shared/schemas/auth.schemas.ts` + `pino-http` conectado
- [x] **Paso 2**: `auth.service.ts` — `register()`, `login()`, `getById()`, `verifyToken()`
- [x] **Paso 3**: `auth.middleware.ts` — `requireAuth` (JWT + DB check) + `requireRole` (RBAC)
- [x] **Paso 4**: `auth.controller.ts` — `registerHandler`, `loginHandler`, `meHandler`
- [x] **Paso 5**: `auth.routes.ts` + montaje en `routes/index.ts`
- [ ] **Paso 6**: Tests de integración `auth.test.ts` (pendiente)

### Fase 2 — Gestión de Usuarios ⏳ PENDIENTE

Endpoints previstos:
- `GET /api/v1/users` — listar usuarios (ADMIN, EMPLOYEE)
- `GET /api/v1/users/:id` — perfil de usuario
- `POST /api/v1/users` — crear usuario (ADMIN)
- `PATCH /api/v1/users/:id` — actualizar usuario
- `DELETE /api/v1/users/:id` — soft delete (ADMIN)

Archivos a crear: `users.service.ts`, `users.controller.ts`, `users.routes.ts`

### Fase 3 — Suscripciones ⏳ PENDIENTE

Endpoints previstos:
- `POST /api/v1/subscriptions` — crear suscripción (ADMIN, EMPLOYEE)
- `GET /api/v1/subscriptions/me` — suscripción activa del usuario
- `PATCH /api/v1/subscriptions/:id/cancel` — cancelar suscripción
- Activar cron job `subscription-expiry.job.ts`

### Fase 4 — Dashboard y Módulos Avanzados ⏳ PENDIENTE

- Clases y sesiones
- Reservas y aforo
- Instructores/monitores
- Dashboard con métricas

---

## 4. Implementación de Auth (Fase 1)

### Endpoints activos

| Método | Ruta | Middlewares | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/register` | `validate(RegisterSchema)` | Público |
| POST | `/api/v1/auth/login` | `loginRateLimit`, `validate(LoginSchema)` | Público |
| GET | `/api/v1/auth/me` | `requireAuth` | JWT requerido |

### Flujo de autenticación

```
Register:
  body → RegisterSchema (omite role) → bcrypt.hash(12) → prisma.create
  → role siempre 'CLIENT' (fijado en servicio, no en schema)

Login:
  email + password → DUMMY_HASH timing normalization → bcrypt.compare
  → misma respuesta 401 para: email inexistente / password incorrecto /
    cuenta inactiva / soft-deleted (no hay email enumeration)
  → signToken(userId, email, role) con HS256, expiresIn=JWT_EXPIRES_IN

requireAuth:
  Authorization: Bearer <token>
  → jwt.verify (algorithms: ['HS256'])  ← algoritmo pinned
  → TokenExpiredError → 401 "Sesión expirada"
  → JsonWebTokenError → 401 "Token inválido"
  → prisma.user.findUnique(payload.sub)
  → DB check: !user || deleted_at || status !== ACTIVE → 401 "Sesión inválida"
  → req.user = { id, email, role }
```

### Payload del JWT

```typescript
{
  sub: string;    // userId (UUID) — RFC 7519
  email: string;
  role: Role;     // 'ADMIN' | 'EMPLOYEE' | 'CLIENT'
  iat: number;
  exp: number;
}
```

### Protección de rutas futuras

```typescript
// Ruta pública
router.get('/public', handler)

// Solo autenticado (cualquier rol)
router.get('/profile', requireAuth, handler)

// Solo ADMIN
router.get('/admin', requireAuth, requireRole('ADMIN'), handler)

// ADMIN o EMPLOYEE
router.get('/staff', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), handler)
```

### Respuestas de la API

```json
// POST /auth/register — 201
{ "success": true, "data": { "user": { ...UserResponse } } }

// POST /auth/login — 200
{ "success": true, "data": { "accessToken": "eyJ...", "user": { id, nombre_completo, email, role } } }

// GET /auth/me — 200
{ "success": true, "data": { "user": { ...UserResponse } } }

// Errores — 4xx/5xx
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }

// Error de validación — 400
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { ... } } }
```

---

## 5. Modelo de Datos

### User

```prisma
model User {
  id               String     @id @default(uuid()) @db.Uuid
  email            String     @unique @db.VarChar(255)
  password_hash    String     @db.VarChar(255)
  nombre_completo  String     @db.VarChar(120)
  telefono         String?    @db.VarChar(20)
  fecha_nacimiento DateTime?  @db.Date
  direccion_postal String?    @db.Text
  role             Role       @default(CLIENT)   // ADMIN | EMPLOYEE | CLIENT
  status           UserStatus @default(ACTIVE)   // ACTIVE | INACTIVE | DELETED
  deleted_at       DateTime?                     // soft delete
  created_at       DateTime   @default(now())
  updated_at       DateTime   @updatedAt
}
```

### Subscription

```prisma
model Subscription {
  id           String             @id @default(uuid()) @db.Uuid
  user_id      String             @db.Uuid
  modalidad    Modalidad          // MONTHLY | QUARTERLY | ANNUAL
  fecha_inicio DateTime           @db.Date
  fecha_fin    DateTime           @db.Date
  status       SubscriptionStatus @default(ACTIVE)  // ACTIVE | EXPIRED | CANCELLED
  created_by   String             @db.Uuid
  created_at   DateTime           @default(now())
  updated_at   DateTime           @updatedAt
}
```

### Restricción de unicidad de suscripción activa (RF-15)

No expresable en Prisma Schema Language. Implementada como SQL raw en migración:

```sql
-- 20260604000001_add_active_subscription_unique_index/migration.sql
CREATE UNIQUE INDEX "subscriptions_user_id_active_unique"
ON "subscriptions" ("user_id")
WHERE "status" = 'ACTIVE';
```

Garantiza que un usuario no puede tener más de una suscripción ACTIVE simultáneamente a nivel de base de datos.

---

## 6. Variables de Entorno

### `backend/.env` (desarrollo local)

```env
# Servidor
NODE_ENV=development
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://gymsync:gymsync_dev_password@localhost:5432/gymsync_db

# JWT — mínimo 32 caracteres
# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=tu_secreto_aqui_minimo_32_caracteres
JWT_EXPIRES_IN=8h

# CORS — origen del frontend
CORS_ORIGIN=http://localhost:5173

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000   # 15 minutos en ms
RATE_LIMIT_MAX=5              # intentos fallidos por ventana
```

### Validación

Todas las variables se validan con Zod en el arranque (`src/config/env.ts`). Si falta una variable crítica, el proceso termina inmediatamente con mensaje claro.

### Nota sobre `JWT_EXPIRES_IN`

El valor por defecto en env.ts es `15m`. Para un SaaS de gestión interna con personal trabajando turnos de 8h, se recomienda cambiar a `8h` en el `.env` local. Los refresh tokens llegan en Fase 2.

---

## 7. Decisiones Técnicas Importantes

### 7.1 TypeScript `rootDir: ".."` para monorepo

**Problema**: El backend importa schemas de `../shared/` vía `@shared/*`. TypeScript rechazaba estos archivos porque estaban fuera de `rootDir: "./src"` (error TS6059).

**Solución adoptada**: Cambiar `rootDir: ".."` (monorepo root) y añadir `"zod": ["./node_modules/zod"]` a `paths` para que TypeScript encuentre `zod` cuando compila archivos de `shared/`.

**Impacto en el build**: El output `tsc` va a `dist/backend/src/server.js` en lugar de `dist/server.js`. Scripts `start` y `main` actualizados en `package.json`.

**Alternativa descartada**: TypeScript project references + `shared/tsconfig.json` — correcto a largo plazo, pero añade complejidad innecesaria para V1.

### 7.2 Prevención de timing attack en login

El método `login()` siempre ejecuta `bcrypt.compare()`, incluso cuando el email no existe. Se usa un `DUMMY_HASH_PROMISE` precalculado al cargar el módulo (coste 12, ~250ms). Esto normaliza el tiempo de respuesta y previene la enumeración de cuentas por canal de tiempo.

```typescript
const isMatch = await bcrypt.compare(
  input.password,
  user?.password_hash ?? dummyHash  // nunca hay fast-path
);
```

### 7.3 DB check en `requireAuth`

`requireAuth` hace una query a BD en cada petición protegida para verificar que el usuario sigue activo. Esto garantiza que:
- Una cuenta desactivada no puede usar tokens emitidos antes de la desactivación
- El efecto es inmediato (sin esperar a que expire el token)

Para V1 (≤500 usuarios, instancia única) el coste es aceptable. En V2 se puede añadir caché Redis con TTL corto.

### 7.4 JWT stateless con DB check — decisión de diseño

Los tokens son stateless (HS256) pero `requireAuth` hace un DB check. Esta combinación intencional:
- **Token**: contiene `{ sub, email, role }` — suficiente para el lookup inicial
- **DB check**: verifica `status`, `deleted_at` — cambian con el tiempo
- **Sin refresh tokens en V1**: el `JWT_EXPIRES_IN` controla la duración de sesión

Se acepta la contradicción conceptual "stateless con DB check" como trade-off de seguridad.

### 7.5 Error messages en login — mismo texto siempre

Todos los fallos de login devuelven `401 "Credenciales inválidas"`:
- Email no existe
- Contraseña incorrecta
- Cuenta inactiva
- Cuenta con soft-delete

Esto impide que un atacante sepa si un email está registrado en el sistema.

### 7.6 `RegisterSchema` omite el campo `role`

`RegisterSchema = CreateUserSchema.omit({ role: true })`. El registro público siempre crea cuentas `CLIENT`. El campo `role` se fija en el servicio (`role: 'CLIENT'`), no en el schema. Aunque alguien envíe `role: 'ADMIN'` en el body, Zod lo stripea silenciosamente.

### 7.7 `pino-http` posicionado antes de rate limit

El middleware de request logging está en posición 3 (después de Helmet y CORS, antes de rate limit). Esto garantiza que las peticiones bloqueadas por rate limit también quedan registradas, lo cual es relevante para auditoría de seguridad.

### 7.8 Índice parcial para unicidad de suscripción activa

La restricción "solo una suscripción ACTIVE por usuario" se implementa a nivel de BD con un índice parcial PostgreSQL (`WHERE status = 'ACTIVE'`). No es expresable en Prisma Schema Language, se crea como SQL raw en migración. Es una de las razones técnicas para elegir PostgreSQL sobre MySQL.

### 7.9 `as const` en `USER_PUBLIC_SELECT`

```typescript
const USER_PUBLIC_SELECT = { id: true, email: true, ... } as const;
```

El `as const` hace que el tipo sea `{ readonly id: true, readonly email: true, ... }`. Prisma infiere el tipo de retorno exactamente de las columnas seleccionadas. Si se añade un campo sensible al modelo y no se añade a `USER_PUBLIC_SELECT`, el tipo de retorno no lo incluye automáticamente — protección por diseño.

### 7.10 Express 5 — async error propagation

Express 5 propaga automáticamente errores de handlers/middlewares async a `errorMiddleware`. Los controllers no necesitan try/catch:

```typescript
// En Express 5, si register() lanza, Express llama next(err) automáticamente
export async function registerHandler(req: Request, res: Response): Promise<void> {
  const user = await register(req.body as RegisterInput);  // puede lanzar
  res.status(201).json({ success: true, data: { user } });
}
```

`requireAuth` sí usa try/catch explícito para distinguir entre errores de JWT (que se convierten a ApiError con mensajes específicos) y otros errores.

---

## 8. Cómo Arrancar el Proyecto desde Cero

### Prerequisitos

- Node.js 20 LTS
- Docker Desktop (para PostgreSQL)
- `npm` o equivalente

### Opción A: Backend local + PostgreSQL en Docker (recomendado para desarrollo)

```bash
# 1. Clonar/descomprimir el proyecto
cd gymsync-v1

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Levantar solo PostgreSQL con Docker
cd ..
docker compose up db -d
# Esperar a que esté healthy (verificar con: docker compose ps)

# 4. Configurar variables de entorno
cd backend
cp .env.example .env   # si existe, o crear manualmente
# Editar .env con:
#   DATABASE_URL=postgresql://gymsync:gymsync_dev_password@localhost:5432/gymsync_db
#   JWT_SECRET=<min 32 chars — generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
#   JWT_EXPIRES_IN=8h

# 5. Generar cliente Prisma
npm run prisma:generate

# 6. Aplicar migraciones
npm run prisma:migrate
# O en producción: npm run prisma:migrate:deploy

# 7. (Opcional) Cargar datos de prueba
npm run prisma:seed

# 8. Arrancar el backend en modo desarrollo
npm run dev
# → "GymSync API iniciada" en http://localhost:3000
```

### Opción B: Todo en Docker (desarrollo completo)

```bash
cd gymsync-v1

# Asegurarse de que backend/.env existe con JWT_SECRET
# (docker-compose.yml lo requiere para la variable JWT_SECRET)

# Levantar backend + PostgreSQL
docker compose up --build

# Aplicar migraciones (primera vez)
docker compose exec api npx prisma migrate deploy
```

### Opción C: Producción

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### Verificar que todo funciona

```bash
# Health check básico
curl http://localhost:3000/api/v1/health

# Health check con BD
curl http://localhost:3000/api/v1/health/db

# Registro de usuario de prueba
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre_completo":"Test User","email":"test@gymsync.com","password":"Test@12345"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gymsync.com","password":"Test@12345"}'
# Guarda el accessToken de la respuesta

# Perfil autenticado
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### Comandos de desarrollo

```bash
cd backend

npm run dev            # Backend con hot reload (tsx watch)
npm run test           # Tests (vitest run)
npm run test:watch     # Tests en modo watch
npm run test:coverage  # Tests + cobertura
npm run lint           # ESLint (--max-warnings 0)
npm run lint:fix       # ESLint con autofix
npm run typecheck      # tsc --noEmit
npm run build          # Compilar a dist/

npm run prisma:studio  # GUI visual de la BD (Prisma Studio)
npm run prisma:seed    # Cargar datos iniciales
```

---

## 9. Endpoints Disponibles

### Sin autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/health` | Estado de la API |
| GET | `/api/v1/health/db` | Conectividad con PostgreSQL |
| POST | `/api/v1/auth/register` | Registro público (rol CLIENT) |
| POST | `/api/v1/auth/login` | Autenticación email + contraseña |

### Con autenticación (Bearer Token)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/v1/auth/me` | Todos | Perfil del usuario autenticado |

### Rate limiting activo

- **Global**: 200 req/min por IP (todas las rutas)
- **Login**: 5 intentos fallidos / 15 min por IP (`skipSuccessfulRequests: true`)

---

## 10. Próximas Fases

### Fase 1 — Pendiente

- [ ] **Paso 6**: `src/__tests__/auth.test.ts` — 18+ tests de integración para todos los endpoints de auth (register, login, me, requireAuth, requireRole)

### Fase 2 — Gestión de Usuarios

Nuevos archivos:
```
backend/src/
  services/users.service.ts
  controllers/users.controller.ts
  routes/users.routes.ts
```

Endpoints:
- `GET /api/v1/users` — listado con filtros y paginación (ADMIN, EMPLOYEE)
- `GET /api/v1/users/:id` — perfil detallado
- `POST /api/v1/users` — crear usuario con rol específico (ADMIN)
- `PATCH /api/v1/users/:id` — actualizar datos del perfil
- `DELETE /api/v1/users/:id` — soft delete (ADMIN)

Schemas compartidos nuevos: ninguno (ya existen `CreateUserSchema`, `UpdateUserSchema`, `UserQuerySchema`)

### Fase 3 — Suscripciones

```
backend/src/
  services/subscriptions.service.ts
  controllers/subscriptions.controller.ts
  routes/subscriptions.routes.ts
  jobs/subscription-expiry.job.ts  ← descomentar y activar
```

También: añadir `PATCH /api/v1/users/:id/status` para activar/desactivar cuentas.

### Fase 4 — Módulos Avanzados

Requieren definición de schema Prisma adicional:
- `Class` (clases/actividades del gimnasio)
- `ClassSession` (sesiones programadas con instructor y aforo)
- `Booking` (reserva de cliente a sesión)
- `Instructor` (perfil extendido de empleado con especialidades)

---

## 11. Vulnerabilidades Conocidas y Deuda Técnica

### Vulnerabilidades de dependencias

| Paquete | Severidad | Estado |
|---------|-----------|--------|
| `node-cron@3.x` → `uuid <11.1.1` | Moderada | **Aceptada para V1** — el job está comentado, fix requiere `node-cron@4` (breaking change) |

### Deuda técnica conocida

| Ítem | Impacto | Fase para resolver |
|------|---------|-------------------|
| Sin refresh tokens | Media — sesiones limitadas por `JWT_EXPIRES_IN` | Fase 2 |
| `loginRateLimit` en memoria | Media — no escala a múltiples instancias | Fase 2+ (Redis) |
| Sin rate limit en `/register` | Baja — cubierto por globalRateLimit | Fase 2 |
| `JWT_EXPIRES_IN` defecto `15m` en env.ts | Info — muy corto para uso diario | Cambiar a `8h` en `.env` local |
| `version: '1.0.0'` hardcodeado en health.routes | Info | Fase 2 (leer de package.json) |
| Naming mixto en Prisma schema (español/inglés) | Info | Antes de datos de producción |
| Sin tests de auth (Paso 6 pendiente) | Alta — cobertura incompleta | Siguiente paso inmediato |
| Rate limiting no cubre todos los endpoints de escritura | Baja | Fase 2+ |
