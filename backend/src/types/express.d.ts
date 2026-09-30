/**
 * backend/src/types/express.d.ts
 *
 * Augmenta el tipo Request de Express para incluir el payload
 * JWT decodificado. El middleware auth.middleware.ts lo rellena
 * tras verificar el token. Los controladores acceden a req.user
 * con type-safety completa.
 */
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}
