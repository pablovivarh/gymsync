import { z } from 'zod';
import { dateStringSchema, datetimeStringSchema } from './utils';

export const MembershipStatusEnum = z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']);
export type MembershipStatus = z.infer<typeof MembershipStatusEnum>;

export const PaymentMethodEnum = z.enum(['CASH', 'CARD', 'TRANSFER', 'BANK', 'OTHER']);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const PaymentStatusEnum = z.enum(['PAID', 'PENDING', 'REFUNDED', 'CANCELLED']);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const MembershipPlanCreateSchema = z.object({
  name: z.string().min(2, 'El nombre del plan debe tener al menos 2 caracteres').max(120, 'El nombre no puede superar 120 caracteres').trim(),
  description: z.string().max(500, 'La descripción no puede superar 500 caracteres').trim().optional().nullable(),
  duration_days: z.coerce.number().int().min(1, 'La duración debe ser al menos 1 día').max(3650, 'La duración no puede superar 3650 días'),
  price: z.coerce.number().int().min(0, 'El precio no puede ser negativo').max(1000000, 'El precio no es válido'),
  active: z.boolean().default(true),
});

export type MembershipPlanCreateInput = z.infer<typeof MembershipPlanCreateSchema>;

export const MembershipPlanUpdateSchema = MembershipPlanCreateSchema.partial();
export type MembershipPlanUpdateInput = z.infer<typeof MembershipPlanUpdateSchema>;

export const MembershipPlanResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  duration_days: z.number().int(),
  price: z.number().int(),
  active: z.boolean(),
  created_by: z.string().uuid(),
  created_at: datetimeStringSchema,
  updated_at: datetimeStringSchema,
  deleted_at: datetimeStringSchema.nullable(),
});

export type MembershipPlanResponse = z.infer<typeof MembershipPlanResponseSchema>;

export const MembershipCreateSchema = z.object({
  member_id: z.string().uuid('El identificador del socio no es válido'),
  plan_id: z.string().uuid('El identificador del plan no es válido'),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  status: MembershipStatusEnum.default('ACTIVE'),
  price: z.coerce.number().int().min(0).max(1000000).optional(),
});

export type MembershipCreateInput = z.infer<typeof MembershipCreateSchema>;

export const MembershipRenewSchema = z.object({
  plan_id: z.string().uuid('El identificador del plan no es válido'),
  start_date: dateStringSchema.optional(),
  price: z.coerce.number().int().min(0).max(1000000).optional(),
});

export type MembershipRenewInput = z.infer<typeof MembershipRenewSchema>;

export const MembershipResponseSchema = z.object({
  id: z.string().uuid(),
  member_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  start_date: dateStringSchema,
  end_date: dateStringSchema,
  status: MembershipStatusEnum,
  price: z.number().int(),
  created_by: z.string().uuid(),
  created_at: datetimeStringSchema,
  updated_at: datetimeStringSchema,
  deleted_at: datetimeStringSchema.nullable(),
});

export type MembershipResponse = z.infer<typeof MembershipResponseSchema>;

export const PaymentCreateSchema = z.object({
  amount: z.coerce.number().int().min(1, 'El importe debe ser mayor que cero').max(1000000, 'El importe no es válido'),
  payment_date: dateStringSchema.optional(),
  method: PaymentMethodEnum.default('CASH'),
  status: PaymentStatusEnum.default('PAID'),
  reference: z.string().max(120, 'La referencia no puede superar 120 caracteres').trim().optional().nullable(),
  notes: z.string().max(500, 'Las notas no pueden superar 500 caracteres').trim().optional().nullable(),
});

export type PaymentCreateInput = z.infer<typeof PaymentCreateSchema>;

export const PaymentResponseSchema = z.object({
  id: z.string().uuid(),
  membership_id: z.string().uuid(),
  amount: z.number().int(),
  payment_date: dateStringSchema,
  method: PaymentMethodEnum,
  status: PaymentStatusEnum,
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  created_by: z.string().uuid(),
  created_at: datetimeStringSchema,
  updated_at: datetimeStringSchema,
  deleted_at: datetimeStringSchema.nullable(),
});

export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;
