/**
 * shared/schemas/user.schemas.ts
 *
 * Schemas Zod compartidos entre frontend y backend.
 * Define las reglas de validación UNA SOLA VEZ.
 * El frontend los usa para validar formularios.
 * El backend los usa en el middleware de validación de entrada.
 */
import { z } from 'zod';
import { dateStringSchema, datetimeStringSchema } from './utils';

// ── Enums del dominio ────────────────────────────────────────────────────────

export const RoleEnum = z.enum(['ADMIN', 'RECEPCION', 'ENTRENADOR']);
export type Role = z.infer<typeof RoleEnum>;

export const UserStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'DELETED']);
export type UserStatus = z.infer<typeof UserStatusEnum>;

// ── Reglas de contraseña (referencia al doc funcional RF-01) ─────────────────

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un dígito')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial');

// ── Schemas de creación ──────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  nombre_completo: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede superar 120 caracteres')
    .trim(),
  email: z
    .string()
    .email('El email no tiene un formato válido')
    .max(255, 'El email no puede superar 255 caracteres')
    .toLowerCase()
    .trim(),
  password: passwordSchema,
  telefono: z
    .string()
    .regex(/^\+?[0-9\s\-().]{6,20}$/, 'El teléfono no tiene un formato válido')
    .optional()
    .nullable(),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe estar en formato YYYY-MM-DD')
    .optional()
    .nullable(),
  direccion_postal: z.string().max(500).optional().nullable(),
  role: RoleEnum.default('RECEPCION'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// ── Schema de actualización (todos los campos opcionales) ────────────────────

export const UpdateUserSchema = CreateUserSchema.omit({ password: true, email: true })
  .partial()
  .extend({
    // El email solo puede cambiarlo un admin, por eso va separado
    email: z.string().email().max(255).toLowerCase().trim().optional(),
  });

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ── Schema de respuesta (lo que devuelve la API — sin password) ──────────────
//
// dateStringSchema y datetimeStringSchema aceptan tanto Date objects (Prisma)
// como strings (cliente). La capa de servicio no necesita serializar
// manualmente: puede pasar el resultado de Prisma directamente.

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  nombre_completo: z.string(),
  email: z.string(),
  telefono: z.string().nullable(),
  fecha_nacimiento: dateStringSchema.nullable(),
  direccion_postal: z.string().nullable(),
  role: RoleEnum,
  status: UserStatusEnum,
  created_at: datetimeStringSchema,
  updated_at: datetimeStringSchema,
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

// ── Schemas específicos para gestión de empleados / staff ─────────────────

export const EmployeeCreateSchema = CreateUserSchema.extend({
  status: UserStatusEnum.default('ACTIVE'),
});

export type EmployeeCreateInput = z.infer<typeof EmployeeCreateSchema>;

export const EmployeeUpdateSchema = UpdateUserSchema.extend({
  status: UserStatusEnum.optional(),
  password: passwordSchema.optional(),
}).partial();

export type EmployeeUpdateInput = z.infer<typeof EmployeeUpdateSchema>;

export const EmployeeStatusSchema = z.object({
  status: UserStatusEnum,
});

export type EmployeeStatusInput = z.infer<typeof EmployeeStatusSchema>;

// ── Schema de búsqueda / filtrado ────────────────────────────────────────────

export const UserQuerySchema = z.object({
  search: z.string().optional(),
  role: RoleEnum.optional(),
  status: UserStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserQuery = z.infer<typeof UserQuerySchema>;
