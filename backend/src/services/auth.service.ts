/**
 * backend/src/services/auth.service.ts
 *
 * Lógica de negocio de autenticación — sin dependencias de HTTP.
 * Lanza ApiError para errores de negocio esperados.
 * El errorMiddleware captura y serializa esas excepciones.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../types/api-error';
import { logger } from '../lib/logger';
import { UserResponseSchema } from '@shared/schemas/user.schemas';
import type { RegisterInput, LoginInput, AuthResponse } from '@shared/schemas/auth.schemas';
import type { UserResponse } from '@shared/schemas/user.schemas';

// ── Tipos exportados ─────────────────────────────────────────────────────────

export interface TokenPayload {
  sub: string;   // userId — RFC 7519 standard claim
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

// ── Helpers privados ─────────────────────────────────────────────────────────

// Select explícito para respuestas públicas.
// Nunca incluye password_hash ni deleted_at.
// Protege contra exposición accidental si se añaden nuevos campos al modelo.
const USER_PUBLIC_SELECT = {
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

// Hash precalculado al cargar el módulo para normalizar el tiempo de respuesta
// en login() cuando el email no existe (prevención de timing attack).
// bcrypt a coste 12 tarda ~250-400ms — se reutiliza en cada petición fallida.
const DUMMY_HASH_PROMISE = bcrypt.hash('__timing_sentinel__', 12);

function signToken(userId: string, email: string, role: Role): string {
  return jwt.sign({ email, role }, env.JWT_SECRET, {
    algorithm: 'HS256',
    // @types/jsonwebtoken@9 usa StringValue (branded type de ms) en lugar de string.
    // La aserción es segura: env.JWT_EXPIRES_IN es validado por Zod y jwt lo parsea en runtime.
    expiresIn: env.JWT_EXPIRES_IN as unknown as jwt.SignOptions['expiresIn'],
    subject: userId,
  });
}

// ── Funciones exportadas ─────────────────────────────────────────────────────

/**
 * Verifica y decodifica un JWT de acceso.
 * Propaga TokenExpiredError o JsonWebTokenError si el token no es válido.
 * El caller (auth.middleware) los captura para generar la respuesta 401 apropiada.
 */
export function verifyToken(token: string): TokenPayload {
  // jwt.verify retorna JwtPayload | string. Nuestros tokens siempre son objetos
  // (firmados con { email, role, sub }), nunca strings planos.
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  }) as unknown as TokenPayload;
  return payload;
}

/**
 * Registra un nuevo usuario del staff con rol por defecto RECEPCION.
 * El campo `role` no forma parte de RegisterInput — se fija aquí en el servicio.
 * Prisma lanzará P2002 si el email ya está registrado; errorMiddleware lo convierte en 409.
 */
export async function register(input: RegisterInput): Promise<UserResponse> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      nombre_completo: input.nombre_completo,
      email: input.email,
      password_hash: passwordHash,
      telefono: input.telefono ?? null,
      fecha_nacimiento: input.fecha_nacimiento ? new Date(input.fecha_nacimiento) : null,
      direccion_postal: input.direccion_postal ?? null,
      role: 'RECEPCION',
    },
    select: USER_PUBLIC_SELECT,
  });

  logger.info({ userId: user.id }, 'Nuevo usuario registrado');

  return UserResponseSchema.parse(user);
}

/**
 * Autentica un usuario con email + contraseña y devuelve un JWT de acceso.
 *
 * Invariantes de seguridad:
 *  1. Siempre ejecuta bcrypt.compare — incluso si el email no existe —
 *     para normalizar el tiempo de respuesta y prevenir enumeración de emails.
 *  2. El mismo mensaje de error aplica a: email inexistente, contraseña incorrecta,
 *     cuenta inactiva y cuenta con soft-delete. No hay forma de distinguirlos externamente.
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  const dummyHash = await DUMMY_HASH_PROMISE;

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      nombre_completo: true,
      role: true,
      status: true,
      deleted_at: true,
    },
  });

  // Siempre compara — si user es null se usa dummyHash (~mismo tiempo que un hash real).
  const isMatch = await bcrypt.compare(
    input.password,
    user?.password_hash ?? dummyHash
  );

  if (
    !user ||
    !isMatch ||
    (user.deleted_at !== null && user.deleted_at !== undefined) ||
    user.status !== 'ACTIVE'
  ) {
    throw ApiError.unauthorized('Credenciales inválidas');
  }

  const accessToken = signToken(user.id, user.email, user.role);

  logger.info({ userId: user.id }, 'Login exitoso');

  return {
    accessToken,
    user: {
      id: user.id,
      nombre_completo: user.nombre_completo,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Obtiene el perfil completo de un usuario por ID.
 * Usado por GET /auth/me — el token ya fue verificado por requireAuth.
 * Relanza 401 si el usuario fue desactivado o eliminado desde que se emitió el token.
 */
export async function getById(userId: string): Promise<UserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PUBLIC_SELECT,
  });

  if (!user || (user.deleted_at !== null && user.deleted_at !== undefined) || user.status !== 'ACTIVE') {
    throw ApiError.unauthorized('Sesión inválida');
  }

  return UserResponseSchema.parse(user);
}
