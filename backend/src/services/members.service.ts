import type { Prisma, MemberStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../types/api-error';
import { MemberResponseSchema } from '@shared/schemas/member.schemas';
import type {
  MemberCreateInput,
  MemberQuery,
  MemberResponse,
  MemberUpdateInput,
} from '@shared/schemas/member.schemas';

const MEMBER_PUBLIC_SELECT = {
  id: true,
  full_name: true,
  phone: true,
  email: true,
  document_id: true,
  birth_date: true,
  address: true,
  notes: true,
  status: true,
  joined_at: true,
  created_by: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
} as const;

function normalizeDeleted(value: Date | null | undefined): boolean {
  return value !== null && value !== undefined;
}

async function ensureUniqueMemberFields(
  input: { email?: string | null; document_id?: string | null },
  excludeId?: string
): Promise<void> {
  if (input.email) {
    const existing = await prisma.member.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing && existing.id !== excludeId) {
      throw ApiError.conflict('Ya existe un socio con ese email');
    }
  }

  if (input.document_id) {
    const existing = await prisma.member.findUnique({
      where: { document_id: input.document_id },
      select: { id: true },
    });

    if (existing && existing.id !== excludeId) {
      throw ApiError.conflict('Ya existe un socio con ese documento');
    }
  }
}

export async function listMembers(query: Partial<MemberQuery> = {}): Promise<MemberResponse[]> {
  const where: Prisma.MemberWhereInput = {
    deleted_at: null,
    ...(query.search
      ? {
          OR: [
            { full_name: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const members = await prisma.member.findMany({
    where,
    select: MEMBER_PUBLIC_SELECT,
    orderBy: { joined_at: 'desc' },
  });

  return members.map((member) => MemberResponseSchema.parse(member));
}

export async function getMember(id: string): Promise<MemberResponse> {
  const member = await prisma.member.findUnique({
    where: { id },
    select: MEMBER_PUBLIC_SELECT,
  });

  if (!member || normalizeDeleted(member.deleted_at)) {
    throw ApiError.notFound('Socio');
  }

  return MemberResponseSchema.parse(member);
}

export async function createMember(createdBy: string, input: MemberCreateInput): Promise<MemberResponse> {
  await ensureUniqueMemberFields({
    email: input.email ?? null,
    document_id: input.document_id ?? null,
  });

  const member = await prisma.member.create({
    data: {
      full_name: input.full_name,
      phone: input.phone,
      email: input.email ?? null,
      document_id: input.document_id ?? null,
      birth_date: input.birth_date ? new Date(input.birth_date) : null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      status: input.status ?? 'ACTIVE',
      created_by: createdBy,
    },
    select: MEMBER_PUBLIC_SELECT,
  });

  return MemberResponseSchema.parse(member);
}

export async function updateMember(id: string, input: MemberUpdateInput): Promise<MemberResponse> {
  const existing = await prisma.member.findUnique({
    where: { id },
    select: { ...MEMBER_PUBLIC_SELECT, id: true },
  });

  if (!existing || normalizeDeleted(existing.deleted_at)) {
    throw ApiError.notFound('Socio');
  }

  await ensureUniqueMemberFields(
    {
      email: input.email ?? existing.email ?? null,
      document_id: input.document_id ?? existing.document_id ?? null,
    },
    id
  );

  const nextData: Prisma.MemberUpdateInput = {
    ...(input.full_name ? { full_name: input.full_name } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.email !== undefined ? { email: input.email ?? null } : {}),
    ...(input.document_id !== undefined ? { document_id: input.document_id ?? null } : {}),
    ...(input.birth_date !== undefined ? { birth_date: input.birth_date ? new Date(input.birth_date) : null } : {}),
    ...(input.address !== undefined ? { address: input.address ?? null } : {}),
    ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
    ...(input.status ? { status: input.status } : {}),
  };

  const member = await prisma.member.update({
    where: { id },
    data: nextData,
    select: MEMBER_PUBLIC_SELECT,
  });

  return MemberResponseSchema.parse(member);
}

export async function updateMemberStatus(id: string, status: MemberStatus): Promise<MemberResponse> {
  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, deleted_at: true },
  });

  if (!member || normalizeDeleted(member.deleted_at)) {
    throw ApiError.notFound('Socio');
  }

  const updated = await prisma.member.update({
    where: { id },
    data: { status },
    select: MEMBER_PUBLIC_SELECT,
  });

  return MemberResponseSchema.parse(updated);
}

export async function deleteMember(id: string): Promise<MemberResponse> {
  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, deleted_at: true },
  });

  if (!member || normalizeDeleted(member.deleted_at)) {
    throw ApiError.notFound('Socio');
  }

  const deleted = await prisma.member.update({
    where: { id },
    data: {
      status: 'INACTIVE',
      deleted_at: new Date(),
    },
    select: MEMBER_PUBLIC_SELECT,
  });

  return MemberResponseSchema.parse(deleted);
}

export function canManageMembers(userRole: 'ADMIN' | 'RECEPCION' | 'ENTRENADOR'): boolean {
  return userRole === 'ADMIN' || userRole === 'RECEPCION';
}
