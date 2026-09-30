import { prisma } from '../config/prisma';
import { ApiError } from '../types/api-error';
import type {
  MembershipCreateInput,
  MembershipPlanCreateInput,
  MembershipPlanResponse,
  MembershipPlanUpdateInput,
  MembershipRenewInput,
  MembershipResponse,
  PaymentCreateInput,
  PaymentResponse,
} from '@shared/schemas/membership.schemas';
import {
  MembershipPlanResponseSchema,
  MembershipResponseSchema,
  PaymentResponseSchema,
} from '@shared/schemas/membership.schemas';

const PLAN_PUBLIC_SELECT = {
  id: true,
  name: true,
  description: true,
  duration_days: true,
  price: true,
  active: true,
  created_by: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
} as const;

const MEMBERSHIP_PUBLIC_SELECT = {
  id: true,
  member_id: true,
  plan_id: true,
  start_date: true,
  end_date: true,
  status: true,
  price: true,
  created_by: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
} as const;

const PAYMENT_PUBLIC_SELECT = {
  id: true,
  membership_id: true,
  amount: true,
  payment_date: true,
  method: true,
  status: true,
  reference: true,
  notes: true,
  created_by: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
} as const;

function normalizeDeleted(value: Date | null | undefined): boolean {
  return value !== null && value !== undefined;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function parseDate(value: string | Date | undefined, label: string): Date {
  const next = value instanceof Date ? value : new Date(value ?? new Date());

  if (Number.isNaN(next.getTime())) {
    throw ApiError.badRequest(`${label} no válida`);
  }

  return next;
}

export async function listMembershipPlans(): Promise<MembershipPlanResponse[]> {
  const plans = await prisma.membershipPlan.findMany({
    where: { deleted_at: null },
    select: PLAN_PUBLIC_SELECT,
    orderBy: { created_at: 'desc' },
  });

  return plans.map((plan) => MembershipPlanResponseSchema.parse(plan));
}

export async function getMembershipPlan(id: string): Promise<MembershipPlanResponse> {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id },
    select: PLAN_PUBLIC_SELECT,
  });

  if (!plan || normalizeDeleted(plan.deleted_at)) {
    throw ApiError.notFound('Plan de membresía');
  }

  return MembershipPlanResponseSchema.parse(plan);
}

export async function createMembershipPlan(createdBy: string, input: MembershipPlanCreateInput): Promise<MembershipPlanResponse> {
  const plan = await prisma.membershipPlan.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      duration_days: input.duration_days,
      price: input.price,
      active: input.active ?? true,
      created_by: createdBy,
    },
    select: PLAN_PUBLIC_SELECT,
  });

  return MembershipPlanResponseSchema.parse(plan);
}

export async function updateMembershipPlan(id: string, input: MembershipPlanUpdateInput): Promise<MembershipPlanResponse> {
  const existing = await prisma.membershipPlan.findUnique({
    where: { id },
    select: { ...PLAN_PUBLIC_SELECT, id: true },
  });

  if (!existing || normalizeDeleted(existing.deleted_at)) {
    throw ApiError.notFound('Plan de membresía');
  }

  const plan = await prisma.membershipPlan.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.duration_days !== undefined ? { duration_days: input.duration_days } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
    select: PLAN_PUBLIC_SELECT,
  });

  return MembershipPlanResponseSchema.parse(plan);
}

export async function deleteMembershipPlan(id: string): Promise<MembershipPlanResponse> {
  const existing = await prisma.membershipPlan.findUnique({
    where: { id },
    select: { ...PLAN_PUBLIC_SELECT, id: true },
  });

  if (!existing || normalizeDeleted(existing.deleted_at)) {
    throw ApiError.notFound('Plan de membresía');
  }

  const plan = await prisma.membershipPlan.update({
    where: { id },
    data: {
      active: false,
      deleted_at: new Date(),
    },
    select: PLAN_PUBLIC_SELECT,
  });

  return MembershipPlanResponseSchema.parse(plan);
}

export async function listMemberships(): Promise<MembershipResponse[]> {
  const memberships = await prisma.membership.findMany({
    where: { deleted_at: null },
    select: MEMBERSHIP_PUBLIC_SELECT,
    orderBy: { start_date: 'desc' },
  });

  return memberships.map((membership) => MembershipResponseSchema.parse(membership));
}

export async function listMembershipsByMember(memberId: string): Promise<MembershipResponse[]> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, deleted_at: true },
  });

  if (!member || normalizeDeleted(member.deleted_at)) {
    throw ApiError.notFound('Socio');
  }

  const memberships = await prisma.membership.findMany({
    where: { member_id: memberId, deleted_at: null },
    select: MEMBERSHIP_PUBLIC_SELECT,
    orderBy: { start_date: 'desc' },
  });

  return memberships.map((membership) => MembershipResponseSchema.parse(membership));
}

