/**
 * backend/src/jobs/subscription-expiry.job.ts
 *
 * Job programado que actualiza el estado de las suscripciones vencidas.
 * Se ejecuta diariamente a las 00:05 (RF-16, doc funcional sección 7.4).
 *
 * FASE 0: Stub — se activa en Fase 3 (Gestión de Suscripciones).
 * La lógica de negocio vivirá en SubscriptionService para ser testeable
 * de forma independiente sin necesidad de que el cron esté corriendo.
 *
 * Idempotencia garantizada: ejecutar este job N veces tiene el mismo
 * efecto que ejecutarlo una sola vez (UPDATE WHERE = no-op si ya está vencida).
 */
import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { logger } from '../lib/logger';

export function startSubscriptionExpiryJob(): void {
  // Ejecutar a las 00:05 todos los días
  // Formato cron: segundos(opcional) minutos horas día-mes mes día-semana
  cron.schedule('5 0 * * *', () => { void runExpiryJob(); });

  logger.info('Job de vencimiento de suscripciones registrado (00:05 diario)');
}

async function runExpiryJob(): Promise<void> {
  const now = new Date();
  logger.info({ at: now.toISOString() }, 'cron: iniciando job de vencimiento de suscripciones');

  try {
    const result = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        fecha_fin: { lte: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    logger.info({ count: result.count }, 'cron: suscripciones actualizadas a EXPIRED');
  } catch (error) {
    // No lanzar el error — el cron debe seguir corriendo aunque falle una ejecución
    logger.error({ err: error }, 'cron: error en job de vencimiento de suscripciones');
  }
}
