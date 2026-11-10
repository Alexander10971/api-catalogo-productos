/**
 * CAPA DE NEGOCIO (servicio) - Lógica del catálogo de productos.
 * Lanza ApiError con el código HTTP correcto según el caso.
 */
const ApiError = require('../utils/apiError');
const model = require('../models/productos.model');

/** Lista productos, con filtros opcionales ?categoria= y ?buscar= */
function listar({ categoria, buscar } = {}) {
  let productos = model.leerTodos();

  if (categoria) {
    const cat = categoria.toLowerCase();
    productos = productos.filter((p) => p.categoria.toLowerCase() === cat);
  }

  if (buscar) {
    const term = buscar.toLowerCase();
    productos = productos.filter((p) => p.nombre.toLowerCase().includes(term));
  }

  // Más recientes primero
  return productos.sort((a, b) => b.id - a.id);
}

/** Devuelve un producto o lanza 404 */
function obtenerPorId(id) {
  const producto = model.buscarPorId(Number(id));

  if (!producto) {
    throw new ApiError(404, `No existe un producto con id ${id}`);
  }
  return producto;
}

/** Crea un producto. Rechiza nombres duplicados con 409 */
function crear(datos) {
  const productos = model.leerTodos();

  const duplicado = productos.find(
    (p) => p.nombre.toLowerCase() === datos.nombre.trim().toLowerCase()
  );
  if (duplicado) {
    throw new ApiError(409, `Ya existe un producto llamado "${datos.nombre}"`);
  }

  const ahora = new Date().toISOString();
  const producto = {
    id: model.siguienteId(productos),
    nombre: datos.nombre.trim(),
    precio: Number(datos.precio),
    categoria: datos.categoria.trim(),
    descripcion: datos.descripcion ? datos.descripcion.trim() : '',
    createdAt: ahora,
    updatedAt: ahora,
  };

  productos.push(producto);
  model.guardarTodos(productos);
  return producto;
}

/** Reemplaza un producto (PUT). 404 si no existe */
function actualizar(id, datos) {
  const productos = model.leerTodos();
  const indice = productos.findIndex((p) => p.id === Number(id));

  if (indice === -1) {
    throw new ApiError(404, `No existe un producto con id ${id}`);
  }

  const duplicado = productos.find(
    (p) => p.id !== Number(id) &&
      p.nombre.toLowerCase() === datos.nombre.trim().toLowerCase()
  );
  if (duplicado) {
    throw new ApiError(409, `Ya existe un producto llamado "${datos.nombre}"`);
  }

  const actualizado = {
    ...productos[indice],
    nombre: datos.nombre.trim(),
    precio: Number(datos.precio),
    categoria: datos.categoria.trim(),
    descripcion: datos.descripcion ? datos.descripcion.trim() : '',
    updatedAt: new Date().toISOString(),
  };

  productos[indice] = actualizado;
  model.guardarTodos(productos);
  return actualizado;
}

/** Elimina un producto. 404 si no existe */
function eliminar(id) {
  const productos = model.leerTodos();
  const indice = productos.findIndex((p) => p.id === Number(id));

  if (indice === -1) {
    throw new ApiError(404, `No existe un producto con id ${id}`);
  }

  const [eliminado] = productos.splice(indice, 1);
  model.guardarTodos(productos);
  return eliminado;
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
