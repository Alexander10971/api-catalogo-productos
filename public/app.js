/**
 * Panel CRUD del catálogo de productos.
 * Consume la API REST (login JWT, listar, obtener, crear, actualizar, eliminar)
 * y muestra cada petición con su código HTTP en la consola de la parte inferior.
 */
const API = '/api';
let token = localStorage.getItem('token') || '';
let editandoId = null; // id del producto en edición (null = creando)

const $ = (sel) => document.querySelector(sel);

/* ============ Utilidades ============ */

/** Decodifica el payload de un JWT (sin librerías). */
function payloadDelToken(t) {
  try {
    const base64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Registra método, ruta y código HTTP en la consola visual. */
function registrarPeticion(metodo, ruta, status) {
  const log = $('#log');
  if (log.querySelector('.neutral')) log.innerHTML = '';
  const li = document.createElement('li');
  li.className = status < 400 ? 'ok' : 'error';
  li.textContent =
    `${new Date().toLocaleTimeString()}   ${metodo.padEnd(6)} ${ruta.padEnd(38)} → ${status}`;
  log.prepend(li);
}

/** Lanza una petición contra la API y devuelve { status, ok, datos }. */
async function peticion(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: {} };

  if (token) opciones.headers['Authorization'] = `Bearer ${token}`;
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(API + ruta, opciones);
  const texto = await respuesta.text();
  let datos = null;
  if (texto) {
    try { datos = JSON.parse(texto); } catch { datos = null; }
  }

  registrarPeticion(metodo, ruta, respuesta.status);
  return { status: respuesta.status, ok: respuesta.ok, datos };
}

/** Muestra una alerta dentro del formulario. */
function mostrarAlerta(mensaje, tipo = 'info', detalles = null) {
  const alerta = $('#alerta');
  let html = `<strong>${mensaje}</strong>`;
  if (detalles && detalles.length) {
    html += '<ul>' + detalles.map((d) => `<li>${d.campo}: ${d.mensaje}</li>`).join('') + '</ul>';
  }
  alerta.className = `alerta alerta-${tipo}`;
  alerta.innerHTML = html;
  alerta.hidden = false;
  clearTimeout(mostrarAlerta._timer);
  mostrarAlerta._timer = setTimeout(() => { alerta.hidden = true; }, 8000);
}

/* ============ Sesión (POST /api/auth/login) ============ */

function actualizarVistaSesion() {
  const payload = token ? payloadDelToken(token) : null;
  if (payload) {
    $('#formLogin').hidden = true;
    $('#sesionInfo').hidden = false;
    $('#nombreUsuario').textContent = `${payload.nombre} (${payload.usuario})`;
  } else {
    $('#formLogin').hidden = false;
    $('#sesionInfo').hidden = true;
  }
}

$('#formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formulario = e.target;
  const r = await peticion('POST', '/auth/login', {
    usuario: formulario.usuario.value.trim(),
    password: formulario.password.value,
  });

  if (r.ok) {
    token = r.datos.data.token;
    localStorage.setItem('token', token);
    actualizarVistaSesion();
    formulario.password.value = '';
    mostrarAlerta(`Login correcto (HTTP ${r.status}). Ya puedes crear, editar y eliminar.`, 'ok');
  } else {
    token = '';
    localStorage.removeItem('token');
    actualizarVistaSesion();
    mostrarAlerta(`HTTP ${r.status}: ${r.datos?.error?.mensaje || 'No se pudo iniciar sesión'}`, 'error');
  }
});

$('#btnLogout').addEventListener('click', () => {
  token = '';
  localStorage.removeItem('token');
  actualizarVistaSesion();
  mostrarAlerta('Sesión cerrada. Las rutas protegidas (POST/PUT/DELETE) responderán 401.', 'info');
});

/* ============ Catálogo (GET listado / GET por id) ============ */

/** Pinta filas de productos en la tabla y actualiza el contador. */
function pintarTabla(productos) {
  const tbody = $('#tbody');
  $('#contador').textContent = `${productos.length} producto(s)`;
  $('#listaCategorias').innerHTML = [...new Set(productos.map((p) => p.categoria))]
    .map((c) => `<option value="${c}"></option>`)
    .join('');

  if (!productos.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="vacio">Sin productos para mostrar</td></tr>';
    return;
  }

  tbody.innerHTML = productos
    .map(
      (p) => `
      <tr>
        <td>#${p.id}</td>
        <td><strong>${p.nombre}</strong></td>
        <td class="precio">$${p.precio.toFixed(2)}</td>
        <td>${p.categoria}</td>
        <td>${p.descripcion || '—'}</td>
        <td>
          <button class="btn-mini" data-accion="editar" data-id="${p.id}">Editar</button>
          <button class="btn-mini eliminar" data-accion="eliminar" data-id="${p.id}">Eliminar</button>
        </td>
      </tr>`
    )
    .join('');
}

async function cargarProductos() {
  const r = await peticion('GET', '/productos');
  if (r.ok) pintarTabla(r.datos.data);
  else mostrarAlerta(`HTTP ${r.status}: no se pudo cargar el catálogo`, 'error');
}

