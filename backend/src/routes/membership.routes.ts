import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  MembershipCreateSchema,
  MembershipPlanCreateSchema,
  MembershipPlanUpdateSchema,
  MembershipRenewSchema,
  PaymentCreateSchema,
} from '@shared/schemas/membership.schemas';
import {
  createMembershipHandler,
  createMembershipPlanHandler,
  createPaymentHandler,
  deleteMembershipPlanHandler,
  getMembershipHandler,
  getMembershipPlanHandler,
  listMembershipPaymentsHandler,
  listMembershipPlansHandler,
  listMembershipsHandler,
  renewMembershipHandler,
  updateMembershipPlanHandler,
} from '../controllers/membership.controller';

const membershipPlansRouter = Router();
const membershipsRouter = Router();

membershipPlansRouter.use(requireAuth);
membershipPlansRouter.get('/', requireRole('ADMIN', 'RECEPCION', 'ENTRENADOR'), listMembershipPlansHandler);
membershipPlansRouter.get('/:id', requireRole('ADMIN', 'RECEPCION', 'ENTRENADOR'), getMembershipPlanHandler);
membershipPlansRouter.post('/', requireRole('ADMIN', 'RECEPCION'), validate(MembershipPlanCreateSchema), createMembershipPlanHandler);
membershipPlansRouter.patch('/:id', requireRole('ADMIN', 'RECEPCION'), validate(MembershipPlanUpdateSchema), updateMembershipPlanHandler);
membershipPlansRouter.delete('/:id', requireRole('ADMIN', 'RECEPCION'), deleteMembershipPlanHandler);

membershipsRouter.use(requireAuth);
membershipsRouter.get('/', requireRole('ADMIN', 'RECEPCION', 'ENTRENADOR'), listMembershipsHandler);
membershipsRouter.get('/:id', requireRole('ADMIN', 'RECEPCION', 'ENTRENADOR'), getMembershipHandler);
membershipsRouter.post('/', requireRole('ADMIN', 'RECEPCION'), validate(MembershipCreateSchema), createMembershipHandler);
membershipsRouter.post('/:id/renew', requireRole('ADMIN', 'RECEPCION'), validate(MembershipRenewSchema), renewMembershipHandler);
membershipsRouter.get('/:id/payments', requireRole('ADMIN', 'RECEPCION', 'ENTRENADOR'), listMembershipPaymentsHandler);
membershipsRouter.post('/:id/payments', requireRole('ADMIN', 'RECEPCION'), validate(PaymentCreateSchema), createPaymentHandler);

export { membershipPlansRouter, membershipsRouter };
