/**
 * Validaciones de autenticación (login).
 */
const { body } = require('express-validator');

const login = [
  body('usuario')
    .trim()
    .notEmpty().withMessage('El usuario es obligatorio'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria'),
];

module.exports = { login };
