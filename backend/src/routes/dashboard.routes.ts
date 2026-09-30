import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { getOperationalSummaryHandler } from '../controllers/dashboard.controller';

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get('/operational', requireRole('ADMIN', 'RECEPCION', 'ENTRENADOR'), getOperationalSummaryHandler);

export { dashboardRouter };
