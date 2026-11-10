/**
 * Enrutador principal de la API.
 */
const router = require('express').Router();
const authRoutes = require('./auth.routes');
const productosRoutes = require('./productos.routes');

// GET /api — información general de la API
router.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    nombre: 'API REST - Catálogo de productos',
    modulo: 'Módulo 3',
    panel: 'http://localhost:3000 (abre esta URL en el navegador para el formulario CRUD)',
    endpoints: {
      'POST /api/auth/login': 'Pública - devuelve un token JWT',
      'GET /api/productos': 'Pública - lista productos (?categoria=&buscar=)',
      'GET /api/productos/:id': 'Pública - detalle de un producto',
      'POST /api/productos': 'JWT - crea un producto',
      'PUT /api/productos/:id': 'JWT - actualiza un producto',
      'DELETE /api/productos/:id': 'JWT - elimina un producto',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/productos', productosRoutes);

module.exports = router;
