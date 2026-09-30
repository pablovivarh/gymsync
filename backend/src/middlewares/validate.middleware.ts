/**
 * backend/src/middlewares/validate.middleware.ts
 *
 * Fábrica de middlewares de validación Zod.
 * Parsea y valida body, params o query contra un schema Zod.
 * Si la validación falla, lanza un ZodError que el error.middleware captura.
 * Si pasa, sobreescribe req.body/params/query con los datos parseados y tipados.
 *
 * Uso en routes:
 *   router.post('/users', validate(CreateUserSchema), usersController.create);
 *   router.get('/users', validate(UserQuerySchema, 'query'), usersController.list);
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidationTarget = 'body' | 'params' | 'query';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(result.error);
      return;
    }

    // En Express 5, req.query/req.params pueden exponerse como propiedades con getter,
    // por lo que la asignación directa falla. Definir la propiedad sobre la instancia
    // evita el error sin romper el acceso del framework.
    Object.defineProperty(req, target, {
      value: result.data,
      configurable: true,
      writable: true,
      enumerable: true,
    });

    next();
  };
}
