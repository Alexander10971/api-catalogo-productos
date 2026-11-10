# 📘 Documentación del código — API REST del Catálogo de Productos

> **Guía de estudio para la sustentación.** El documento sigue el orden en que viaja una petición real:
> `server.js → app.js → rutas → validadores → middleware JWT → controlador → servicio → modelo → respuesta (o middleware de errores)`.
> Después se explica el panel web (frontend) y el despliegue en Render.

---

## 0. Conceptos clave (empieza tu explicación por aquí)

| Concepto | Explicación en una frase |
|---|---|
| **API REST** | Interfaz que expone recursos por HTTP usando métodos (GET, POST, PUT, DELETE) y rutas con formato `/api/recurso`. |
| **CRUD** | Las 4 operaciones básicas: **C**rear (POST), **R**e Leer (GET), **U**pdate (PUT), **D**elete (DELETE). |
| **JWT** | JSON Web Token: cadena firmada por el servidor que acredita quién eres. Se envía en el header `Authorization: Bearer <token>`. |
| **CORS** | Mecanismo de seguridad del navegador: el servidor declara qué orígenes (dominios) pueden llamarlo. Lo configuramos con el paquete `cors`. |
| **Middleware** | Función de Express que se ejecuta *entre* la petición y la respuesta; puede validar, autenticar o manejar errores. |
| **Estructura por capas** | Separar responsabilidades: **rutas** (definir URLs) → **controladores** (pedir/responder) → **servicios** (reglas de negocio) → **modelos** (guardar datos). |
| **Código HTTP** | Número que indica el resultado: 200 OK, 201 Creado, 204 Sin contenido, 400 Datos inválidos, 401 No autorizado, 404 No existe, 409 Conflicto, 500 Error interno. |

**Flujo de una petición protegida (ejemplo: crear producto):**

```
Cliente (panel web / Postman)
   │  POST /api/productos + header Authorization: Bearer <token> + JSON del producto
   ▼
server.js ──► app.js (CORS, JSON, estáticos)
   ▼
routes/productos.routes.js
   │  1º requireAuth (verifica el JWT)
   │  2º validator.crear (reglas por campo)
   │  3º validar (convierte errores en HTTP 400)
   ▼
controllers/productos.controller.js   ← llama al servicio, arma la respuesta
   ▼
services/productos.service.js         ← reglas: ¿existe?, ¿duplicado?, timestamps
   ▼
models/productos.model.js             ← lee/escribe data/productos.json
   ▼
Respuesta JSON  { ok: true, data: ... }   o   { ok: false, error: { mensaje, detalles } }
   ▲
   └── si algo falla en cualquier punto → error.middleware.js responde con el código correcto
```

---

## 1. `package.json` — la tarjeta de identidad del proyecto

- **`"name": "api-productos"`** — nombre interno del paquete.
- **`"main": "src/server.js"`** — indica el punto de entrada.
- **`"scripts"`** — comandos cortos:
  - `"start": "node src/server.js"` → ejecuta el servidor en modo normal (`npm start`).
  - `"dev": "node --watch src/server.js"` → igual, pero Node vigila los archivos y **reinicia solo** cuando guardas un cambio (útil al programar).
- **`"dependencies"`** — librerías externas que se instalan con `npm install`:
  - `express` → framework para crear el servidor y las rutas.
  - `cors` → habilita CORS con una sola línea.
  - `dotenv` → carga el archivo `.env` en `process.env`.
  - `express-validator` → valida y limpia los datos que llegan al servidor.
  - `jsonwebtoken` → crea y verifica tokens JWT.
- **`"engines": { "node": ">=18" }`** — le dice a Render qué versión mínima de Node usar.

---

## 2. `src/server.js` — punto de entrada

