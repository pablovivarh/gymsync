/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
    },
    membershipPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
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
const memberId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const planId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const membershipId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const adminToken = String(
  jwt.sign({ sub: adminId, email: 'admin@gymsync.dev', role: 'ADMIN' }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  })
);

describe('Membership domain API', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(prisma.user.findUnique).mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === adminId) {
        return Promise.resolve({
          id: adminId,
          email: 'admin@gymsync.dev',
          role: 'ADMIN',
          status: 'ACTIVE',
          deleted_at: null,
        });
      }

      return Promise.resolve(null);
    });

    vi.mocked(prisma.member.findMany).mockResolvedValue([]);
    vi.mocked(prisma.member.findUnique).mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === memberId) {
        return Promise.resolve({
          id: memberId,
          full_name: 'Ana López',
          phone: '+34111222333',
          email: 'ana@club.dev',
          document_id: '11111111A',
          status: 'ACTIVE',
          deleted_at: null,
          joined_at: new Date('2025-01-01'),
          created_by: adminId,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      return Promise.resolve(null);
    });

    vi.mocked(prisma.membershipPlan.findMany).mockResolvedValue([]);
    vi.mocked(prisma.membershipPlan.findUnique).mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === planId) {
        return Promise.resolve({
          id: planId,
          name: 'Mensual',
          description: 'Plan mensual',
          duration_days: 30,
          price: 49,
          active: true,
          created_by: adminId,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        });
      }

      return Promise.resolve(null);
    });

    vi.mocked(prisma.membershipPlan.create).mockResolvedValue({
      id: planId,
      name: 'Mensual',
      description: 'Plan mensual',
      duration_days: 30,
      price: 49,
      active: true,
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    vi.mocked(prisma.membershipPlan.update).mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
      Promise.resolve({
        id: where.id,
        name: String(data.name ?? 'Mensual'),
        description: data.description ? String(data.description) : 'Plan mensual',
        duration_days: Number(data.duration_days ?? 30),
        price: Number(data.price ?? 49),
        active: Boolean(data.active ?? true),
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: data.deleted_at ? new Date(String(data.deleted_at)) : null,
      })
    );

    vi.mocked(prisma.membership.findMany).mockResolvedValue([]);
    vi.mocked(prisma.membership.findUnique).mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === membershipId) {
        return Promise.resolve({
          id: membershipId,
          member_id: memberId,
          plan_id: planId,
          start_date: new Date('2025-01-01'),
          end_date: new Date('2025-01-31'),
          status: 'ACTIVE',
          price: 49,
          created_by: adminId,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        });
      }

      return Promise.resolve(null);
    });

    vi.mocked(prisma.membership.create).mockResolvedValue({
      id: membershipId,
      member_id: memberId,
      plan_id: planId,
      start_date: new Date('2025-02-01'),
      end_date: new Date('2025-03-03'),
      status: 'ACTIVE',
      price: 49,
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    vi.mocked(prisma.membership.update).mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
      Promise.resolve({
        id: where.id,
        member_id: memberId,
        plan_id: planId,
        start_date: data.start_date ? new Date(String(data.start_date)) : new Date('2025-02-01'),
        end_date: data.end_date ? new Date(String(data.end_date)) : new Date('2025-03-03'),
        status: (data.status as 'ACTIVE' | 'EXPIRED' | 'CANCELLED') ?? 'ACTIVE',
        price: Number(data.price ?? 49),
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: data.deleted_at ? new Date(String(data.deleted_at)) : null,
      })
    );

    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.payment.create).mockResolvedValue({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      membership_id: membershipId,
      amount: 49,
      payment_date: new Date('2025-02-03'),
      method: 'CARD',
      status: 'PAID',
      reference: 'REF-001',
      notes: 'Pago del mes',
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });
    vi.mocked(prisma.payment.update).mockResolvedValue({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      membership_id: membershipId,
      amount: 49,
      payment_date: new Date('2025-02-03'),
      method: 'CARD',
      status: 'CANCELLED',
      reference: 'REF-001',
      notes: 'Pago cancelado',
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });
  });

  it('crea un plan de membresía', async () => {
    const res = await request
      .post('/api/v1/membership-plans')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        name: 'Mensual',
        description: 'Plan mensual',
        duration_days: 30,
        price: 49,
        active: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan.name).toBe('Mensual');
  });

  it('lista todas las membresías del sistema', async () => {
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      {
        id: membershipId,
        member_id: memberId,
        plan_id: planId,
        start_date: new Date('2025-02-01'),
        end_date: new Date('2025-03-03'),
        status: 'ACTIVE',
        price: 49,
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const res = await request
      .get('/api/v1/memberships')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.memberships)).toBe(true);
  });

  it('lista membresías para un socio', async () => {
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      {
        id: membershipId,
        member_id: memberId,
        plan_id: planId,
        start_date: new Date('2025-02-01'),
        end_date: new Date('2025-03-03'),
        status: 'ACTIVE',
        price: 49,
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const res = await request
      .get(`/api/v1/members/${memberId}/memberships`)
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.memberships)).toBe(true);
  });

  it('crea una membresía asociada a un socio con plan activo', async () => {
    const res = await request
      .post('/api/v1/memberships')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        member_id: memberId,
        plan_id: planId,
        start_date: '2025-02-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.membership.member_id).toBe(memberId);
  });

  it('renueva una membresía sin sobrescribir el historial', async () => {
    const res = await request
      .post(`/api/v1/memberships/${membershipId}/renew`)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        plan_id: planId,
        start_date: '2025-02-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.membership.member_id).toBe(memberId);
  });

  it('registra un pago en una membresía', async () => {
    const res = await request
      .post(`/api/v1/memberships/${membershipId}/payments`)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        amount: 49,
        payment_date: '2025-02-03',
        method: 'CARD',
        status: 'PAID',
        reference: 'REF-001',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.payment.amount).toBe(49);
  });

  it('genera un resumen operativo con alertas y tareas accionables', async () => {
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      {
        id: membershipId,
        member_id: memberId,
        plan_id: planId,
        start_date: new Date('2025-01-01'),
        end_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        status: 'EXPIRED',
        price: 49,
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        member_id: memberId,
        plan_id: planId,
        start_date: new Date('2025-02-01'),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        status: 'ACTIVE',
        price: 49,
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'ffffffffff-ffff-ffff-ffff-ffffffffffff',
        membership_id: membershipId,
        amount: 49,
        payment_date: new Date(),
        method: 'CARD',
        status: 'PAID',
        reference: 'REF-001',
        notes: 'Pago hoy',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const res = await request
      .get('/api/v1/dashboard/operational')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totals.totalRevenue).toBe(49);
    expect(res.body.data.summary.alerts.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.summary.tasks)).toBe(true);
    expect(res.body.data.summary.tasks[0].priority).toBeDefined();
  });

  it('no incrementa ingresos al crear un plan', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'existing-paid-payment',
        membership_id: membershipId,
        amount: 49,
        payment_date: new Date('2025-02-03'),
        method: 'CARD',
        status: 'PAID',
        reference: 'EXISTING-001',
        notes: 'Pago existente',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const before = await request
      .get('/api/v1/dashboard/operational')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(before.body.data.summary.totals.totalRevenue).toBe(49);

    await request
      .post('/api/v1/membership-plans')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        name: 'Nuevo plan de prueba',
        description: 'No debe afectar ingresos',
        duration_days: 60,
        price: 79,
        active: true,
      });

    const after = await request
      .get('/api/v1/dashboard/operational')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(after.status).toBe(200);
    expect(after.body.data.summary.totals.totalRevenue).toBe(49);
  });

  it('no incrementa ingresos al crear una membresía', async () => {
    vi.mocked(prisma.membership.create).mockResolvedValue({
      id: 'new-membership-id',
      member_id: memberId,
      plan_id: planId,
      start_date: new Date('2025-02-10'),
      end_date: new Date('2025-03-12'),
      status: 'ACTIVE',
      price: 49,
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'existing-paid-payment',
        membership_id: membershipId,
        amount: 49,
        payment_date: new Date('2025-02-03'),
        method: 'CARD',
        status: 'PAID',
        reference: 'EXISTING-001',
        notes: 'Pago existente',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const before = await request
      .get('/api/v1/dashboard/operational')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(before.body.data.summary.totals.totalRevenue).toBe(49);

    await request
      .post('/api/v1/memberships')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        member_id: memberId,
        plan_id: planId,
        start_date: '2025-02-10',
      });

    const after = await request
      .get('/api/v1/dashboard/operational')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(after.status).toBe(200);
    expect(after.body.data.summary.totals.totalRevenue).toBe(49);
  });

  it('incrementa ingresos cuando un pago se registra como PAID', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);

    const before = await request
      .get('/api/v1/dashboard/operational')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(before.body.data.summary.totals.totalRevenue).toBe(0);

    vi.mocked(prisma.payment.create).mockResolvedValue({
      id: 'paid-payment-id',
      membership_id: membershipId,
      amount: 49,
      payment_date: new Date('2025-02-04'),
      method: 'CARD',
      status: 'PAID',
      reference: 'PAID-001',
      notes: 'Pago realizado',
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    await request
      .post(`/api/v1/memberships/${membershipId}/payments`)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        amount: 49,
        payment_date: '2025-02-04',
        method: 'CARD',
        status: 'PAID',
        reference: 'PAID-001',
      });

    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'paid-payment-id',
        membership_id: membershipId,
        amount: 49,
        payment_date: new Date('2025-02-04'),
        method: 'CARD',
        status: 'PAID',
        reference: 'PAID-001',
        notes: 'Pago realizado',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const after = await request
      .get('/api/v1/dashboard/operational')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(after.status).toBe(200);
    expect(after.body.data.summary.totals.totalRevenue).toBe(49);
  });

  it('no contabiliza pagos PENDING en el total de ingresos', async () => {
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      {
        id: membershipId,
        member_id: memberId,
        plan_id: planId,
        start_date: new Date('2025-01-01'),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
        status: 'ACTIVE',
        price: 49,
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: '12345678-1234-1234-1234-123456789012',
        membership_id: membershipId,
        amount: 49,
        payment_date: new Date(),
        method: 'CARD',
        status: 'PENDING',
        reference: 'PENDING-001',
        notes: 'Pendiente de cobro',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const res = await request
      .get('/api/v1/dashboard/operational')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.totals.totalRevenue).toBe(0);
  });

  it('no contabiliza pagos CANCELLED en el total de ingresos', async () => {
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      {
        id: membershipId,
        member_id: memberId,
        plan_id: planId,
        start_date: new Date('2025-01-01'),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
        status: 'ACTIVE',
        price: 49,
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: 'cancelled-payment-id',
        membership_id: membershipId,
        amount: 49,
        payment_date: new Date(),
        method: 'CARD',
        status: 'CANCELLED',
        reference: 'CANCELLED-001',
        notes: 'Cobro cancelado',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    const res = await request
      .get('/api/v1/dashboard/operational')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.totals.totalRevenue).toBe(0);
  });
});
