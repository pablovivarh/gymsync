/**
 * backend/src/routes/employees.routes.ts
 */
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  EmployeeCreateSchema,
  EmployeeStatusSchema,
  EmployeeUpdateSchema,
  UserQuerySchema,
} from '@shared/schemas/user.schemas';
import {
  createEmployeeHandler,
  getEmployeeHandler,
  listEmployeesHandler,
  updateEmployeeHandler,
  updateEmployeeStatusHandler,
} from '../controllers/employees.controller';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate(UserQuerySchema, 'query'), listEmployeesHandler);
router.patch('/:id/status', validate(EmployeeStatusSchema), updateEmployeeStatusHandler);
router.get('/:id', getEmployeeHandler);
router.post('/', validate(EmployeeCreateSchema), createEmployeeHandler);
router.patch('/:id', validate(EmployeeUpdateSchema), updateEmployeeHandler);

export { router as employeesRouter };