```js
const app = require('./app');            // 1
const config = require('./config/env');  // 2

app.listen(config.port, () => {          // 3
  console.log('...Servidor: http://localhost:' + config.port); // 4
});
```
1. Importa la aplicación Express ya configurada (todo está en `app.js`, así este archivo queda mínimo).
2. Importa la configuración central (puerto, secretos).
3. `app.listen(puerto, callback)` abre el puerto y deja el proceso esperando peticiones.
4. Muestra en consola la URL para verificar que arrancó.

> **Por qué separar server.js de app.js:** el archivo `app.js` solo *define* la app (se puede probar sin encender el servidor); `server.js` solo la *enciende*. Es la práctica estándar.

---

## 3. `src/config/env.js` — configuración central

```js
require('dotenv').config();                              // 1

module.exports = {                                       // 2
  port: process.env.PORT || 3000,                        // 3
  nodeEnv: process.env.NODE_ENV || 'development',        // 4
  jwtSecret: process.env.JWT_SECRET || 'clave-secreta-por-defecto', // 5
  jwtExpires: process.env.JWT_EXPIRES_IN || '8h',        // 6
  corsOrigin: process.env.CORS_ORIGIN || '*',            // 7
};
```
1. **`dotenv`** lee el archivo `.env` y crea una variable por cada línea dentro de `process.env`.
2. Exporta un único objeto de configuración para todo el proyecto.
3. Puerto: el que diga el entorno (Render lo inyecta en `PORT`) o 3000 por defecto. **Gracias a esto funciona igual en local y en la nube.**
4. Entorno: `development` en tu PC, `production` en Render.
5. Clave secreta con la que se **firman** los JWT. Si alguien la tiene, puede falsificar tokens; por eso en Render se genera aleatoria.
6. Duración del token: `8h` significa que expira 8 horas después del login.
7. Origen permitido por CORS: `*` = acepta peticiones desde cualquier dominio.

---

## 4. `src/utils/apiError.js` — errores con código HTTP

```js
class ApiError extends Error {
  constructor(status, message, detalles = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detalles = detalles;
  }
}
module.exports = ApiError;
```
- `class ApiError extends Error` → crea un error propio que **hereda** del error nativo de JavaScript, pero le añade un campo `status`.
- `super(message)` → le pasa el mensaje al constructor padre.
- `this.status = status` → aquí guardamos el código HTTP (404, 409...).
- `this.detalles` → lista opcional de errores por campo (para validaciones).

**Para qué sirve:** en los servicios hacemos `throw new ApiError(404, 'No existe...')` y el middleware de errores (sección 10) convierte eso automáticamente en una respuesta HTTP 404. Así la lógica de negocio no maneja `res` directamente.

---

## 5. `src/models/productos.model.js` — capa de DATOS

Es la única que sabe que los datos viven en un archivo JSON.

```js
const fs = require('fs');      // módulo nativo: leer/escribir archivos
const path = require('path');  // módulo nativo: rutas compatibles con Windows/Linux

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PRODUCTOS_FILE = path.join(DATA_DIR, 'productos.json');
```
- `fs` y `path` vienen incluidos con Node (no se instalan).
- `path.join(__dirname, ...)` construye la ruta sin importar el sistema operativo. `__dirname` es la carpeta del archivo actual (`src/models`), y `..`, `..` sube hasta la raíz del proyecto, entrando a `data/`.

```js
function leerTodos() {
  if (!fs.existsSync(PRODUCTOS_FILE)) return [];      // si no existe el archivo → catálogo vacío
  try {
    return JSON.parse(fs.readFileSync(PRODUCTOS_FILE, 'utf8')); // lee y convierte el texto a arreglo JS
  } catch {
    return [];                                        // si el archivo está corrupto, no tumba el servidor
  }
}
```
- `fs.existsSync` → pregunta si el archivo existe **sin lanzar error** si no existe.
- `fs.readFileSync(..., 'utf8')` → lee todo el archivo como texto.
- `JSON.parse(...)` → convierte ese texto (`"[{...}]"`) en un arreglo real de objetos.

