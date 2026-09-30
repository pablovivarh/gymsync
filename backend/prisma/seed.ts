/**
 * backend/prisma/seed.ts
 *
 * Datos iniciales de desarrollo.
 * Ejecutar con: npm run db:seed (desde la raíz del monorepo)
 * o: cd backend && npx prisma db seed
 *
 * Crea un usuario administrador por defecto para poder
 * empezar a trabajar con el sistema sin crear datos manualmente.
 *
 * SOLO para entornos de desarrollo. Nunca en producción.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.info('🌱 Iniciando seed de base de datos...');

  // Usuario administrador por defecto
  const adminPassword = await bcrypt.hash('Admin123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gymsync.dev' },
    update: {},
    create: {
      email: 'admin@gymsync.dev',
      password_hash: adminPassword,
      nombre_completo: 'Administrador GymSync',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.info(`✅ Admin creado: ${admin.email}`);

  // Usuario de recepción de prueba
  const receptionPassword = await bcrypt.hash('Recepcion123!', 12);

  const reception = await prisma.user.upsert({
    where: { email: 'recepcion@gymsync.dev' },
    update: {},
    create: {
      email: 'recepcion@gymsync.dev',
      password_hash: receptionPassword,
      nombre_completo: 'Recepción de Prueba',
      role: 'RECEPCION',
      status: 'ACTIVE',
    },
  });

  console.info(`✅ Recepción creada: ${reception.email}`);

  // Usuario entrenador de prueba
  const trainerPassword = await bcrypt.hash('Entrenador123!', 12);

  const trainer = await prisma.user.upsert({
    where: { email: 'entrenador@gymsync.dev' },
    update: {},
    create: {
      email: 'entrenador@gymsync.dev',
      password_hash: trainerPassword,
      nombre_completo: 'Entrenador de Prueba',
      role: 'ENTRENADOR',
      status: 'ACTIVE',
    },
  });

  console.info(`✅ Entrenador creado: ${trainer.email}`);

  console.info(`
╔══════════════════════════════════════════════════════╗
║       Seed completado — Usuarios de staff creados  ║
╠══════════════════════════════════════════════════════╣
║  Admin      : admin@gymsync.dev / Admin123!        ║
║  Recepción  : recepcion@gymsync.dev / Recepcion123! ║
║  Entrenador : entrenador@gymsync.dev / Entrenador123! ║
╚══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
