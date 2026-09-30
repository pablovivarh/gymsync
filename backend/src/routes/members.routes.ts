/**
 * backend/src/routes/members.routes.ts
 */
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  MemberCreateSchema,
  MemberQuerySchema,
  MemberStatusSchema,
  MemberUpdateSchema,
} from '@shared/schemas/member.schemas';
import {
  createMemberHandler,
  deleteMemberHandler,
  getMemberHandler,
  listMembersHandler,
  updateMemberHandler,
  updateMemberStatusHandler,
} from '../controllers/members.controller';
import { listMemberMembershipsHandler } from '../controllers/membership.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validate(MemberQuerySchema, 'query'), requireRole('ADMIN', 'RECEPCION', 'ENTRENADOR'), listMembersHandler);
router.get('/:id/memberships', requireRole('ADMIN', 'RECEPCION', 'ENTRENADOR'), listMemberMembershipsHandler);
router.get('/:id', requireRole('ADMIN', 'RECEPCION', 'ENTRENADOR'), getMemberHandler);
router.post('/', requireRole('ADMIN', 'RECEPCION'), validate(MemberCreateSchema), createMemberHandler);
router.patch('/:id', requireRole('ADMIN', 'RECEPCION'), validate(MemberUpdateSchema), updateMemberHandler);
router.patch('/:id/status', requireRole('ADMIN', 'RECEPCION'), validate(MemberStatusSchema), updateMemberStatusHandler);
router.delete('/:id', requireRole('ADMIN', 'RECEPCION'), deleteMemberHandler);

export { router as membersRouter };
