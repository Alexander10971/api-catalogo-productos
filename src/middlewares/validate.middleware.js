/**
 * Middleware genérico de validación (express-validator).
 * Se coloca DESPUÉS de las cadenas de validación en las rutas.
 * Si hay errores responde 400 con el detalle por campo.
 */
const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

function validar(req, res, next) {
  const resultado = validationResult(req);

  if (resultado.isEmpty()) {
    return next();
  }

  const detalles = resultado.array().map((e) => ({
    campo: e.path,
    mensaje: e.msg,
    valor: e.value,
  }));

  return next(new ApiError(400, 'Errores de validación', detalles));
}

module.exports = validar;
