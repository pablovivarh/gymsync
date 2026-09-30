import { z } from 'zod';
import { dateStringSchema, datetimeStringSchema } from './utils';

export const MemberStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);
export type MemberStatus = z.infer<typeof MemberStatusEnum>;

export const MemberCreateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede superar 120 caracteres')
    .trim(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-().]{6,20}$/, 'El teléfono no tiene un formato válido')
    .trim(),
  email: z
    .string()
    .email('El email no tiene un formato válido')
    .max(255, 'El email no puede superar 255 caracteres')
    .toLowerCase()
    .trim()
    .optional()
    .nullable(),
  document_id: z
    .string()
    .min(3, 'El documento debe tener al menos 3 caracteres')
    .max(50, 'El documento no puede superar 50 caracteres')
    .trim()
    .optional()
    .nullable(),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe estar en formato YYYY-MM-DD')
    .optional()
    .nullable(),
  address: z.string().max(500, 'La dirección no puede superar 500 caracteres').optional().nullable(),
  notes: z.string().max(1000, 'Las notas no pueden superar 1000 caracteres').optional().nullable(),
  status: MemberStatusEnum.default('ACTIVE'),
});

export type MemberCreateInput = z.infer<typeof MemberCreateSchema>;

export const MemberUpdateSchema = MemberCreateSchema.partial();
export type MemberUpdateInput = z.infer<typeof MemberUpdateSchema>;

export const MemberStatusSchema = z.object({
  status: MemberStatusEnum,
});

export type MemberStatusInput = z.infer<typeof MemberStatusSchema>;

export const MemberResponseSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  document_id: z.string().nullable(),
  birth_date: dateStringSchema.nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  status: MemberStatusEnum,
  joined_at: dateStringSchema,
  created_by: z.string().uuid(),
  created_at: datetimeStringSchema,
  updated_at: datetimeStringSchema,
  deleted_at: datetimeStringSchema.nullable(),
});

export type MemberResponse = z.infer<typeof MemberResponseSchema>;

export const MemberQuerySchema = z.object({
  search: z.string().optional(),
  status: MemberStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MemberQuery = z.infer<typeof MemberQuerySchema>;
