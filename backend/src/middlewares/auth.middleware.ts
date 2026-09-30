/**
 * backend/src/middlewares/auth.middleware.ts
 *
 * Capa de autenticación y autorización de todas las rutas protegidas.
 *
 * requireAuth — verifica el JWT, comprueba el estado del usuario en BD
 *               y puebla req.user para los handlers posteriores.
 *
 * requireRole — RBAC: verifica que req.user.role está en la lista permitida.
 *               Siempre se encadena DESPUÉS de requireAuth.
 */
import { Request, Response, NextFunction } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../types/api-error';
import { verifyToken } from '../services/auth.service';
import type { TokenPayload } from '../services/auth.service';

// ── Helpers privados ─────────────────────────────────────────────────────────

/**
 * Extrae el Bearer token del header Authorization.
 * Lanza ApiError 401 si el header falta o no sigue el formato "Bearer <token>".
 */
function extractBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Se requiere autenticación');
  }
  return header.slice(7); // "Bearer ".length === 7
}

/**
 * Llama a verifyToken y convierte errores JWT en ApiError con mensajes claros.
 * TokenExpiredError → 401 "Sesión expirada"
 * Cualquier otro error JWT → 401 "Token inválido"
 * No se revelan detalles internos del fallo de verificación.
 */
function decodeToken(token: string): TokenPayload {
  try {
    return verifyToken(token);
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw ApiError.unauthorized('Sesión expirada — vuelve a iniciar sesión');
    }
    // JsonWebTokenError (firma incorrecta, formato malformado, alg inválido, etc.)
    // NotBeforeError (nbf claim en el futuro)
    // Cualquier otro error inesperado de jwt.verify
    throw ApiError.unauthorized('Token inválido');
  }
}

// ── Middlewares exportados ───────────────────────────────────────────────────

/**
 * Middleware de autenticación JWT con DB check.
 *
 * Flujo:
 *  1. Extraer Bearer token del header → 401 si falta o mal formado
 *  2. Verificar firma y expiración del JWT → 401 con mensaje específico
 *  3. Buscar usuario en BD por payload.sub (userId) → 401 si no existe
 *  4. Verificar deleted_at === null → 401 si soft-deleted
 *  5. Verificar status === ACTIVE → 401 si inactivo
 *  6. Poblar req.user = { id, email, role } y llamar next()
 *
 * El DB check (paso 3-5) garantiza que tokens válidos emitidos antes de
 * que una cuenta fuera desactivada no permitan acceso.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    const payload = decodeToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        deleted_at: true,
      },
    });

    if (!user || (user.deleted_at !== null && user.deleted_at !== undefined) || user.status !== 'ACTIVE') {
      throw ApiError.unauthorized('Sesión inválida');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware de autorización RBAC.
 *
 * Uso:
 *   router.get('/admin-only', requireAuth, requireRole('ADMIN'), handler)
 *   router.get('/staff',      requireAuth, requireRole('ADMIN', 'EMPLOYEE'), handler)
 *
 * Invariante: siempre se usa encadenado DESPUÉS de requireAuth.
 * Si req.user no está poblado es un bug de configuración — devuelve 401.
 */
export function requireRole(
  ...roles: Role[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Indica un error de configuración: requireRole usado sin requireAuth
      next(ApiError.unauthorized('No autenticado'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        ApiError.forbidden(
          `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}`
        )
      );
      return;
    }

    next();
  };
}
