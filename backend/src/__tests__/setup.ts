/**
 * backend/src/__tests__/setup.ts
 *
 * Configura las variables de entorno necesarias ANTES de que cualquier
 * módulo se importe. Vitest ejecuta setupFiles antes que los test files,
 * así que env.ts encuentra todas las variables ya presentes.
 *
 * Usa valores de test que pasan la validación Zod pero no conectan
 * a ningún servicio real — las dependencias externas se mockean en
 * cada test file con vi.mock().
 */

process.env['NODE_ENV']     = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/gymsync_test';
process.env['JWT_SECRET']   = 'test_secret_with_minimum_32_characters_for_jwt_ok';
process.env['PORT']         = '4001';
process.env['CORS_ORIGIN']  = 'http://localhost:5173';
