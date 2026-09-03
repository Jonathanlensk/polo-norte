const jwt = require("jsonwebtoken");

const AUTH_COOKIE = "polo_norte_token";

function criarTokenCliente(clienteId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não configurado.");
  }

  return jwt.sign(
    {
      tipo: "cliente"
    },
    process.env.JWT_SECRET,
    {
      subject: String(clienteId),
      expiresIn: "30d"
    }
  );
}

function salvarCookieLogin(res, token) {
  res.cookie(
    AUTH_COOKIE,
    token,
    {
      httpOnly: true,
      sameSite: "lax",

      secure:
        process.env.NODE_ENV === "production",

      maxAge:
        30 * 24 * 60 * 60 * 1000,

      path: "/"
    }
  );
}

function autenticarCliente(req, res, next) {
  try {
    const token =
      req.cookies?.[AUTH_COOKIE];

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: "Cliente não autenticado."
      });
    }

    const dados = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (dados.tipo !== "cliente") {
      return res.status(401).json({
        ok: false,
        message: "Sessão inválida."
      });
    }

    req.customerId = dados.sub;

    next();

  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: "Sessão inválida ou expirada."
    });
  }
}
function identificarClienteOpcional(req, res, next) {
  try {
    const token =
      req.cookies?.[AUTH_COOKIE];

    // Sem login: continua como visitante
    if (!token) {
      req.customerId = null;
      return next();
    }

    const dados = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Cookie existe, mas não é de cliente
    if (dados.tipo !== "cliente") {
      req.customerId = null;
      return next();
    }

    // Cliente logado
    req.customerId = dados.sub;

    next();

  } catch (error) {
    // Token inválido/expirado:
    // não bloqueia a compra como visitante
    req.customerId = null;
    next();
  }

}

module.exports = {
  AUTH_COOKIE,
  criarTokenCliente,
  salvarCookieLogin,
  autenticarCliente,
  identificarClienteOpcional
};