```js
function guardarTodos(productos) {
  fs.mkdirSync(DATA_DIR, { recursive: true });        // crea la carpeta si no existe
  fs.writeFileSync(PRODUCTOS_FILE, JSON.stringify(productos, null, 2), 'utf8');
}
```
- `mkdirSync(..., { recursive: true })` → crea carpetas anidadas sin fallar si ya existen.
- `JSON.stringify(productos, null, 2)` → convierte el arreglo a texto **con sangría de 2 espacios** para que sea legible.

```js
function buscarPorId(id) {
  return leerTodos().find((p) => p.id === id) || null; // devuelve el producto o null
}

function siguienteId(productos) {
  return productos.reduce((max, p) => Math.max(max, p.id), 0) + 1; // id autoincremental
}
```
- `find` → devuelve el primer elemento que cumpla la condición; con `|| null` devolvemos `null` si no hay ninguno.
- `reduce` → recorre el arreglo guardando el `id` mayor visto, empezando en 0; al final devuelve *máximo + 1*. Así el id siguiente nunca se repite.

---

## 6. `src/services/productos.service.js` — capa de NEGOCIO

Aquí viven las **reglas**: qué pasa si no existe, si está duplicado, con qué código HTTP responder.

```js
function listar({ categoria, buscar } = {}) {
  let productos = model.leerTodos();                       // pide todo a la capa de datos
  if (categoria) {
    const cat = categoria.toLowerCase();                   // compara sin distinguir mayúsculas
    productos = productos.filter((p) => p.categoria.toLowerCase() === cat);
  }
  if (buscar) {
    const term = buscar.toLowerCase();
    productos = productos.filter((p) => p.nombre.toLowerCase().includes(term));
  }
  return productos.sort((a, b) => b.id - a.id);            // más recientes primero
}
```
- `({ categoria, buscar } = {})` → recibe un objeto con esos campos; el `= {}` evita error si llegan sin nada.
- `filter` → devuelve un **nuevo arreglo** solo con los que cumplen la condición.
- `includes` → "contiene el texto" (búsqueda parcial por nombre).
- `sort((a,b) => b.id - a.id)` → ordena descendente por id.

```js
function obtenerPorId(id) {
  const producto = model.buscarPorId(Number(id));          // el id llega como texto "3" → lo volvemos número
  if (!producto) {
    throw new ApiError(404, `No existe un producto con id ${id}`); // regla: no existe → 404
  }
  return producto;
}
```
- `Number(id)` → convierte el parámetro de la URL a número para compararlo con `p.id`.
- `throw new ApiError(404, ...)` → **interrumpe** el flujo; el error sube hasta el middleware de errores que responde 404 con ese mensaje.

```js
function crear(datos) {
  const productos = model.leerTodos();
  const duplicado = productos.find(
    (p) => p.nombre.toLowerCase() === datos.nombre.trim().toLowerCase()
  );
  if (duplicado) {
    throw new ApiError(409, `Ya existe un producto llamado "${datos.nombre}"`); // conflicto
  }
  const ahora = new Date().toISOString();                  // fecha en formato universal
  const producto = {
    id: model.siguienteId(productos),
    nombre: datos.nombre.trim(),                           // quita espacios sobrantes
    precio: Number(datos.precio),                          // "39.9" → 39.9
    categoria: datos.categoria.trim(),
    descripcion: datos.descripcion ? datos.descripcion.trim() : '',
    createdAt: ahora, updatedAt: ahora,
  };
  productos.push(producto);                                // lo agrega al arreglo
  model.guardarTodos(productos);                           // persiste el archivo
  return producto;
}
```
- Regla de negocio: **no pueden existir dos productos con el mismo nombre** (comparación en minúsculas) → si viola, **409 Conflict**.
- `createdAt`/`updatedAt` → auditoría básica de cuándo se creó/modificó.

