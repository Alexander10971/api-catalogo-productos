/**
 * Punto de entrada: levanta el servidor HTTP.
 */
const app = require('./app');
const config = require('./config/env');

app.listen(config.port, () => {
  console.log('==========================================');
  console.log(' API REST - Catálogo de productos');
  console.log(` Servidor:  http://localhost:${config.port}`);
  console.log(` Entorno:   ${config.nodeEnv}`);
  console.log('==========================================');
});
