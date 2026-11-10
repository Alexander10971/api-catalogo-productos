/**
 * CAPA DE NEGOCIO (servicio) - Autenticación.
 * Genera y verifica tokens JWT.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/apiError');

const USUARIOS_FILE = path.join(__dirname, '..', '..', 'data', 'usuarios.json');

/** Hash SHA-256 de la contraseña (no guardamos texto plano). */
function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

/** Primer arranque: crea data/usuarios.json con el usuario admin. */
function leerUsuarios() {
  if (!fs.existsSync(USUARIOS_FILE)) {
    const iniciales = [
      {
        id: 1,
        usuario: 'admin',
        nombre: 'Administrador',
        passwordHash: hashPassword('admin123'),
      },
    ];
    fs.mkdirSync(path.dirname(USUARIOS_FILE), { recursive: true });
    fs.writeFileSync(USUARIOS_FILE, JSON.stringify(iniciales, null, 2), 'utf8');
    return iniciales;
  }
  return JSON.parse(fs.readFileSync(USUARIOS_FILE, 'utf8'));
}

/** Valida credenciales y devuelve el token JWT firmado. */
function login(usuario, password) {
  const usuarios = leerUsuarios();
  const encontrado = usuarios.find((u) => u.usuario === usuario);

  if (!encontrado || encontrado.passwordHash !== hashPassword(password)) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  const payload = {
    sub: encontrado.id,
    usuario: encontrado.usuario,
    nombre: encontrado.nombre,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpires });

  return {
    token,
    tipo: 'Bearer',
    expiraEn: config.jwtExpires,
    usuario: {
      id: encontrado.id,
      usuario: encontrado.usuario,
      nombre: encontrado.nombre,
    },
  };
}

module.exports = { login };
