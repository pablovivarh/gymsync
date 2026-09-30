import bcrypt from 'bcryptjs';
import type { Prisma, Role, UserStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../types/api-error';
import { UserResponseSchema } from '@shared/schemas/user.schemas';
import type {
  EmployeeCreateInput,
  EmployeeUpdateInput,
  UserQuery,
  UserResponse,
} from '@shared/schemas/user.schemas';

const EMPLOYEE_PUBLIC_SELECT = {
  id: true,
  nombre_completo: true,
  email: true,
  telefono: true,
  fecha_nacimiento: true,
  direccion_postal: true,
  role: true,
  status: true,
  deleted_at: true,
  created_at: true,
  updated_at: true,
} as const;

function normalizeDeleted(value: Date | null | undefined): boolean {
  return value !== null && value !== undefined;
}

export async function listEmployees(query: Partial<UserQuery> = {}): Promise<UserResponse[]> {
  const where: Prisma.UserWhereInput = {
    deleted_at: null,
    ...(query.search
      ? {
          OR: [
            { nombre_completo: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const employees = await prisma.user.findMany({
    where,
    select: EMPLOYEE_PUBLIC_SELECT,
    orderBy: { created_at: 'desc' },
  });

  return employees.map((employee) => UserResponseSchema.parse(employee));
}

export async function getEmployee(id: string): Promise<UserResponse> {
  const employee = await prisma.user.findUnique({
    where: { id },
    select: EMPLOYEE_PUBLIC_SELECT,
  });

  if (!employee || normalizeDeleted(employee.deleted_at)) {
    throw ApiError.notFound('Empleado');
  }

  return UserResponseSchema.parse(employee);
}

export async function createEmployee(input: EmployeeCreateInput): Promise<UserResponse> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  const employee = await prisma.user.create({
    data: {
      nombre_completo: input.nombre_completo,
      email: input.email,
      password_hash: passwordHash,
      telefono: input.telefono ?? null,
      fecha_nacimiento: input.fecha_nacimiento ? new Date(input.fecha_nacimiento) : null,
      direccion_postal: input.direccion_postal ?? null,
      role: input.role,
      status: input.status ?? 'ACTIVE',
    },
    select: EMPLOYEE_PUBLIC_SELECT,
  });

  return UserResponseSchema.parse(employee);
}

export async function updateEmployee(id: string, input: EmployeeUpdateInput): Promise<UserResponse> {
  const existingEmployee = await prisma.user.findUnique({
    where: { id },
    select: { id: true, deleted_at: true, email: true },
  });

  if (!existingEmployee || normalizeDeleted(existingEmployee.deleted_at)) {
    throw ApiError.notFound('Empleado');
  }

  const nextData: Prisma.UserUpdateInput = {
    ...(input.nombre_completo ? { nombre_completo: input.nombre_completo } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.telefono !== undefined ? { telefono: input.telefono ?? null } : {}),
    ...(input.fecha_nacimiento !== undefined
      ? { fecha_nacimiento: input.fecha_nacimiento ? new Date(input.fecha_nacimiento) : null }
      : {}),
    ...(input.direccion_postal !== undefined ? { direccion_postal: input.direccion_postal ?? null } : {}),
    ...(input.role ? { role: input.role } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.password ? { password_hash: await bcrypt.hash(input.password, 12) } : {}),
  };

  const employee = await prisma.user.update({
    where: { id },
    data: nextData,
    select: EMPLOYEE_PUBLIC_SELECT,
  });

  return UserResponseSchema.parse(employee);
}

export async function updateEmployeeStatus(
  id: string,
  status: UserStatus
): Promise<UserResponse> {
  const employee = await prisma.user.findUnique({
    where: { id },
    select: { id: true, deleted_at: true },
  });

  if (!employee || normalizeDeleted(employee.deleted_at)) {
    throw ApiError.notFound('Empleado');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
    select: EMPLOYEE_PUBLIC_SELECT,
  });

  return UserResponseSchema.parse(updated);
}

export function canManageEmployees(userRole: Role): boolean {
  return userRole === 'ADMIN';
}
