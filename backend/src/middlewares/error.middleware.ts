/**
 * backend/src/middlewares/error.middleware.ts
 *
 * Handler global de errores. Debe registrarse ÚLTIMO en app.ts
 * (después de todas las rutas) porque Express identifica los handlers
 * de error por su aridad de 4 parámetros: (err, req, res, next).
 *
 * Captura:
 * - ApiError lanzados desde servicios → código HTTP específico
 * - ZodError del middleware de validación → 400 con detalles del campo
 * - Errores de Prisma conocidos → 409 (unique constraint), 404 (not found)
 * - Cualquier otro error → 500 sin exponer detalles internos
 */
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../types/api-error';
import { logger } from '../lib/logger';

function isZodErrorLike(value: unknown): value is { issues: unknown[]; flatten: () => { fieldErrors: Record<string, string[]> } } {
  return !!value && typeof value === 'object' && 'issues' in value && Array.isArray((value as { issues?: unknown[] }).issues);
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ── ApiError (lanzados desde servicios) ──────────────────────────────────
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code ?? 'ERROR',
        message: err.message,
      },
    });
    return;
  }

  // ── ZodError (validación de entrada — desde validate.middleware) ──────────
  if (isZodErrorLike(err)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos proporcionados no son válidos',
        fields: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // ── Errores de Prisma ─────────────────────────────────────────────────────
  const prismaError = err as {
    code?: string;
    meta?: { target?: string[] | string };
  };

  if (
    (err instanceof Prisma.PrismaClientKnownRequestError ||
      (typeof prismaError?.code === 'string' && prismaError.code.startsWith('P'))) &&
    typeof prismaError?.code === 'string'
  ) {
    const errorCode = prismaError.code;

    // P2002: Unique constraint violation
    if (errorCode === 'P2002') {
      const fields =
        (Array.isArray(prismaError.meta?.target)
          ? prismaError.meta.target.join(', ')
          : typeof prismaError.meta?.target === 'string'
            ? prismaError.meta.target
            : 'campo') ?? 'campo';

      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: `Ya existe un registro con ese valor en: ${fields}`,
        },
      });
      return;
    }

    // P2025: Record not found
    if (errorCode === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Registro no encontrado',
        },
      });
      return;
    }
  }

  // ── Error genérico (nunca exponer detalles en producción) ─────────────────
  logger.error({ err }, 'Error no manejado');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    },
  });
}
