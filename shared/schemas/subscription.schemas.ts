/**
 * shared/schemas/subscription.schemas.ts
 */
import { z } from 'zod';
import { dateStringSchema, datetimeStringSchema } from './utils';

export const ModalidadEnum = z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']);
export type Modalidad = z.infer<typeof ModalidadEnum>;

export const SubscriptionStatusEnum = z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

// Días por modalidad — fuente única de verdad (RF-14)
export const MODALIDAD_DAYS: Record<Modalidad, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  ANNUAL: 365,
};

export const CreateSubscriptionSchema = z.object({
  user_id: z.string().uuid('ID de usuario inválido'),
  modalidad: ModalidadEnum,
  fecha_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha en formato YYYY-MM-DD')
    .optional(), // Si no se pasa, el backend usa la fecha actual
});
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

export const SubscriptionResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  modalidad: ModalidadEnum,
  fecha_inicio: dateStringSchema,
  fecha_fin: dateStringSchema,
  status: SubscriptionStatusEnum,
  created_by: z.string().uuid(),
  created_at: datetimeStringSchema,
  updated_at: datetimeStringSchema,
});
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

export const SubscriptionQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
  status: SubscriptionStatusEnum.optional(),
  expiring_days: z.coerce.number().int().min(1).max(30).optional(), // próximas a vencer
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type SubscriptionQuery = z.infer<typeof SubscriptionQuerySchema>;
