import type { Request, Response } from 'express';
import { ApiError } from '../types/api-error';
import {
  createMember,
  deleteMember,
  getMember,
  listMembers,
  updateMember,
  updateMemberStatus,
} from '../services/members.service';
import type {
  MemberCreateInput,
  MemberQuery,
  MemberStatusInput,
  MemberUpdateInput,
} from '@shared/schemas/member.schemas';

export async function listMembersHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as Partial<MemberQuery>;
  const members = await listMembers(query);

  res.json({
    success: true,
    data: { members },
  });
}

export async function getMemberHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const member = await getMember(id);

  res.json({
    success: true,
    data: { member },
  });
}

export async function createMemberHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as MemberCreateInput;
  const userId = req.user?.id;

  if (!userId) {
    throw ApiError.unauthorized('No autenticado');
  }

  const member = await createMember(userId, input);

  res.status(201).json({
    success: true,
    data: { member },
  });
}

export async function updateMemberHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const input = req.body as MemberUpdateInput;

  if (Object.keys(input).length === 0) {
    throw ApiError.badRequest('No hay campos para actualizar');
  }

  const member = await updateMember(id, input);

  res.json({
    success: true,
    data: { member },
  });
}

export async function updateMemberStatusHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const input = req.body as MemberStatusInput;

  const member = await updateMemberStatus(id, input.status);

  res.json({
    success: true,
    data: { member },
  });
}

export async function deleteMemberHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const member = await deleteMember(id);

  res.json({
    success: true,
    data: { member },
  });
}