export async function getMembership(id: string): Promise<MembershipResponse> {
  const membership = await prisma.membership.findUnique({
    where: { id },
    select: MEMBERSHIP_PUBLIC_SELECT,
  });

  if (!membership || normalizeDeleted(membership.deleted_at)) {
    throw ApiError.notFound('Membresía');
  }

  return MembershipResponseSchema.parse(membership);
}

export async function createMembership(createdBy: string, input: MembershipCreateInput): Promise<MembershipResponse> {
  const member = await prisma.member.findUnique({
    where: { id: input.member_id },
    select: { id: true, deleted_at: true },
  });

  if (!member || normalizeDeleted(member.deleted_at)) {
    throw ApiError.notFound('Socio');
  }

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: input.plan_id },
    select: { ...PLAN_PUBLIC_SELECT, id: true },
  });

  if (!plan || normalizeDeleted(plan.deleted_at) || !plan.active) {
    throw ApiError.badRequest('El plan seleccionado no está disponible');
  }

  const startDate = parseDate(input.start_date ?? new Date(), 'Fecha de inicio');
  const endDate = addDays(startDate, plan.duration_days);

  const membership = await prisma.membership.create({
    data: {
      member_id: input.member_id,
      plan_id: input.plan_id,
      start_date: startDate,
      end_date: endDate,
      status: 'ACTIVE',
      price: input.price ?? plan.price,
      created_by: createdBy,
    },
    select: MEMBERSHIP_PUBLIC_SELECT,
  });

  return MembershipResponseSchema.parse(membership);
}

export async function renewMembership(createdBy: string, id: string, input: MembershipRenewInput): Promise<MembershipResponse> {
  const current = await prisma.membership.findUnique({
    where: { id },
    select: { ...MEMBERSHIP_PUBLIC_SELECT, id: true },
  });

  if (!current || normalizeDeleted(current.deleted_at)) {
    throw ApiError.notFound('Membresía');
  }

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: input.plan_id },
    select: { ...PLAN_PUBLIC_SELECT, id: true },
  });

  if (!plan || normalizeDeleted(plan.deleted_at) || !plan.active) {
    throw ApiError.badRequest('El plan seleccionado no está disponible');
  }

  const startDate = parseDate(input.start_date ?? current.start_date, 'Fecha de renovación');
  const endDate = addDays(startDate, plan.duration_days);

  const renewed = await prisma.membership.create({
    data: {
      member_id: current.member_id,
      plan_id: input.plan_id,
      start_date: startDate,
      end_date: endDate,
      status: 'ACTIVE',
      price: input.price ?? plan.price,
      created_by: createdBy,
    },
    select: MEMBERSHIP_PUBLIC_SELECT,
  });

  return MembershipResponseSchema.parse(renewed);
}

export async function listMembershipPayments(membershipId: string): Promise<PaymentResponse[]> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, deleted_at: true },
  });

  if (!membership || normalizeDeleted(membership.deleted_at)) {
    throw ApiError.notFound('Membresía');
  }

  const payments = await prisma.payment.findMany({
    where: { membership_id: membershipId, deleted_at: null },
    select: PAYMENT_PUBLIC_SELECT,
    orderBy: { payment_date: 'desc' },
  });

  return payments.map((payment) => PaymentResponseSchema.parse(payment));
}

export async function createPayment(createdBy: string, membershipId: string, input: PaymentCreateInput): Promise<PaymentResponse> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, deleted_at: true },
  });

  if (!membership || normalizeDeleted(membership.deleted_at)) {
    throw ApiError.notFound('Membresía');
  }

  const payment = await prisma.payment.create({
    data: {
      membership_id: membershipId,
      amount: input.amount,
      payment_date: parseDate(input.payment_date ?? new Date(), 'Fecha del pago'),
      method: input.method ?? 'CASH',
      status: input.status ?? 'PAID',
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      created_by: createdBy,
    },
    select: PAYMENT_PUBLIC_SELECT,
  });

  return PaymentResponseSchema.parse(payment);
}

export function canManageMemberships(userRole: 'ADMIN' | 'RECEPCION' | 'ENTRENADOR'): boolean {
  return userRole === 'ADMIN' || userRole === 'RECEPCION';
}

export function canViewMemberships(userRole: 'ADMIN' | 'RECEPCION' | 'ENTRENADOR'): boolean {
  return userRole === 'ADMIN' || userRole === 'RECEPCION' || userRole === 'ENTRENADOR';
}
