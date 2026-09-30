import type { Request, Response } from 'express';
import { ApiError } from '../types/api-error';
import {
  createMembership,
  createMembershipPlan,
  createPayment,
  deleteMembershipPlan,
  getMembership,
  getMembershipPlan,
  listMembershipPayments,
  listMembershipPlans,
  listMemberships,
  listMembershipsByMember,
  renewMembership,
  updateMembershipPlan,
} from '../services/membership.service';
import type {
  MembershipCreateInput,
  MembershipPlanCreateInput,
  MembershipPlanUpdateInput,
  MembershipRenewInput,
  PaymentCreateInput,
} from '@shared/schemas/membership.schemas';

export async function listMembershipPlansHandler(_req: Request, res: Response): Promise<void> {
  const plans = await listMembershipPlans();

  res.json({
    success: true,
    data: { plans },
  });
}

export async function getMembershipPlanHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const plan = await getMembershipPlan(id);

  res.json({
    success: true,
    data: { plan },
  });
}

export async function createMembershipPlanHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as MembershipPlanCreateInput;
  const userId = req.user?.id;

  if (!userId) {
    throw ApiError.unauthorized('No autenticado');
  }

  const plan = await createMembershipPlan(userId, input);

  res.status(201).json({
    success: true,
    data: { plan },
  });
}

export async function updateMembershipPlanHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const input = req.body as MembershipPlanUpdateInput;

  if (Object.keys(input).length === 0) {
    throw ApiError.badRequest('No hay campos para actualizar');
  }

  const plan = await updateMembershipPlan(id, input);

  res.json({
    success: true,
    data: { plan },
  });
}

export async function deleteMembershipPlanHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const plan = await deleteMembershipPlan(id);

  res.json({
    success: true,
    data: { plan },
  });
}

export async function listMembershipsHandler(_req: Request, res: Response): Promise<void> {
  const memberships = await listMemberships();

  res.json({
    success: true,
    data: { memberships },
  });
}

export async function listMemberMembershipsHandler(req: Request, res: Response): Promise<void> {
  const memberId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const memberships = await listMembershipsByMember(memberId);

  res.json({
    success: true,
    data: { memberships },
  });
}

export async function getMembershipHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const membership = await getMembership(id);

  res.json({
    success: true,
    data: { membership },
  });
}

export async function createMembershipHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as MembershipCreateInput;
  const userId = req.user?.id;

  if (!userId) {
    throw ApiError.unauthorized('No autenticado');
  }

  const membership = await createMembership(userId, input);

  res.status(201).json({
    success: true,
    data: { membership },
  });
}

export async function renewMembershipHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const input = req.body as MembershipRenewInput;
  const userId = req.user?.id;

  if (!userId) {
    throw ApiError.unauthorized('No autenticado');
  }

  const membership = await renewMembership(userId, id, input);

  res.status(201).json({
    success: true,
    data: { membership },
  });
}

export async function listMembershipPaymentsHandler(req: Request, res: Response): Promise<void> {
  const membershipId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const payments = await listMembershipPayments(membershipId);

  res.json({
    success: true,
    data: { payments },
  });
}

export async function createPaymentHandler(req: Request, res: Response): Promise<void> {
  const membershipId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const input = req.body as PaymentCreateInput;
  const userId = req.user?.id;

  if (!userId) {
    throw ApiError.unauthorized('No autenticado');
  }

  const payment = await createPayment(userId, membershipId, input);

  res.status(201).json({
    success: true,
    data: { payment },
  });
}