```js
function actualizar(id, datos) {
  const productos = model.leerTodos();
  const indice = productos.findIndex((p) => p.id === Number(id));
  if (indice === -1) throw new ApiError(404, `No existe un producto con id ${id}`);
  const duplicado = productos.find((p) =>
    p.id !== Number(id) &&                                 // <-- excluye el propio producto
    p.nombre.toLowerCase() === datos.nombre.trim().toLowerCase()
  );
  if (duplicado) throw new ApiError(409, `Ya existe un producto llamado "${datos.nombre}"`);
  const actualizado = {
    ...productos[indice],                                  // conserva id y createdAt
    nombre: datos.nombre.trim(),
    precio: Number(datos.precio),
    categoria: datos.categoria.trim(),
    descripcion: datos.descripcion ? datos.descripcion.trim() : '',
    updatedAt: new Date().toISOString(),                   // marca la fecha de la edición
  };
  productos[indice] = actualizado;                         // reemplaza en la misma posición
  model.guardarTodos(productos);
  return actualizado;
}
```
- `findIndex` devuelve la **posición** en el arreglo (o -1 si no está): necesitamos la posición para reemplazar.
- `...productos[indice]` (spread) → copia todas las propiedades del objeto original; lo que viene **después** lo sobrescribe.

```js
function eliminar(id) {
  const productos = model.leerTodos();
  const indice = productos.findIndex((p) => p.id === Number(id));
  if (indice === -1) throw new ApiError(404, `No existe un producto con id ${id}`);
  const [eliminado] = productos.splice(indice, 1);         // saca el elemento del arreglo
  model.guardarTodos(productos);
  return eliminado;
}
```
- `splice(indice, 1)` → **elimina 1 elemento** en esa posición y devuelve los eliminados como arreglo; con `const [eliminado] =` tomamos el primero de ese arreglo.

---

## 7. `src/services/auth.service.js` — capa de NEGOCIO (login)

```js
const crypto = require('crypto');           // módulo nativo de cifrado

function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}
```
- Calcula el **hash SHA-256** del texto: una "huella" irreversible. Nunca guardamos la contraseña en texto plano; comparamos huellas.

```js
function leerUsuarios() {
  if (!fs.existsSync(USUARIOS_FILE)) {                    // primer arranque del sistema
    const iniciales = [{ id: 1, usuario: 'admin', nombre: 'Administrador',
                         passwordHash: hashPassword('admin123') }];
    fs.mkdirSync(path.dirname(USUARIOS_FILE), { recursive: true });
    fs.writeFileSync(USUARIOS_FILE, JSON.stringify(iniciales, null, 2), 'utf8');
    return iniciales;
  }
  return JSON.parse(fs.readFileSync(USUARIOS_FILE, 'utf8'));
}
```
- Auto-siembra: la **primera vez** que alguien hace login, crea `data/usuarios.json` con el usuario `admin` (contraseña `admin123` ya hasheada).

```js
function login(usuario, password) {
  const usuarios = leerUsuarios();
  const encontrado = usuarios.find((u) => u.usuario === usuario);

  if (!encontrado || encontrado.passwordHash !== hashPassword(password)) {
    throw new ApiError(401, 'Credenciales inválidas');     // NO decimos cuál falló (buena práctica)
  }

  const payload = { sub: encontrado.id, usuario: encontrado.usuario, nombre: encontrado.nombre };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpires });

  return { token, tipo: 'Bearer', expiraEn: config.jwtExpires,
           usuario: { id: encontrado.id, usuario: encontrado.usuario, nombre: encontrado.nombre } };
}
```
- Compara `hash(contraseña escrita)` con el hash guardado.
- `jwt.sign(payload, secreta, { expiresIn })` → **crea el JWT**: codifica el payload, lo firma con `JWT_SECRET` y le pone fecha de vencimiento. El token resultante tiene 3 partes separadas por puntos: `cabecera.payload.firma`.
- El `payload` va dentro del token (se puede leer sin descifrar), así que **nunca metemos la contraseña ahí**.

---

## 8. `src/middlewares/auth.middleware.js` — proteger rutas con JWT

