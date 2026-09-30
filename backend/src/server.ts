/**
 * backend/src/server.ts
 *
 * Entry point del servidor.
 * Importa env PRIMERO (valida variables y falla rápido si algo falta).
 * Luego crea la app, inicia el servidor HTTP y registra el job de cron.
 */

// IMPORTANTE: env.ts debe importarse antes que cualquier otro módulo
// que use process.env, para garantizar que las variables están validadas.
import './config/env';

import { createApp } from './app';
import { prisma } from './config/prisma';
import { env } from './config/env';
import { logger } from './lib/logger';
// import { startSubscriptionExpiryJob } from './jobs/subscription-expiry.job'; // Fase 3

const app = createApp();

async function main(): Promise<void> {
  // Verificar conexión a la BD antes de aceptar tráfico
  try {
    await prisma.$connect();
    logger.info('Conexión a PostgreSQL establecida');
  } catch (error) {
    logger.error({ err: error }, 'No se puede conectar a PostgreSQL');
    process.exit(1);
  }

  // Iniciar servidor HTTP
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      'GymSync API iniciada'
    );
  });

  // Iniciar jobs de cron (descomentado en Fase 3)
  // startSubscriptionExpiryJob();

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Espera a que las peticiones activas terminen antes de cerrar.
  // El timeout de 30s es el fallback: si algún request no termina,
  // forzamos la salida en vez de colgar indefinidamente.
  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Señal recibida — cerrando servidor');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timeout (30s) — forzando salida');
      process.exit(1);
    }, 30_000);
    // unref() evita que el timer mantenga el proceso vivo si todo cierra antes
    forceExit.unref();

    server.close(() => {
      clearTimeout(forceExit);
      void prisma.$disconnect().then(() => {
        logger.info('Servidor cerrado correctamente');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => { shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { shutdown('SIGINT'); });
}

void main();
