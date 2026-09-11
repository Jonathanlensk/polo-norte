const jwt = require("jsonwebtoken");
const db = require("../../database/db");
const { ensureAdminSchema } = require("../services/admin-users.service");

const ADMIN_AUTH_COOKIE = "polo_norte_admin_token";

function normalizarPerfilAdmin(role) {
  const valor = String(role || "").trim().toLowerCase();

  // Compatibilidade com administradores antigos.
  if (["manager", "gerente", "admin"].includes(valor)) {
    return "manager";
  }

  return "operator";
}

function criarTokenAdmin(admin) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não configurado.");
  }

  return jwt.sign(
    { tipo: "admin" },
    process.env.JWT_SECRET,
    {
      subject: String(admin.id),
      expiresIn: "8h"
    }
  );
}

function salvarCookieAdmin(res, token) {
  res.cookie(ADMIN_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/"
  });
}

function limparCookieAdmin(res) {
  res.clearCookie(ADMIN_AUTH_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

async function autenticarAdmin(req, res, next) {
  try {
    await ensureAdminSchema();
    const token = req.cookies?.[ADMIN_AUTH_COOKIE];

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: "Administrador não autenticado."
      });
    }

    const dados = jwt.verify(token, process.env.JWT_SECRET);

    if (dados.tipo !== "admin") {
      return res.status(401).json({
        ok: false,
        message: "Sessão administrativa inválida."
      });
    }

    // Confere o usuário no banco em cada requisição administrativa.
    // Assim desativação e troca de perfil passam a valer imediatamente,
    // mesmo que exista um cookie antigo no navegador.
    const result = await db.query(
      `SELECT id, role, unit_id, active FROM admins WHERE id = $1 LIMIT 1`,
      [dados.sub]
    );

    const admin = result.rows[0];

    if (!admin || !admin.active) {
      limparCookieAdmin(res);
      return res.status(401).json({
        ok: false,
        message: "Acesso administrativo desativado ou inválido."
      });
    }

    req.adminId = String(admin.id);
    req.adminRole = normalizarPerfilAdmin(admin.role);
    req.adminUnitId = admin.unit_id || null;
    next();
  } catch (error) {
    limparCookieAdmin(res);
    return res.status(401).json({
      ok: false,
      message: "Sessão administrativa inválida ou expirada."
    });
  }
}

function exigirGerente(req, res, next) {
  if (normalizarPerfilAdmin(req.adminRole) !== "manager") {
    return res.status(403).json({
      ok: false,
      message: "Acesso permitido somente para gerente."
    });
  }

  next();
}

module.exports = {
  ADMIN_AUTH_COOKIE,
  normalizarPerfilAdmin,
  criarTokenAdmin,
  salvarCookieAdmin,
  limparCookieAdmin,
  autenticarAdmin,
  exigirGerente
};