```js
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Token no proporcionado. Usa el header Authorization: Bearer <token>'));
  }

  const token = header.slice('Bearer '.length).trim();     // quita la palabra "Bearer " y deja solo el token

  try {
    const payload = jwt.verify(token, config.jwtSecret);   // valida firma y fecha de expiración
    req.usuario = payload;                                 // guarda los datos del usuario en la petición
    return next();                                         // continúa hacia el controlador
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expirado. Vuelve a iniciar sesión'));
    }
    return next(new ApiError(401, 'Token inválido'));
  }
}
```
- Un middleware tiene la firma `(req, res, next)`: `next()` **pasa al siguiente** eslabón; si le pasamos un error (`next(new ApiError(...))`), Express salta directo al manejador de errores.
- Verifica 3 cosas en orden: ① que venga el header, ② que la firma sea genuina, ③ que no esté vencido.
- `req.usuario = payload` → los controladores "saben" quién está autenticado sin volver a verificar.

---

## 9. `src/validators/` — reglas con `express-validator`

### `auth.validator.js`
```js
body('usuario').trim().notEmpty().withMessage('El usuario es obligatorio'),
body('password').notEmpty().withMessage('La contraseña es obligatoria'),
```
- `body('campo')` → valida esa propiedad del cuerpo JSON.
- `.trim()` limpia espacios, `.notEmpty()` exige que no venga vacío, `.withMessage()` personaliza el mensaje del error.

### `productos.validator.js`
```js
const idParam = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un número entero positivo'),
];
```
- `param('id')` → valida el `:id` de la URL. Si alguien escribe `/api/productos/abc` responde **400** antes de tocar la base de datos.

```js
body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio')
              .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),
body('precio').notEmpty().withMessage('El precio es obligatorio')
              .isFloat({ gt: 0 }).withMessage('El precio debe ser un número mayor que 0'),
body('categoria').trim().notEmpty()...isLength({ max: 50 })...,
body('descripcion').optional({ values: 'falsy' }).trim().isLength({ max: 500 })...,
```
- `isFloat({ gt: 0 })` → número decimal **mayor que 0** (rechaza negativos y cero).
- `optional({ values: 'falsy' })` → solo valida si el campo viene con algo; vacío u omitido es válido (la descripción no es obligatoria).
- `crear` = todas las reglas; `actualizar` = `idParam` + todas las reglas (en un PUT se reemplaza todo).

---

## 10. `src/middlewares/validate.middleware.js` — ejecuta las validaciones

```js
const { validationResult } = require('express-validator');

function validar(req, res, next) {
  const resultado = validationResult(req);           // junta todos los errores acumulados
  if (resultado.isEmpty()) return next();            // sin errores → continúa
  const detalles = resultado.array().map((e) => ({ campo: e.path, mensaje: e.msg, valor: e.value }));
  return next(new ApiError(400, 'Errores de validación', detalles)); // con errores → HTTP 400
}
```
- Se coloca **después** de las cadenas de validación en la ruta.
- Si hay errores, la respuesta 400 trae `detalles` como: `[ { campo: "precio", mensaje: "El precio debe ser un número mayor que 0", valor: -5 } ]`.

---

## 11. `src/controllers/` — capa de PRESENTACIÓN

Los controladores son "recepcionistas": reciben la petición, le piden al servicio la operación y forman la respuesta. **Nunca contienen reglas de negocio.**

```js
function listar(req, res, next) {
  try {
    const productos = service.listar({ categoria: req.query.categoria, buscar: req.query.buscar });
    res.status(200).json({ ok: true, total: productos.length, data: productos });
  } catch (error) {
    next(error);                                     // delega el error al middleware de errores
  }
}
```
- `req.query.categoria` → lee los filtros de la URL (`?categoria=Audio&buscar=mouse`).
- `res.status(200).json(...)` → respuesta **200 OK** con envoltura uniforme `{ ok, total, data }`.
- `try/catch` + `next(error)` → si el servicio lanza `ApiError`, termina en el middleware de errores.

Los demás siguen el mismo patrón:

