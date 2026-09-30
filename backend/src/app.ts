/**
 * backend/src/app.ts
 *
 * Crea y configura la aplicación Express.
 * Separado de server.ts para permitir que los tests importen
 * la app sin levantar el servidor HTTP.
 *
 * Orden de middlewares (importa):
 *   1. Helmet  — cabeceras de seguridad (antes de todo)
 *   2. CORS    — permite peticiones del frontend
 *   3. HTTP request logging — captura toda petición, incluidas las bloqueadas por rate limit
 *   4. Rate limit global
 *   5. Body parsers
 *   6. Rutas
 *   7. Error handler (SIEMPRE el último)
 */
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { globalRateLimit } from './middlewares/ratelimit.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { apiRouter } from './routes/index';

export function createApp(): Application {
  const app = express();

  // ── 1. Seguridad HTTP — Helmet ────────────────────────────────────────────
  // Configura: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
  // doc arquitectura tabla 4.5
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      // En desarrollo se desactiva CSP para facilitar debugging
    })
  );

  // ── 2. CORS ───────────────────────────────────────────────────────────────
  // Solo acepta peticiones del origen configurado (nunca '*' en producción)
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true, // necesario para cookies HttpOnly en V2
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── 3. HTTP Request logging ───────────────────────────────────────────────
  // Antes del rate limit para registrar también las peticiones bloqueadas.
  // En modo test el logger tiene level 'silent' — sin output en tests.
  app.use(pinoHttp({ logger }));

  // ── 4. Rate limit global ──────────────────────────────────────────────────
  app.use(globalRateLimit);

  // ── 5. Body parsers ───────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' })); // limitar payload para prevenir DoS
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ── 6. Rutas de la API ────────────────────────────────────────────────────
  app.use('/api/v1', apiRouter);

  // Ruta raíz — redirige a la documentación del health check
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'GymSync API',
      version: '1.0.0',
      docs: '/api/v1/health',
    });
  });

  // ── 7. Error handler global ───────────────────────────────────────────────
  // DEBE ser el último middleware registrado
  app.use(errorMiddleware);

  return app;
}
