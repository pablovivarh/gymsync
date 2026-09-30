/**
 * backend/src/controllers/auth.controller.ts
 *
 * Adaptador HTTP de la capa de autenticación.
 *
 * Esta capa ÚNICAMENTE:
 *  1. Extrae datos tipados de req.body / req.user
 *  2. Delega a authService (register / login / getById)
 *  3. Serializa la respuesta con el código HTTP correcto
 *
 * Esta capa NUNCA:
 *  - Contiene lógica de negocio
 *  - Accede a Prisma directamente
 *  - Verifica JWT
 *  - Implementa validaciones de dominio
 *
 * Todos los errores (ApiError, ZodError, PrismaError) se propagan sin capturar.
 * Express 5 los reenvía automáticamente a errorMiddleware.
 *
 * Precondiciones por endpoint:
 *  - registerHandler: req.body validado por validate(RegisterSchema)
 *  - loginHandler:    req.body validado por validate(LoginSchema)
 *  - meHandler:       req.user poblado por requireAuth
 */
import { Request, Response } from 'express';
import { register, login, getById } from '../services/auth.service';
import { ApiError } from '../types/api-error';
import type { RegisterInput, LoginInput } from '@shared/schemas/auth.schemas';

// ── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 *
 * Registra un nuevo usuario como CLIENT.
 * El campo role no se acepta en el body — auth.service lo fija en 'CLIENT'.
 * Responde 201 con el perfil creado (sin password_hash).
 */
export async function registerHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;
  const user = await register(input);
  res.status(201).json({
    success: true,
    data: { user },
  });
}

/**
 * POST /api/v1/auth/login
 *
 * Autentica con email + contraseña.
 * Responde 200 con accessToken y perfil mínimo del usuario.
 * auth.service garantiza mismo tiempo de respuesta y mismo mensaje
 * de error para credenciales inválidas (prevención de timing attack).
 */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;
  const result = await login(input);
  res.json({
    success: true,
    data: result,
  });
}

/**
 * GET /api/v1/auth/me
 *
 * Devuelve el perfil completo del usuario autenticado.
 * Los datos se obtienen frescos desde BD — no se usan datos del token.
 * Esto garantiza que cambios recientes en el perfil se reflejan inmediatamente.
 *
 * Precondición: requireAuth debe ejecutarse antes de este handler.
 * El guard de req.user detecta errores de configuración de rutas en desarrollo.
 */
export async function meHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw ApiError.unauthorized('No autenticado');
  }
  const user = await getById(req.user.id);
  res.json({
    success: true,
    data: { user },
  });
}
