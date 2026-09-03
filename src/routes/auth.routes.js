const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../../database/db");
const {
  AUTH_COOKIE,
  criarTokenCliente,
  salvarCookieLogin,
  autenticarCliente
} = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/api/auth/register", async (req, res) => {
  try {
    const {
      nome,
      email,
      whatsapp,
      senha
    } = req.body;

    const nomeLimpo =
      String(nome || "").trim();

    const emailLimpo =
      String(email || "")
        .trim()
        .toLowerCase();

    const telefoneLimpo =
      String(whatsapp || "")
        .replace(/\D/g, "");

    const senhaLimpa =
      String(senha || "");

    if (nomeLimpo.length < 2) {
      return res.status(400).json({
        message: "Informe seu nome."
      });
    }

    if (
      !/^\S+@\S+\.\S+$/.test(emailLimpo)
    ) {
      return res.status(400).json({
        message: "Informe um e-mail válido."
      });
    }

    if (
      telefoneLimpo.length < 10 ||
      telefoneLimpo.length > 11
    ) {
      return res.status(400).json({
        message: "Informe um WhatsApp válido."
      });
    }

    if (senhaLimpa.length < 8) {
      return res.status(400).json({
        message:
          "A senha deve ter pelo menos 8 caracteres."
      });
    }

    const existente =
      await db.query(
        `
          SELECT id
          FROM customers
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [emailLimpo]
      );

    if (existente.rows.length) {
      return res.status(409).json({
        message:
          "Já existe uma conta com este e-mail."
      });
    }

    const passwordHash =
      await bcrypt.hash(
        senhaLimpa,
        12
      );

    const resultado =
      await db.query(
        `
          INSERT INTO customers (
            name,
            email,
            phone,
            password_hash
          )
          VALUES ($1, $2, $3, $4)

          RETURNING
            id,
            name,
            email,
            phone
        `,
        [
          nomeLimpo,
          emailLimpo,
          telefoneLimpo,
          passwordHash
        ]
      );

    const cliente =
      resultado.rows[0];

    const token =
      criarTokenCliente(cliente.id);

    salvarCookieLogin(
      res,
      token
    );

    return res.status(201).json({
      ok: true,

      cliente: {
        id: cliente.id,
        nome: cliente.name,
        email: cliente.email,
        whatsapp: cliente.phone
      }
    });

  } catch (error) {
    console.error(
      "POST /api/auth/register:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Já existe uma conta com este e-mail."
      });
    }

    return res.status(500).json({
      message:
        "Erro ao criar conta."
    });
  }
});


// =========================
// LOGIN
// =========================

router.post("/api/auth/login", async (req, res) => {
  try {
    const email =
      String(req.body?.email || "")
        .trim()
        .toLowerCase();

    const senha =
      String(req.body?.senha || "");

    if (!email || !senha) {
      return res.status(400).json({
        message:
          "Informe e-mail e senha."
      });
    }

    const resultado =
      await db.query(
        `
          SELECT
            id,
            name,
            email,
            phone,
            password_hash,
            active
          FROM customers
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [email]
      );

    const cliente =
      resultado.rows[0];

    if (!cliente) {
      return res.status(401).json({
        message:
          "E-mail ou senha incorretos."
      });
    }

    if (!cliente.active) {
      return res.status(403).json({
        message:
          "Esta conta está desativada."
      });
    }

    const senhaCorreta =
      await bcrypt.compare(
        senha,
        cliente.password_hash
      );

    if (!senhaCorreta) {
      return res.status(401).json({
        message:
          "E-mail ou senha incorretos."
      });
    }

    const token =
      criarTokenCliente(cliente.id);

    salvarCookieLogin(
      res,
      token
    );

    return res.json({
      ok: true,

      cliente: {
        id: cliente.id,
        nome: cliente.name,
        email: cliente.email,
        whatsapp: cliente.phone
      }
    });

  } catch (error) {
    console.error(
      "POST /api/auth/login:",
      error
    );

    return res.status(500).json({
      message:
        "Erro ao entrar na conta."
    });
  }
});


// =========================
// CLIENTE LOGADO
// =========================

router.get(
  "/api/auth/me",
  autenticarCliente,
  async (req, res) => {
    try {
      const resultado =
        await db.query(
          `
            SELECT
              id,
              name,
              email,
              phone
            FROM customers
            WHERE id = $1
              AND active = TRUE
            LIMIT 1
          `,
          [req.customerId]
        );

      const cliente =
        resultado.rows[0];

      if (!cliente) {
        return res.status(404).json({
          message:
            "Cliente não encontrado."
        });
      }

      return res.json({
        ok: true,

        cliente: {
          id: cliente.id,
          nome: cliente.name,
          email: cliente.email,
          whatsapp: cliente.phone
        }
      });

    } catch (error) {
      console.error(
        "GET /api/auth/me:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao carregar cliente."
      });
    }
  }
);


// =========================
// LOGOUT
// =========================

router.post("/api/auth/logout", (req, res) => {

  res.clearCookie(
    AUTH_COOKIE,
    {
      httpOnly: true,
      sameSite: "lax",

      secure:
        process.env.NODE_ENV === "production",

      path: "/"
    }
  );

  return res.json({
    ok: true,
    message: "Logout realizado."
  });
});

module.exports = router;