$('#btnFiltrar').addEventListener('click', async () => {
  const categoria = $('#filtroCategoria').value.trim();
  const buscar = $('#filtroBuscar').value.trim();
  const params = new URLSearchParams();
  if (categoria) params.set('categoria', categoria);
  if (buscar) params.set('buscar', buscar);
  const query = params.toString() ? `?${params}` : '';
  const r = await peticion('GET', `/productos${query}`);
  if (r.ok) pintarTabla(r.datos.data);
});

$('#btnLimpiar').addEventListener('click', () => {
  $('#filtroCategoria').value = '';
  $('#filtroBuscar').value = '';
  $('#buscarId').value = '';
  cargarProductos();
});

// GET /api/productos/:id — búsqueda puntual por ID
$('#btnBuscarId').addEventListener('click', async () => {
  const id = $('#buscarId').value.trim();
  if (!id) return mostrarAlerta('Escribe un ID para buscar.', 'info');

  const r = await peticion('GET', `/productos/${id}`);
  if (r.ok) {
    pintarTabla([r.datos.data]);
    mostrarAlerta(`HTTP ${r.status}: producto #${id} encontrado.`, 'ok');
  } else if (r.status === 404) {
    mostrarAlerta(`HTTP 404: ${r.datos?.error?.mensaje}`, 'error');
  } else {
    mostrarAlerta(`HTTP ${r.status}: ${r.datos?.error?.mensaje}`, 'error', r.datos?.error?.detalles);
  }
});

/* ============ Crear / actualizar (POST y PUT) ============ */

function salirModoEdicion() {
  editandoId = null;
  $('#tituloFormulario').textContent = '➕ Nuevo producto';
  $('#btnGuardar').textContent = 'Crear producto';
  $('#btnCancelar').hidden = true;
  $('#formProducto').reset();
}

$('#formProducto').addEventListener('submit', async (e) => {
  e.preventDefault();

  const cuerpo = {
    nombre: $('#nombre').value.trim(),
    precio: $('#precio').value,
    categoria: $('#categoria').value.trim(),
    descripcion: $('#descripcion').value.trim(),
  };

  // Sin sesión → evitamos la petición y avisamos (la API respondería 401)
  if (!token) {
    mostrarAlerta('HTTP 401: inicia sesión primero. Las rutas de escritura requieren JWT.', 'error');
    return;
  }

  let r;
  if (editandoId) {
    r = await peticion('PUT', `/productos/${editandoId}`, cuerpo);
  } else {
    r = await peticion('POST', '/productos', cuerpo);
  }

  if (r.ok) {
    mostrarAlerta(
      `HTTP ${r.status}: producto ${editandoId ? 'actualizado' : 'creado'} ("${r.datos.data.nombre}").`,
      'ok'
    );
    salirModoEdicion();
    cargarProductos();
  } else if (r.status === 400) {
    mostrarAlerta(`HTTP 400 — Errores de validación`, 'error', r.datos?.error?.detalles);
  } else if (r.status === 401) {
    mostrarAlerta('HTTP 401: tu token expiró o es inválido. Vuelve a iniciar sesión.', 'error');
  } else if (r.status === 409) {
    mostrarAlerta(`HTTP 409: ${r.datos?.error?.mensaje}`, 'error');
  } else {
    mostrarAlerta(`HTTP ${r.status}: ${r.datos?.error?.mensaje || 'Error inesperado'}`, 'error');
  }
});

$('#btnCancelar').addEventListener('click', salirModoEdicion);

/* ============ Editar / eliminar (delegación en la tabla) ============ */

$('#tbody').addEventListener('click', async (e) => {
  const boton = e.target.closest('button[data-accion]');
  if (!boton) return;

  const id = boton.dataset.id;

  if (boton.dataset.accion === 'editar') {
    // Rellenamos el formulario con los datos visibles de la fila
    const fila = boton.closest('tr');
    editandoId = id;
    $('#productoId').value = id;
    $('#nombre').value = fila.children[1].textContent;
    $('#precio').value = fila.children[2].textContent.replace('$', '');
    $('#categoria').value = fila.children[3].textContent;
    $('#descripcion').value = fila.children[4].textContent === '—' ? '' : fila.children[4].textContent;
    $('#tituloFormulario').textContent = `✏️ Editando producto #${id}`;
    $('#btnGuardar').textContent = 'Actualizar producto';
    $('#btnCancelar').hidden = false;
    $('#formProducto').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (boton.dataset.accion === 'eliminar') {
    if (!token) {
      mostrarAlerta('HTTP 401: inicia sesión primero para eliminar (JWT requerido).', 'error');
      return;
    }
    if (!confirm(`¿Eliminar el producto #${id}? (DELETE /api/productos/${id})`)) return;

    const r = await peticion('DELETE', `/productos/${id}`);
    if (r.status === 204) {
      mostrarAlerta(`HTTP 204: producto #${id} eliminado.`, 'ok');
      if (String(editandoId) === id) salirModoEdicion();
      cargarProductos();
    } else if (r.status === 401) {
      mostrarAlerta('HTTP 401: token inválido o expirado. Inicia sesión de nuevo.', 'error');
    } else {
      mostrarAlerta(`HTTP ${r.status}: ${r.datos?.error?.mensaje}`, 'error');
    }
  }
});

/* ============ Arranque ============ */
actualizarVistaSesion();
cargarProductos();
