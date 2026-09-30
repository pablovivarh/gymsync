/**
 * backend/src/lib/logger.ts
 *
 * Logger estructurado basado en Pino.
 *
 * - Desarrollo: salida legible vía pino-pretty (colores, timestamps HH:MM:ss)
 * - Producción:  JSON a stdout — compatible con cualquier sistema de log aggregation
 * - Test:        nivel 'silent' — sin output en la consola durante los tests
 *
 * pino-pretty es devDependency y nunca se carga en producción:
 * el bloque `transport` solo se activa cuando NODE_ENV === 'development'.
 */
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});
