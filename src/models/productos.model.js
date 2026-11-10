/**
 * CAPA DE DATOS (modelo) - Persistencia del catálogo en un archivo JSON.
 * Es la única capa que sabe cómo se guardan los datos.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PRODUCTOS_FILE = path.join(DATA_DIR, 'productos.json');

function leerTodos() {
  if (!fs.existsSync(PRODUCTOS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PRODUCTOS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function guardarTodos(productos) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PRODUCTOS_FILE, JSON.stringify(productos, null, 2), 'utf8');
}

function buscarPorId(id) {
  return leerTodos().find((p) => p.id === id) || null;
}

function siguienteId(productos) {
  return productos.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

module.exports = {
  leerTodos,
  guardarTodos,
  buscarPorId,
  siguienteId,
};
