/**
 * Aplicación Express: CORS, JSON, rutas y manejo de errores.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const routes = require('./routes');
const { errorMiddleware } = require('./middlewares/error.middleware');

const app = express();

// --- CORS (habilitado para peticiones desde otros orígenes) ---
app.use(cors({ origin: config.corsOrigin }));

// --- Body parser JSON ---
app.use(express.json());

// --- Panel web (formulario CRUD): sirve la carpeta public/ ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Rutas de la API ---
app.use('/api', routes);

// --- 404 para rutas que no existen ---
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: { mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
});

// --- Manejador central de errores ---
app.use(errorMiddleware);

module.exports = app;
