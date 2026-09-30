-- Índice único parcial: un usuario solo puede tener UNA suscripción con status='ACTIVE'.
--
-- Prisma Schema Language no soporta índices parciales con cláusula WHERE,
-- por eso se crea aquí como SQL raw (patrón oficial documentado por Prisma).
--
-- Garantiza RF-15 a nivel de base de datos, no solo en la capa de aplicación.
-- Elegir PostgreSQL sobre MySQL fue una decisión arquitectónica motivada
-- precisamente por el soporte de índices parciales.

CREATE UNIQUE INDEX "subscriptions_user_id_active_unique"
ON "subscriptions" ("user_id")
WHERE "status" = 'ACTIVE';