| Función | Código HTTP | Detalle clave |
|---|---|---|
| `obtener` | 200 | usa `req.params.id` (el `:id` de la ruta) |
| `crear` | **201 Created** | devuelve el producto ya con su `id` |
| `actualizar` | 200 | devuelve el producto modificado |
| `eliminar` | **204 No Content** | `res.status(204).send()` — éxito **sin cuerpo** (protocolo REST) |

`controllers/auth.controller.js`:
```js
const resultado = service.login(req.body.usuario, req.body.password);
res.status(200).json({ ok: true, mensaje: 'Login correcto', data: resultado });
```
- `req.body` → el JSON que envió el cliente (lo rellena `express.json()`); solo `res.data.token` viaja cifrado por HTTPS.

---

## 12. `src/routes/` — el mapa de la API

### `productos.routes.js`
```js
router.get('/',    validator.listar,    validar, controller.listar);   // pública
router.get('/:id', validator.idParam,   validar, controller.obtener);  // pública

router.post('/',   requireAuth, validator.crear,      validar, controller.crear);     // JWT
router.put('/:id', requireAuth, validator.actualizar, validar, controller.actualizar); // JWT
router.delete('/:id', requireAuth, validator.idParam, validar, controller.eliminar);   // JWT
```
- `router` es un mini-enrutador de Express.
- **El orden de los middlewares importa**: primero `requireAuth` (rechaza sin token → 401), después las validaciones (rechazan datos malos → 400), y al final el controlador.
- Es la traducción literal de la tabla de la actividad: GET públicas, POST/PUT/DELETE con JWT.

### `routes/index.js`
```js
router.get('/', (req, res) => { res.status(200).json({ ok: true, nombre: 'API REST - Catálogo...', endpoints: {...} }); });
router.use('/auth', authRoutes);
router.use('/productos', productosRoutes);
```
- `GET /api` devuelve la "carta" de la API (útil para documentar y para el health check de Render).
- `router.use('/productos', ...)` → todo lo que llegue a `/api/productos...` lo atiende su propio router.

### `app.js` — el ensamblador
```js
app.use(cors({ origin: config.corsOrigin }));   // 1 CORS: quién puede llamarnos
app.use(express.json());                        // 2 convierte el body JSON → req.body
app.use(express.static(...public));             // 3 sirve el panel web (index.html)
app.use('/api', routes);                        // 4 todas las rutas de la API
app.use((req, res) => res.status(404).json(...)); // 5 cualquier otra ruta → 404
app.use(errorMiddleware);                       // 6 SIEMPRE al final: manejador de errores
```
- El orden 5-6 es importante: el 404 atrapa lo que no coincidió, y el middleware de errores (con firma de **4 parámetros** `err, req, res, next`) es el único que puede capturar los `next(error)`.

### `middlewares/error.middleware.js`
```js
function errorMiddleware(err, req, res, next) {
  const status = err.status || 500;                          // ApiError trae status; lo demás = 500
  if (status >= 500) console.error('[ERROR 500]', err.stack); // los graves se registran
  res.status(status).json({
    ok: false,
    error: {
      mensaje: err.status ? err.message : 'Error interno del servidor', // un 500 nunca filtra detalles internos
      ...(err.detalles ? { detalles: err.detalles } : {}),    // solo agrega 'detalles' si existe
    },
  });
}
```
- Punto único de manejo de errores: cualquier `next(new ApiError(...))` termina aquí con formato idéntico.
- `...(spread condicional)` → agrega la propiedad `detalles` únicamente si el error la trae.

---

## 13. Panel web — `public/` (frontend)

### `index.html`
- `<header>` con el **título** y la **tarjeta de sesión**: formulario `#formLogin` (usuario/contraseña) y la vista `#sesionInfo` que se muestra cuando hay token.
- `<main>` con tres tarjetas: ① formulario de producto (`#formProducto` con campos `#nombre`, `#precio`, `#categoria`, `#descripcion` y el `id` oculto `#productoId`), ② catálogo (filtros + tabla `#tbody` + búsqueda por ID), ③ consola de peticiones (`#log`).
- `<datalist id="listaCategorias">` → autocompletado de categorías ya existentes.
- `<script src="app.js">` al final para que el HTML exista antes de que el JS lo busque.

