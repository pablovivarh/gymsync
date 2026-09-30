/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-call */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { createApp } from '../app';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

vi.mock('../config/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const app = createApp();
const request = supertest(app);

const adminId = '11111111-1111-1111-1111-111111111111';
const recepcionId = '22222222-2222-2222-2222-222222222222';
const entrenadorId = '33333333-3333-3333-3333-333333333333';

const adminUser = {
  id: adminId,
  email: 'admin@gymsync.dev',
  password_hash: 'hash',
  nombre_completo: 'Admin GymSync',
  telefono: null,
  fecha_nacimiento: null,
  direccion_postal: null,
  role: 'ADMIN',
  status: 'ACTIVE',
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const recepcionUser = {
  id: recepcionId,
  email: 'recepcion@gymsync.dev',
  password_hash: 'hash',
  nombre_completo: 'Recepcionista',
  telefono: null,
  fecha_nacimiento: null,
  direccion_postal: null,
  role: 'RECEPCION',
  status: 'ACTIVE',
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const entrenadorUser = {
  id: entrenadorId,
  email: 'entrenador@gymsync.dev',
  password_hash: 'hash',
  nombre_completo: 'Entrenador',
  telefono: null,
  fecha_nacimiento: null,
  direccion_postal: null,
  role: 'ENTRENADOR',
  status: 'ACTIVE',
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const adminToken = jwt.sign(
  { sub: adminId, email: 'admin@gymsync.dev', role: 'ADMIN' },
  env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
);

const recepcionToken = jwt.sign(
  { sub: recepcionId, email: 'recepcion@gymsync.dev', role: 'RECEPCION' },
  env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
);

const entrenadorToken = jwt.sign(
  { sub: entrenadorId, email: 'entrenador@gymsync.dev', role: 'ENTRENADOR' },
  env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
);

describe('Employees API', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockImplementation(async ({ where }: { where: { id: string } }) => {
      const userMap = {
        [adminId]: adminUser,
        [recepcionId]: recepcionUser,
        [entrenadorId]: entrenadorUser,
      };

      return userMap[where.id as keyof typeof userMap] ?? null;
    });
    vi.mocked(prisma.user.create).mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: '44444444-4444-4444-4444-444444444444',
      email: String(data.email),
      password_hash: 'hashed_password',
      nombre_completo: String(data.nombre_completo),
      telefono: data.telefono ? String(data.telefono) : null,
      fecha_nacimiento: data.fecha_nacimiento ? new Date(String(data.fecha_nacimiento)) : null,
      direccion_postal: data.direccion_postal ? String(data.direccion_postal) : null,
      role: (data.role as 'ADMIN' | 'RECEPCION' | 'ENTRENADOR') ?? 'RECEPCION',
      status: (data.status as 'ACTIVE' | 'INACTIVE' | 'DELETED') ?? 'ACTIVE',
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    }));
    vi.mocked(prisma.user.update).mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const current = {
        ...(where.id === adminId ? adminUser : { ...recepcionUser, id: where.id }),
      };

      return {
        ...current,
        ...data,
        updated_at: new Date(),
      };
    });
  });

  it('lista empleados del staff', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{
      id: adminId,
      nombre_completo: 'Admin GymSync',
      email: 'admin@gymsync.dev',
      telefono: null,
      fecha_nacimiento: null,
      direccion_postal: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    }]);

    const res = await request.get('/api/v1/employees').set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.employees)).toBe(true);
  });

  it('obtiene un empleado por id', async () => {
    const employeeId = '77777777-7777-7777-7777-777777777777';
    vi.mocked(prisma.user.findUnique).mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === adminId) return adminUser;
      if (where.id === employeeId) {
        return {
          id: employeeId,
          nombre_completo: 'Recepcionista Test',
          email: 'recepcion@gymsync.dev',
          telefono: null,
          fecha_nacimiento: null,
          direccion_postal: null,
          role: 'RECEPCION',
          status: 'ACTIVE',
          deleted_at: null,
          password_hash: 'hash',
          created_at: new Date(),
          updated_at: new Date(),
        };
      }
      return null;
    });

    const res = await request
      .get(`/api/v1/employees/${employeeId}`)
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.employee.email).toBe('recepcion@gymsync.dev');
  });

  it('crea un empleado con rol y contraseña validados', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      nombre_completo: 'Entrenador Test',
      email: 'entrenador@gymsync.dev',
      telefono: null,
      fecha_nacimiento: null,
      direccion_postal: null,
      role: 'ENTRENADOR',
      status: 'ACTIVE',
      deleted_at: null,
      password_hash: 'hashed_password',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await request
      .post('/api/v1/employees')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        nombre_completo: 'Entrenador Test',
        email: 'entrenador@gymsync.dev',
        password: 'Password123!',
        role: 'ENTRENADOR',
        status: 'ACTIVE',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.employee.role).toBe('ENTRENADOR');
  });

  it('edita un empleado existente', async () => {
    const employeeId = '55555555-5555-5555-5555-555555555555';
    vi.mocked(prisma.user.findUnique).mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === adminId) return adminUser;
      if (where.id === employeeId) {
        return {
          id: employeeId,
          email: 'old@gymsync.dev',
          password_hash: 'hash',
          nombre_completo: 'Old Employee',
          telefono: null,
          fecha_nacimiento: null,
          direccion_postal: null,
          role: 'RECEPCION',
          status: 'ACTIVE',
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
      }
      return null;
    });

    vi.mocked(prisma.user.update).mockResolvedValue({
      id: employeeId,
      nombre_completo: 'Recepcionista Modificado',
      email: 'new@gymsync.dev',
      telefono: null,
      fecha_nacimiento: null,
      direccion_postal: null,
      role: 'RECEPCION',
      status: 'ACTIVE',
      deleted_at: null,
      password_hash: 'hash',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await request
      .patch(`/api/v1/employees/${employeeId}`)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        nombre_completo: 'Recepcionista Modificado',
        email: 'new@gymsync.dev',
        role: 'RECEPCION',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.employee.email).toBe('new@gymsync.dev');
  });

  it('desactiva un empleado sin borrarlo físicamente', async () => {
    const employeeId = '66666666-6666-6666-6666-666666666666';
    vi.mocked(prisma.user.findUnique).mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === adminId) return adminUser;
      if (where.id === employeeId) {
        return {
          id: employeeId,
          email: 'inactive@gymsync.dev',
          password_hash: 'hash',
          nombre_completo: 'Empleado',
          telefono: null,
          fecha_nacimiento: null,
          direccion_postal: null,
          role: 'ENTRENADOR',
          status: 'ACTIVE',
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
      }
      return null;
    });

    vi.mocked(prisma.user.update).mockResolvedValue({
      id: employeeId,
      nombre_completo: 'Empleado Inactivo',
      email: 'inactive@gymsync.dev',
      telefono: null,
      fecha_nacimiento: null,
      direccion_postal: null,
      role: 'ENTRENADOR',
      status: 'INACTIVE',
      deleted_at: null,
      password_hash: 'hash',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await request
      .patch(`/api/v1/employees/${employeeId}/status`)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.data.employee.status).toBe('INACTIVE');
  });

  it('rechaza creación con validación inválida', async () => {
    const res = await request
      .post('/api/v1/employees')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        nombre_completo: 'A',
        email: 'no-email',
        password: 'short',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requiere ADMIN para listar empleados', async () => {
    const res = await request.get('/api/v1/employees').set('Authorization', 'Bearer ' + recepcionToken);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rechaza acceso de ENTRENADOR a empleados', async () => {
    const res = await request.get('/api/v1/employees').set('Authorization', 'Bearer ' + entrenadorToken);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rechaza email duplicado en creación', async () => {
    vi.mocked(prisma.user.create).mockRejectedValue({
      code: 'P2002',
      meta: { target: ['email'] },
    });

    const res = await request
      .post('/api/v1/employees')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        nombre_completo: 'Nuevo Admin',
        email: 'admin@gymsync.dev',
        password: 'Password123!',
        role: 'ADMIN',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
  });
});
