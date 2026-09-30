/**
 * backend/src/routes/index.ts
 *
 * Router raíz de la API. Monta todos los sub-routers bajo /api/v1/.
 * Versionar la API desde el inicio permite introducir /api/v2 en el
 * futuro sin romper clientes que ya usen v1.
 */
import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { employeesRouter } from './employees.routes';
import { membersRouter } from './members.routes';
import { membershipPlansRouter, membershipsRouter } from './membership.routes';
import { dashboardRouter } from './dashboard.routes';

const router = Router();

// ── Health check (siempre disponible, sin autenticación) ─────────────────────
router.use('/health', healthRouter);

// ── Módulos funcionales ───────────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/employees', employeesRouter);
router.use('/members', membersRouter);
router.use('/membership-plans', membershipPlansRouter);
router.use('/memberships', membershipsRouter);
router.use('/dashboard', dashboardRouter);
// router.use('/subscriptions', subscriptionsRouter); // Fase 3

// ── 404 para rutas no registradas dentro de /api/v1 ──────────────────────────
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint no encontrado',
    },
  });
});

export { router as apiRouter };
