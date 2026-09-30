/**
 * backend/src/routes/health.routes.ts
 *
 * Endpoints de health check. Permiten verificar que la API y la base
 * de datos están operativas. Usados por Docker Compose, monitoring
 * y el checklist de despliegue (doc arquitectura sección 10.3).
 *
 * GET /api/v1/health         → estado de la API
 * GET /api/v1/health/db      → estado de la conexión a PostgreSQL
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'gymsync-api',
      version: '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

router.get('/db', async (_req: Request, res: Response) => {
  try {
    // Consulta mínima para verificar conectividad con PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        status: 'ok',
        database: 'postgresql',
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'No se puede conectar con la base de datos',
      },
    });
  }
});

export { router as healthRouter };
