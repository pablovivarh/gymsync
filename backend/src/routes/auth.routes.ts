/**
 * backend/src/routes/auth.routes.ts
 *
 * Rutas de autenticación — Fase 1.
 * Responsabilidad exclusiva: componer middlewares y handlers.
 * No contiene lógica de negocio, no accede a Prisma, no verifica JWT.
 *
 * POST /api/v1/auth/register  — registro público (rol CLIENT)
 * POST /api/v1/auth/login     — autenticación email + contraseña
 * GET  /api/v1/auth/me        — perfil del usuario autenticado
 */
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware';
import { requireAuth } from '../middlewares/auth.middleware';
import { loginRateLimit } from '../middlewares/ratelimit.middleware';
import { RegisterSchema, LoginSchema } from '@shared/schemas/auth.schemas';
import { registerHandler, loginHandler, meHandler } from '../controllers/auth.controller';

const router = Router();

// ── POST /register ────────────────────────────────────────────────────────────
// Endpoint público. No requiere autenticación previa.
// validate() parsea y transforma el body (email lowercase, trim) antes del handler.
// El rol siempre es CLIENT — no se acepta rol en el body (auth.service lo fija).
router.post('/register', validate(RegisterSchema), registerHandler);

// ── POST /login ───────────────────────────────────────────────────────────────
// loginRateLimit: 5 intentos fallidos / 15 min por IP (configurable vía env).
// Se aplica ANTES de validate para proteger incluso peticiones malformadas.
// skipSuccessfulRequests: true — los logins correctos no consumen el contador.
router.post('/login', loginRateLimit, validate(LoginSchema), loginHandler);

// ── GET /me ───────────────────────────────────────────────────────────────────
// requireAuth verifica el JWT, hace DB check y puebla req.user.
// El controller obtiene el perfil fresco desde BD usando req.user.id.
router.get('/me', requireAuth, meHandler);

export { router as authRouter };
