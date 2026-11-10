/**
 * CAPA DE PRESENTACIÓN (controlador) - Autenticación.
 */
const service = require('../services/auth.service');

/** POST /api/auth/login  (pública) */
function login(req, res, next) {
  try {
    const { usuario, password } = req.body;
    const resultado = service.login(usuario, password);
    res.status(200).json({
      ok: true,
      mensaje: 'Login correcto',
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { login };
