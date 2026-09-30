import type { Request, Response } from 'express';
import { ApiError } from '../types/api-error';
import {
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeStatus,
} from '../services/employees.service';
import type { UserQuery } from '@shared/schemas/user.schemas';
import type { EmployeeCreateInput, EmployeeStatusInput, EmployeeUpdateInput } from '@shared/schemas/user.schemas';

export async function listEmployeesHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as Partial<UserQuery>;
  const employees = await listEmployees(query);

  res.json({
    success: true,
    data: { employees },
  });
}

export async function getEmployeeHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const employee = await getEmployee(id);

  res.json({
    success: true,
    data: { employee },
  });
}

export async function createEmployeeHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as EmployeeCreateInput;
  const employee = await createEmployee(input);

  res.status(201).json({
    success: true,
    data: { employee },
  });
}

export async function updateEmployeeHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const input = req.body as EmployeeUpdateInput;

  if (Object.keys(input).length === 0) {
    throw ApiError.badRequest('No hay campos para actualizar');
  }

  const employee = await updateEmployee(id, input);

  res.json({
    success: true,
    data: { employee },
  });
}

export async function updateEmployeeStatusHandler(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const input = req.body as EmployeeStatusInput;
  const employee = await updateEmployeeStatus(id, input.status);

  res.json({
    success: true,
    data: { employee },
  });
}
