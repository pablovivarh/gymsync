/**
 * backend/src/types/api-error.ts
 *
 * Error tipado que los servicios lanzan cuando algo falla.
 * El error.middleware.ts lo captura y serializa como respuesta JSON
 * con el código HTTP apropiado, sin necesidad de try/catch en cada controlador.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
    // Necesario para que instanceof funcione correctamente con clases que extienden Error
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'No autenticado'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'No autorizado'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(resource: string): ApiError {
    return new ApiError(404, `${resource} no encontrado`, 'NOT_FOUND');
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message, 'CONFLICT');
  }

  static internal(message = 'Error interno del servidor'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}
