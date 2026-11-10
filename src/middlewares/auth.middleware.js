/**
 * Middleware de autenticación JWT.
 * Verifica el header "Authorization: Bearer <token>".
 */
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const ApiError = require('../utils/apiError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next(
      new ApiError(401, 'Token no proporcionado. Usa el header Authorization: Bearer <token>')
    );
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, jwtSecret);
    // Datos del usuario disponibles para los siguientes middlewares/controladores
    req.usuario = payload;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expirado. Vuelve a iniciar sesión'));
    }
    return next(new ApiError(401, 'Token inválido'));
  }
}

module.exports = { requireAuth };
