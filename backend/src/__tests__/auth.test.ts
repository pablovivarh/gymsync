import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import type { Request, Response } from 'express';
import { createApp } from '../app';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { requireRole } from '../middlewares/auth.middleware';

vi.mock('../config/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const app = createApp();
const request = supertest(app);

describe('Auth API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('registra un usuario válido con rol por defecto RECEPCION', async () => {
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'recepcion@gymsync.dev',
      password_hash: await bcrypt.hash('Password123!', 12),
      nombre_completo: 'Recepcionista Test',
      telefono: null,
      fecha_nacimiento: null,
      direccion_postal: null,
      role: 'RECEPCION',
      status: 'ACTIVE',
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await request.post('/api/v1/auth/register').send({
      nombre_completo: 'Recepcionista Test',
      email: 'recepcion@gymsync.dev',
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('RECEPCION');
    expect(res.body.data.user.email).toBe('recepcion@gymsync.dev');
  });

  it('rechaza email duplicado con 409', async () => {
    vi.mocked(prisma.user.create).mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['email'] },
    });

    const res = await request.post('/api/v1/auth/register').send({
      nombre_completo: 'Admin Test',
      email: 'admin@gymsync.dev',
      password: 'Password123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
  });

  it('rechaza datos inválidos', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      nombre_completo: 'A',
      email: 'no-email',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza un rol inválido en el registro', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      nombre_completo: 'Recepcionista Test',
      email: 'recepcion@gymsync.dev',
      password: 'Password123!',
      role: 'CLIENT',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('login con credenciales válidas devuelve token y perfil', async () => {
    const hash = await bcrypt.hash('Password123!', 12);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000002',
      email: 'admin@gymsync.dev',
      password_hash: hash,
      nombre_completo: 'Admin GymSync',
      role: 'ADMIN',
      status: 'ACTIVE',
      deleted_at: null,
    });

    const res = await request.post('/api/v1/auth/login').send({
      email: 'admin@gymsync.dev',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('login con password incorrecta devuelve 401', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000003',
      email: 'admin@gymsync.dev',
      password_hash: await bcrypt.hash('CorrectPassword123!', 12),
      nombre_completo: 'Admin GymSync',
      role: 'ADMIN',
      status: 'ACTIVE',
      deleted_at: null,
    });

    const res = await request.post('/api/v1/auth/login').send({
      email: 'admin@gymsync.dev',
      password: 'WrongPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('login con usuario inexistente devuelve 401', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const res = await request.post('/api/v1/auth/login').send({
      email: 'noexiste@gymsync.dev',
      password: 'Password123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('login con usuario desactivado o eliminado devuelve 401', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000004',
      email: 'del@gymsync.dev',
      password_hash: await bcrypt.hash('Password123!', 12),
      nombre_completo: 'Eliminado',
      role: 'RECEPCION',
      status: 'INACTIVE',
      deleted_at: null,
    });

    const res = await request.post('/api/v1/auth/login').send({
      email: 'del@gymsync.dev',
      password: 'Password123!',
    });

    expect(res.status).toBe(401);
  });

  it('GET /me devuelve el usuario autenticado con token válido', async () => {
    const token = jwt.sign(
      { sub: '00000000-0000-0000-0000-000000000005', email: 'admin@gymsync.dev', role: 'ADMIN' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
    ) as string;

    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000005',
        email: 'admin@gymsync.dev',
        role: 'ADMIN',
        status: 'ACTIVE',
        deleted_at: null,
      })
      .mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000005',
        email: 'admin@gymsync.dev',
        nombre_completo: 'Admin GymSync',
        telefono: null,
        fecha_nacimiento: null,
        direccion_postal: null,
        role: 'ADMIN',
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

    const res = await request.get('/api/v1/auth/me').set('Authorization', 'Bearer ' + token);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('admin@gymsync.dev');
  });

  it('GET /me sin token devuelve 401', async () => {
    const res = await request.get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /me con token inválido devuelve 401', async () => {
    const res = await request.get('/api/v1/auth/me').set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /me con token expirado devuelve 401', async () => {
    const expiredToken = jwt.sign(
      { sub: '00000000-0000-0000-0000-000000000006', email: 'admin@gymsync.dev', role: 'ADMIN' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' }
    );

    const res = await request.get('/api/v1/auth/me').set('Authorization', 'Bearer ' + expiredToken);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('requireRole rechaza acceso sin permiso', () => {
    const req = { user: { role: 'RECEPCION' } } as unknown as Request & {
      user: { role: 'ADMIN' | 'RECEPCION' };
    };
    const res = {} as Response;
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('requireRole permite roles autorizados', () => {
    const req = { user: { role: 'ADMIN' } } as unknown as Request & {
      user: { role: 'ADMIN' | 'RECEPCION' };
    };
    const res = {} as Response;
    const next = vi.fn();

    requireRole('ADMIN', 'RECEPCION')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
