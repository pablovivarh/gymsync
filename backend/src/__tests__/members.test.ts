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
      findUnique: vi.fn(),
    },
    member: {
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

const adminToken = jwt.sign({ sub: adminId, email: 'admin@gymsync.dev', role: 'ADMIN' }, env.JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: env.JWT_EXPIRES_IN,
});

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

describe('Members API', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(prisma.user.findUnique).mockImplementation(async ({ where }: { where: { id: string } }) => {
      const userMap = {
        [adminId]: adminUser,
        [recepcionId]: recepcionUser,
        [entrenadorId]: entrenadorUser,
      };

      return userMap[where.id as keyof typeof userMap] ?? null;
    });

    vi.mocked(prisma.member.findMany).mockResolvedValue([]);
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.member.create).mockResolvedValue({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      full_name: 'Ana López',
      phone: '+34111222333',
      email: 'ana@gymsync.dev',
      document_id: '12345678A',
      birth_date: null,
      address: 'Calle Principal 1',
      notes: 'Cliente nuevo',
      status: 'ACTIVE',
      joined_at: new Date('2026-01-10'),
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });
    vi.mocked(prisma.member.update).mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      full_name: String(data.full_name ?? 'Ana López'),
      phone: String(data.phone ?? '+34111222333'),
      email: data.email ? String(data.email) : 'ana@gymsync.dev',
      document_id: data.document_id ? String(data.document_id) : '12345678A',
      birth_date: data.birth_date ? new Date(String(data.birth_date)) : null,
      address: data.address ? String(data.address) : 'Calle Principal 1',
      notes: data.notes ? String(data.notes) : 'Cliente nuevo',
      status: (data.status as 'ACTIVE' | 'INACTIVE') ?? 'ACTIVE',
      joined_at: new Date('2026-01-10'),
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: data.deleted_at ? new Date(String(data.deleted_at)) : null,
    }));
  });

  it('lista miembros del club para ADMIN', async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        full_name: 'Ana López',
        phone: '+34111222333',
        email: 'ana@gymsync.dev',
        document_id: '12345678A',
        birth_date: null,
        address: 'Calle Principal 1',
        notes: 'Cliente nuevo',
        status: 'ACTIVE',
        joined_at: new Date('2026-01-10'),
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const res = await request.get('/api/v1/members').set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.members)).toBe(true);
  });

  it('obtiene un miembro por id', async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      full_name: 'Ana López',
      phone: '+34111222333',
      email: 'ana@gymsync.dev',
      document_id: '12345678A',
      birth_date: null,
      address: 'Calle Principal 1',
      notes: 'Cliente nuevo',
      status: 'ACTIVE',
      joined_at: new Date('2026-01-10'),
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    const res = await request
      .get('/api/v1/members/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.member.full_name).toBe('Ana López');
  });

  it('crea un miembro con user autenticado como created_by', async () => {
    vi.mocked(prisma.member.create).mockResolvedValue({
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      full_name: 'Carlos Ruiz',
      phone: '+34123456789',
      email: 'carlos@club.dev',
      document_id: '87654321Z',
      birth_date: null,
      address: 'Avenida del Parque 8',
      notes: 'Interesado',
      status: 'ACTIVE',
      joined_at: new Date('2026-02-01'),
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    const res = await request
      .post('/api/v1/members')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        full_name: 'Carlos Ruiz',
        phone: '+34123456789',
        email: 'carlos@club.dev',
        document_id: '87654321Z',
        address: 'Avenida del Parque 8',
        notes: 'Interesado',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.member.created_by).toBe(adminId);
  });

  it('actualiza un miembro existente', async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      full_name: 'Ana López',
      phone: '+34111222333',
      email: 'ana@gymsync.dev',
      document_id: '12345678A',
      birth_date: null,
      address: 'Calle Principal 1',
      notes: 'Cliente nuevo',
      status: 'ACTIVE',
      joined_at: new Date('2026-01-10'),
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    const res = await request
      .patch('/api/v1/members/dddddddd-dddd-dddd-dddd-dddddddddddd')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        full_name: 'Ana López García',
        address: 'Calle Principal 10',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.member.full_name).toBe('Ana López García');
  });

  it('cambia el estado de un socio', async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      full_name: 'Luis Mena',
      phone: '+34999888777',
      email: 'luis@club.dev',
      document_id: '44556677K',
      birth_date: null,
      address: null,
      notes: null,
      status: 'ACTIVE',
      joined_at: new Date('2026-03-12'),
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    const res = await request
      .patch('/api/v1/members/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/status')
      .set('Authorization', 'Bearer ' + recepcionToken)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.data.member.status).toBe('INACTIVE');
  });

  it('realiza soft delete en DELETE /members/:id', async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      full_name: 'Elena Vega',
      phone: '+34112233445',
      email: 'elena@club.dev',
      document_id: '55667788P',
      birth_date: null,
      address: null,
      notes: null,
      status: 'ACTIVE',
      joined_at: new Date('2026-04-01'),
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    const res = await request
      .delete('/api/v1/members/ffffffff-ffff-ffff-ffff-ffffffffffff')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.member.deleted_at).toBeTruthy();
  });

  it('filtra y busca miembros', async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        full_name: 'Ana López',
        phone: '+34111222333',
        email: 'ana@gymsync.dev',
        document_id: '12345678A',
        birth_date: null,
        address: 'Calle Principal 1',
        notes: 'Cliente nuevo',
        status: 'ACTIVE',
        joined_at: new Date('2026-01-10'),
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const res = await request
      .get('/api/v1/members?search=Ana&status=ACTIVE&limit=20&page=1')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.members[0].full_name).toContain('Ana');
  });

  it('rechaza duplicados de email o document_id', async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      full_name: 'Ana López',
      phone: '+34111222333',
      email: 'ana@gymsync.dev',
      document_id: '12345678A',
      birth_date: null,
      address: 'Calle Principal 1',
      notes: 'Cliente nuevo',
      status: 'ACTIVE',
      joined_at: new Date('2026-01-10'),
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    const res = await request
      .post('/api/v1/members')
      .set('Authorization', 'Bearer ' + recepcionToken)
      .send({
        full_name: 'Ana López Duplicada',
        phone: '+34111222334',
        email: 'ana@gymsync.dev',
        document_id: '12345678A',
      });

    expect(res.status).toBe(409);
  });

  it('ENTRENADOR puede leer pero no crear', async () => {
    const listRes = await request.get('/api/v1/members').set('Authorization', 'Bearer ' + entrenadorToken);
    expect(listRes.status).toBe(200);

    const createRes = await request
      .post('/api/v1/members')
      .set('Authorization', 'Bearer ' + entrenadorToken)
      .send({
        full_name: 'No Permitido',
        phone: '+34123456789',
      });

    expect(createRes.status).toBe(403);
  });

  it('requiere autenticación', async () => {
    const res = await request.get('/api/v1/members');
    expect(res.status).toBe(401);
  });

  it('excluye socio eliminado del listado por defecto', async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      {
        id: '33333333-3333-3333-3333-333333333333',
        full_name: 'Socio activo',
        phone: '+34111111111',
        email: 'activo@club.dev',
        document_id: '11111111M',
        birth_date: null,
        address: null,
        notes: null,
        status: 'ACTIVE',
        joined_at: new Date('2026-05-01'),
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const res = await request.get('/api/v1/members').set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.members.every((member: { deleted_at: Date | null }) => member.deleted_at === null)).toBe(true);
  });
});
