/**
 * shared/schemas/utils.ts
 *
 * Helpers de coerción de tipos para los schemas de respuesta de la API.
 *
 * Por qué existen:
 *   Prisma devuelve objetos Date de JavaScript para columnas @db.Date y
 *   @db.Timestamp. Los response schemas necesitan serializar esos valores
 *   a string antes de enviarlos al cliente. Estos helpers hacen la
 *   coerción transparente: aceptan tanto Date (backend/Prisma) como string
 *   (frontend/API client). El tipo de salida es siempre string.
 */
import { z } from 'zod';

/**
 * Para campos @db.Date (solo fecha, sin hora): YYYY-MM-DD
 * Acepta: Date object | "2025-01-31"
 * Devuelve: "2025-01-31"
 */
export const dateStringSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido: YYYY-MM-DD'),
  z.date().transform((d) => d.toISOString().split('T')[0]),
]);

export type DateString = z.infer<typeof dateStringSchema>;

/**
 * Para campos @db.Timestamp (fecha + hora): ISO 8601
 * Acepta: Date object | "2025-01-31T12:00:00.000Z"
 * Devuelve: "2025-01-31T12:00:00.000Z"
 */
export const datetimeStringSchema = z.union([
  z.string(),
  z.date().transform((d) => d.toISOString()),
]);

export type DatetimeString = z.infer<typeof datetimeStringSchema>;
