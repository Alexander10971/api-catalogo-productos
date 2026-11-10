/**
 * CAPA DE PRESENTACIÓN (rutas) - /api/productos
 */
const router = require('express').Router();
const controller = require('../controllers/productos.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const validar = require('../middlewares/validate.middleware');
const validator = require('../validators/productos.validator');

// --- Rutas públicas ---
router.get('/', validator.listar, validar, controller.listar);
router.get('/:id', validator.idParam, validar, controller.obtener);

// --- Rutas protegidas con JWT ---
router.post('/', requireAuth, validator.crear, validar, controller.crear);
router.put('/:id', requireAuth, validator.actualizar, validar, controller.actualizar);
router.delete('/:id', requireAuth, validator.idParam, validar, controller.eliminar);

module.exports = router;
