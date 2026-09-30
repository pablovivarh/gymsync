/**
 * backend/src/middlewares/ratelimit.middleware.ts
 *
 * Rate limiting para el endpoint de login (RF-03, doc arquitectura sección 4.2.5).
 * Almacenado en memoria del proceso en V1 (suficiente para una instancia).
 * Migrar a Redis store en V2 si se despliegan múltiples instancias.
 */
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const loginRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,  // devuelve info en cabeceras RateLimit-*
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: `Demasiados intentos de acceso. Por favor, espera ${Math.round(env.RATE_LIMIT_WINDOW_MS / 60000)} minutos antes de volver a intentarlo.`,
    },
  },
  // Solo aplica rate limit cuando hay error de credenciales (skipSuccessfulRequests)
  skipSuccessfulRequests: true,
});

// Rate limit global más permisivo para el resto de la API
export const globalRateLimit = rateLimit({
  windowMs: 60_000, // 1 minuto
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas peticiones. Por favor, espera un momento.',
    },
  },
});