### `estilos.css` (resumen por bloques)
- `:root { --fondo: #f2ede1; ... }` → **variables CSS** con la paleta del material del curso (crema, tinta oscura, acento naranja).
- `.card` → tarjetas blancas con esquinas redondeadas y sombra suave.
- `.campos` con `display: grid; grid-template-columns: repeat(3, 1fr)` → formulario en 3 columnas (1 en móvil, ver `@media (max-width: 760px)`).
- `table` con `border-collapse: collapse` y `thead th { background: var(--beige) }` → encabezado estilo la tabla de tu actividad; fuente monoespaciada para datos.
- `.log` → la "terminal": fondo casi negro, texto verde para éxito (`.ok`) y rojo para fallos (`.error`).

### `app.js` — la lógica del panel

**Estado global:**
```js
let token = localStorage.getItem('token') || '';  // token recuperado de sesiones anteriores
let editandoId = null;                            // null = formulario en modo CREAR
const $ = (sel) => document.querySelector(sel);   // atajo para buscar elementos del DOM
```

**Lanzar peticiones (corazón del panel):**
```js
async function peticion(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: {} };
  if (token) opciones.headers['Authorization'] = `Bearer ${token}`;   // adjunta el JWT si existe
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);                          // objeto JS → texto JSON
  }
  const respuesta = await fetch(API + ruta, opciones);               // llama a la API
  const texto = await respuesta.text();
  let datos = null;
  if (texto) { try { datos = JSON.parse(texto); } catch {} }         // el 204 llega vacío y no se parsea
  registrarPeticion(metodo, ruta, respuesta.status);                 // lo anota en la consola visual
  return { status: respuesta.status, ok: respuesta.ok, datos };
}
```
- `fetch` es la función nativa del navegador para llamar APIs; `await` espera su resultado.
- Devuelve `{ status, ok, datos }` para que cada parte de la pantalla decida qué hacer.

**Login:**
```js
$('#formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();                        // evita que la página se recargue
  const r = await peticion('POST', '/auth/login', { usuario: ..., password: ... });
  if (r.ok) {
    token = r.datos.data.token;
    localStorage.setItem('token', token);    // persiste el token en el navegador
    ...
```
- `addEventListener('submit', ...)` → ejecuta la función al enviar el formulario.
- Si responde `r.ok`, guarda el token; si no, muestra el mensaje del error (401).

**Pintar la tabla:**
```js
tbody.innerHTML = productos.map((p) => `
  <tr>
    <td>#${p.id}</td> ... 
    <td>
      <button class="btn-mini" data-accion="editar" data-id="${p.id}">Editar</button>
      <button class="btn-mini eliminar" data-accion="eliminar" data-id="${p.id}">Eliminar</button>
    </td>
  </tr>`).join('');
```
- `map(...).join('')` → convierte cada producto en una fila HTML y une todo en un solo string.
- `data-accion` y `data-id` → atributos que luego permiten saber **qué botón** y **qué producto** se pulsó.

