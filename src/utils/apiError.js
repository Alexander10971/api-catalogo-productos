/**
 * Error de aplicación con código HTTP asociado.
 * Lo lanzan los servicios y lo captura el middleware de errores.
 */
class ApiError extends Error {
  constructor(status, message, detalles = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // código HTTP (400, 401, 404, 409, 500...)
    this.detalles = detalles;
  }
}

module.exports = ApiError;
