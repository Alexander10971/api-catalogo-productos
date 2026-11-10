/**
 * Validaciones del recurso "productos" (express-validator).
 */
const { body, param, query } = require('express-validator');

const idParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El id debe ser un número entero positivo'),
];

const datosProducto = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),
  body('precio')
    .notEmpty().withMessage('El precio es obligatorio')
    .isFloat({ gt: 0 }).withMessage('El precio debe ser un número mayor que 0'),
  body('categoria')
    .trim()
    .notEmpty().withMessage('La categoría es obligatoria')
    .isLength({ max: 50 }).withMessage('La categoría no puede superar 50 caracteres'),
  body('descripcion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('La descripción no puede superar 500 caracteres'),
];

const listar = [
  query('categoria')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 50 }).withMessage('El filtro categoria no puede superar 50 caracteres'),
  query('buscar')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }).withMessage('El filtro buscar no puede superar 100 caracteres'),
];

const crear = [...datosProducto];

const actualizar = [...idParam, ...datosProducto];

module.exports = {
  idParam,
  listar,
  crear,
  actualizar,
};
