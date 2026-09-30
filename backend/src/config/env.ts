/**
 * backend/src/config/env.ts
 *
 * Valida y exporta todas las variables de entorno usando Zod.
 * Si falta alguna variable crítica, el proceso falla INMEDIATAMENTE
 * en el arranque con un mensaje claro — no en producción al ejecutar
 * la primera petición que la necesite.
 *
 * Importar este módulo ANTES que cualquier otro en server.ts.
 */
import { z } from 'zod';
import dotenv from 'dotenv';

// Carga el archivo .env en process.env antes de que Zod valide.
// En producción (Docker/K8s), las variables ya están inyectadas en el entorno
// y dotenv.config() las respeta: no sobreescribe variables ya definidas.
// Si no existe .env, esta llamada es un no-op silencioso.
dotenv.config();

const EnvSchema = z.object({
  // Servidor
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Base de datos
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida de PostgreSQL'),

  // JWT (RF-02, doc arquitectura sección 4.2.3)
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres. Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'),
  JWT_EXPIRES_IN: z.string().default('15m'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate limiting (RF-03, doc arquitectura sección 4.2.5)
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(900_000), // 15 min en ms
  RATE_LIMIT_MAX: z.coerce.number().int().default(5),
});

// parse() lanza ZodError en el arranque si algo falla
const parseResult = EnvSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Error de configuración — Variables de entorno inválidas:');
  console.error(parseResult.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parseResult.data;
export type Env = typeof env;
