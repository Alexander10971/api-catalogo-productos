/**
 * CAPA DE PRESENTACIÓN (rutas) - /api/auth
 */
const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const validar = require('../middlewares/validate.middleware');
const validator = require('../validators/auth.validator');

router.post('/login', validator.login, validar, controller.login);

module.exports = router;
