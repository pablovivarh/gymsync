/**
 * shared/schemas/auth.schemas.ts
 */
import { z } from 'zod';
import { passwordSchema, CreateUserSchema } from './user.schemas';

// Registro público para personal del gimnasio: siempre crea cuentas de staff.
// El campo `role` se omite deliberadamente — el servicio lo fija en 'RECEPCION'.
// Ningún usuario puede autopromoverse a ADMIN o ENTRENADOR desde el registro público.
export const RegisterSchema = CreateUserSchema.omit({ role: true }).strict();
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'El token es obligatorio'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    nombre_completo: z.string(),
    email: z.string(),
    role: z.enum(['ADMIN', 'RECEPCION', 'ENTRENADOR']),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
