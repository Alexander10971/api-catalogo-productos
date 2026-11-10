/**
 * Middleware central de manejo de errores.
 * Debe ser el ÚLTIMO middleware registrado en app.js.
 * Formato de respuesta uniforme: { ok: false, error: { mensaje, detalles? } }
 */
const { nodeEnv } = require('../config/env');

function errorMiddleware(err, req, res, next) {
  const status = err.status || 500;

  // Los errores no controlados (500) se registran en consola
  if (status >= 500) {
    console.error('[ERROR 500]', err.stack || err.message);
  } else if (nodeEnv === 'development') {
    console.warn(`[ERROR ${status}] ${err.message}`);
  }

  res.status(status).json({
    ok: false,
    error: {
      // Nunca filtramos detalles internos si es un error 500
      mensaje: err.status ? err.message : 'Error interno del servidor',
      ...(err.detalles ? { detalles: err.detalles } : {}),
    },
  });
}

module.exports = { errorMiddleware };
