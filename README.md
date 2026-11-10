# API REST — Catálogo de Productos (Módulo 3)

API REST completa con **Node.js + Express**, autenticación **JWT**, **CORS**, validaciones y códigos HTTP correctos, organizada **por capas**.

## Cómo ejecutar

```bash
cd api-productos
npm install
npm run dev     # modo desarrollo (reinicia con node --watch)
# o
npm start       # modo normal
```

El servidor queda en: `http://localhost:3000`

- **Panel web (formulario CRUD):** abre `http://localhost:3000` en el navegador. También puedes hacer doble clic en `iniciar-api.bat` (carpeta `Web site`) para iniciar el servidor y abrir el panel automáticamente.
- **Usuario de prueba:** `admin` / `admin123`

> Al primer arranque se crea `data/usuarios.json` con ese usuario (contraseña guardada con hash SHA-256).

## Endpoints

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/auth/login` | Pública | Devuelve un token JWT |
| GET | `/api/productos` | Pública | Lista productos. Filtros: `?categoria=` y `?buscar=` |
| GET | `/api/productos/:id` | Pública | Detalle de un producto |
| POST | `/api/productos` | JWT | Crea un producto (201) |
| PUT | `/api/productos/:id` | JWT | Actualiza un producto (200) |
| DELETE | `/api/productos/:id` | JWT | Elimina un producto (204) |

### Códigos HTTP utilizados

| Código | Cuando ocurre |
|--------|---------------|
| 200 OK | Consulta o actualización exitosa |
| 201 Created | Producto creado |
| 204 No Content | Producto eliminado (sin cuerpo) |
| 400 Bad Request | Datos inválidos (validación) |
| 401 Unauthorized | Falta el token, es inválido o expiró / credenciales incorrectas |
| 404 Not Found | Producto o ruta inexistente |
| 409 Conflict | Ya existe un producto con ese nombre |
| 500 | Error interno no controlado |

## Estructura por capas

```
api-productos/
├── data/                        # Persistencia (archivos JSON)
│   ├── productos.json           # Catálogo sembrado con 5 productos
│   └── usuarios.json            # Se genera al primer arranque
├── postman/
│   ├── coleccion-catalogo.postman_collection.json
│   └── entorno-local.postman_environment.json
├── public/                      # PANEL WEB (formulario CRUD)
│   ├── index.html
│   ├── estilos.css
│   └── app.js
├── src/
│   ├── config/env.js            # Variables de entorno
│   ├── utils/apiError.js        # Errores con código HTTP
│   ├── models/                  # CAPA DE DATOS (acceso a JSON)
│   ├── services/                # CAPA DE NEGOCIO (reglas, JWT, 404/409)
│   ├── controllers/             # CAPA DE PRESENTACIÓN (req/res)
│   ├── routes/                  # Definición de rutas y orden de middlewares
│   ├── validators/              # Reglas con express-validator
│   ├── middlewares/             # JWT, validación y errores centralizados
│   ├── app.js                   # Express + CORS + estáticos + rutas
│   └── server.js                # Punto de entrada
├── .env
└── package.json
```

### Panel web (formulario CRUD)

Al abrir `http://localhost:3000` se sirve el panel (`public/`) que consume los 6 endpoints:

- **Sesión JWT:** formulario de login (`POST /api/auth/login`), guarda el token en `localStorage` y permite cerrar sesión.
- **Formulario de producto:** crea (`POST /api/productos`) y edita (`PUT /api/productos/:id`) con modo edición y cancelación.
- **Tabla del catálogo:** lista (`GET /api/productos`), busca por ID (`GET /api/productos/:id`), filtra por categoría y nombre, y elimina (`DELETE /api/productos/:id`) con confirmación.
- **Consola de peticiones:** registra método + ruta + código HTTP de cada operación (200/201/204/400/401/404/409).

Flujo de una petición: `ruta → validación → JWT (si protege) → controlador → servicio → modelo`.

## Colección de pruebas (Postman)

1. Importa `postman/coleccion-catalogo.postman_collection.json` (y opcionalmente el entorno).
2. Ejecuta primero **1. Auth → Login**: el test guarda el token en la variable `{{token}}` automáticamente.
3. Corre las carpetas **2. Consultas públicas** y **3. Operaciones protegidas**.

La colección incluye pruebas automáticas con `pm.test` para: 200/201/204/400/401/404/409, formato del JWT, cuerpo de respuesta y encadenamiento del id creado.

## Ejemplos rápidos (curl)

```bash
# Login (obtener token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","password":"admin123"}'

# Listar (pública)
curl http://localhost:3000/api/productos

# Detalle
curl http://localhost:3000/api/productos/1

# Crear (requiere JWT)
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"nombre":"Webcam Full HD","precio":39.9,"categoria":"Perifericos"}'

# Actualizar
curl -X PUT http://localhost:3000/api/productos/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"nombre":"Laptop Gamer Nitro","precio":1199.99,"categoria":"Computadoras"}'

# Eliminar
curl -X DELETE http://localhost:3000/api/productos/1 \
  -H "Authorization: Bearer <TOKEN>"
```

## Despliegue en Render

El proyecto incluye `render.yaml` (blueprint) para desplegarse con la configuración correcta:

1. Sube este repositorio a GitHub (rama `main`).
2. En [render.com](https://render.com) inicia sesión con GitHub → **New +** → **Blueprint** (o Web Service) → elige el repositorio.
3. Render detecta `render.yaml` automáticamente: instala dependencias (`npm install`), arranca con `npm start` y genera un `JWT_SECRET` seguro.
4. Obtendrás una URL tipo `https://api-catalogo-productos.onrender.com`.

**Notas del plan gratuito:** la instancia se duerme tras 15 min sin tráfico (la primera petición tarda ~1 min en despertar) y el sistema de archivos es efímero: los cambios en el catálogo vuelven a los 5 productos semilla al reiniciar o redesplegar.

## Cumplimiento de la rúbrica

| Criterio | Cómo se cumple |
|----------|----------------|
| CRUD completo y funcional (30 %) | Las 6 rutas operan sobre `data/productos.json` con ids autoincrementales |
| Validación y códigos HTTP (20 %) | `express-validator` + `ApiError`; 400/401/404/409/201/204 según el caso |
| CORS y JWT (20 %) | Paquete `cors` configurado por `.env` y middleware `requireAuth` que firma/verifica con `jsonwebtoken` |
| Estructura por capas (15 %) | `routes → controllers → services → models`, con config, middlewares y validadores separados |
| Colección de pruebas (15 %) | Colección de Postman con tests automáticos para todos los casos |
