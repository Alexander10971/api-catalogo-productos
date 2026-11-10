/**
 * CAPA DE PRESENTACIÓN (controlador) - Productos.
 * Recibe la petición, llama al servicio y responde con el código HTTP correcto.
 */
const service = require('../services/productos.service');

/** GET /api/productos  (pública) */
function listar(req, res, next) {
  try {
    const productos = service.listar({
      categoria: req.query.categoria,
      buscar: req.query.buscar,
    });
    res.status(200).json({ ok: true, total: productos.length, data: productos });
  } catch (error) {
    next(error);
  }
}

/** GET /api/productos/:id  (pública) */
function obtener(req, res, next) {
  try {
    const producto = service.obtenerPorId(req.params.id);
    res.status(200).json({ ok: true, data: producto });
  } catch (error) {
    next(error);
  }
}

/** POST /api/productos  (JWT) */
function crear(req, res, next) {
  try {
    const producto = service.crear(req.body);
    res.status(201).json({
      ok: true,
      mensaje: 'Producto creado',
      data: producto,
    });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/productos/:id  (JWT) */
function actualizar(req, res, next) {
  try {
    const producto = service.actualizar(req.params.id, req.body);
    res.status(200).json({
      ok: true,
      mensaje: 'Producto actualizado',
      data: producto,
    });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/productos/:id  (JWT) */
function eliminar(req, res, next) {
  try {
    service.eliminar(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