**Delegación de eventos (un solo listener para toda la tabla):**
```js
$('#tbody').addEventListener('click', async (e) => {
  const boton = e.target.closest('button[data-accion]');
  if (!boton) return;                          // clic en otra parte de la fila: ignorar
  const id = boton.dataset.id;
  if (boton.dataset.accion === 'editar') { /* rellena el formulario y activa modo edición */ }
  if (boton.dataset.accion === 'eliminar') {
    if (!confirm(`¿Eliminar el producto #${id}? ...`)) return;   // confirmación previa
    const r = await peticion('DELETE', `/productos/${id}`);
    if (r.status === 204) { ...cargarProductos(); }              // refresca la tabla
  }
});
```
- `e.target.closest(...)` → encuentra el botón más cercano al punto clicado.
- **Editar** rellena el formulario con los datos de la fila, cambia el título a "Editando producto #id", el botón a "Actualizar producto" y `editandoId` guarda el id.

**Guardar (crear o actualizar según el modo):**
```js
$('#formProducto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cuerpo = { nombre: ..., precio: ..., categoria: ..., descripcion: ... };
  if (!token) { mostrarAlerta('HTTP 401: inicia sesión primero...'); return; }
  let r;
  if (editandoId) r = await peticion('PUT', `/productos/${editandoId}`, cuerpo);
  else            r = await peticion('POST', '/productos', cuerpo);

  if (r.ok) { salirModoEdicion(); cargarProductos(); }
  else if (r.status === 400) mostrarAlerta('Errores de validación', 'error', r.datos.error.detalles);
  else if (r.status === 409) mostrarAlerta(r.datos.error.mensaje, 'error');   // duplicado
  ...
});
```
- Un mismo formulario sirve para crear (POST) y editar (PUT): solo cambia `editandoId`.
- Muestra los `detalles` del 400 campo por campo — así se ve la validación del servidor en acción.

**Consola de peticiones:**
```js
li.textContent = `${new Date().toLocaleTimeString()}   ${metodo.padEnd(6)} ${ruta.padEnd(38)} → ${status}`;
li.className = status < 400 ? 'ok' : 'error';
log.prepend(li);      // lo más reciente arriba
```
- `padEnd(6)` → alinea las columnas del "terminal".

---

## 14. `render.yaml` — despliegue en Render

```yaml
services:
  - type: web                # servicio web (con URL pública)
    name: api-catalogo-productos
    runtime: node            # entorno de ejecución
    plan: free
    buildCommand: npm install  # se ejecuta en cada deploy: descarga dependencias
    startCommand: npm start    # cómo se arranca la app en el servidor
    healthCheckPath: /api      # Render comprueba la salud de la app aquí
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true    # Render genera una clave aleatoria segura sola
      - key: JWT_EXPIRES_IN
        value: 8h
      - key: CORS_ORIGIN
        value: "*"
```
- Es un **blueprint**: infraestructura como código. Al conectar el repo, Render crea el servicio con esta configuración sin llenar formularios.

---

## 15. Colección de Postman

- **Variables de colección:** `baseUrl` (http://localhost:3000) y `token` (vacía al inicio).
- **Petición Login** tiene un script de tests:
  ```js
  pm.test('Status 200 OK', () => pm.response.to.have.status(200));
  pm.collectionVariables.set('token', body.data.token);   // guarda el JWT automáticamente
  ```
  Así las peticiones protegidas (`Authorization: Bearer {{token}}`) funcionan sin copiar nada a mano.
- Cada petición tiene `pm.test` que comprueba el código HTTP esperado (200/201/204/400/401/404/409) y el cuerpo: es la **colección de pruebas** de la rúbrica.

---

## 16. Respuestas rápidas para la sustentación

- **¿Por qué capas?** Separar responsabilidades: cambiar el JSON por MongoDB solo toca `models/`; una regla nueva solo toca `services/`.
- **¿Dónde se valida?** En dos niveles: `express-validator` (formato, campos) y los servicios (existencia 404, duplicado 409).
- **¿Cómo proteges el CRUD?** `requireAuth` verifica firma y expiración del JWT antes de llegar al controlador; sin token → 401.
- **¿Por qué 201/204?** REST: un recurso creado responde 201; una eliminación exitosa no tiene nada que mostrar → 204 sin cuerpo.
- **¿Qué pasa si el token está vencido?** `jwt.verify` lanza `TokenExpiredError` → el middleware responde 401 "Token expirado" y el panel pide login de nuevo.
- **¿Cómo funciona CORS aquí?** `cors({ origin: '*' })` permite llamadas desde cualquier origen; el panel web vive en el mismo origen, pero la API igualmente queda abierta para otros frontends (por eso el criterio "CORS y JWT").
