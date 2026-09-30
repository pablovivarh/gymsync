/**
 * backend/src/__tests__/health.test.ts
 *
 * Tests de integración para los endpoints de health check.
 * Usa supertest para hacer peticiones HTTP reales contra la app Express
 * sin levantar el servidor HTTP (no se llama a server.listen()).
 *
 * Prisma se mockea completamente: los tests no requieren BD.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';

// ── Mock de Prisma ────────────────────────────────────────────────────────────
// Evita cualquier intento de conectar a la base de datos durante los tests.
vi.mock('../config/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));


const app = createApp();
const request = supertest(app);

// ── GET /api/v1/health ────────────────────────────────────────────────────────

describe('GET /api/v1/health', () => {
  it('responde 200 con el estado de la API', async () => {
    const res = await request.get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('gymsync-api');
    expect(res.body.data.environment).toBe('test');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('version');
  });
});

// ── GET /api/v1/health/db ─────────────────────────────────────────────────────

describe('GET /api/v1/health/db', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde 200 cuando la BD está disponible', async () => {
    const { prisma } = await import('../config/prisma');
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }]);

    const res = await request.get('/api/v1/health/db');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('postgresql');
  });

  it('responde 503 cuando la BD no está disponible', async () => {
    const { prisma } = await import('../config/prisma');
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request.get('/api/v1/health/db');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DB_UNAVAILABLE');
    expect(res.body.error).toHaveProperty('message');
  });
});

// ── Rutas no registradas ──────────────────────────────────────────────────────

describe('Rutas no registradas', () => {
  it('responde 404 para endpoints desconocidos dentro de /api/v1', async () => {
    const res = await request.get('/api/v1/ruta-que-no-existe');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('responde 404 desde el router raíz para rutas fuera de /api/v1', async () => {
    const res = await request.get('/ruta-completamente-desconocida');

    expect(res.status).toBe(404);
  });
});

// ── Cabeceras de seguridad (Helmet) ───────────────────────────────────────────

describe('Cabeceras de seguridad', () => {
  it('incluye X-Content-Type-Options: nosniff', async () => {
    const res = await request.get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('incluye X-Frame-Options', async () => {
    const res = await request.get('/api/v1/health');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});
