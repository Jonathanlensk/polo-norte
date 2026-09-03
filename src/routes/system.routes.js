const express = require("express");
const db = require("../../database/db");

const router = express.Router();

router.get("/api/health", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT NOW() AS database_time"
    );

    res.json({
      ok: true,
      service: "Polo Norte Bebidas API",

      database: {
        connected: true,
        time: result.rows[0].database_time
      },

      mercadoPagoConfigured: Boolean(
        process.env.MERCADO_PAGO_ACCESS_TOKEN
      ),
      mercadoPagoPublicKeyConfigured: Boolean(
        String(process.env.MERCADO_PAGO_PUBLIC_KEY || "").trim() &&
        !/COLOQUE|SUA_PUBLIC_KEY|PUBLIC_KEY_AQUI/i.test(
          String(process.env.MERCADO_PAGO_PUBLIC_KEY || "")
        )
      )
    });

  } catch (error) {
    console.error("Erro PostgreSQL:", error);

    res.status(500).json({
      ok: false,
      service: "Polo Norte Bebidas API",

      database: {
        connected: false
      },

      message: "Não foi possível conectar ao PostgreSQL."
    });
  }
});


// =========================
// CONFIG
// =========================

function publicKeyConfigured() {
  const key = String(
    process.env.MERCADO_PAGO_PUBLIC_KEY || ""
  ).trim();

  return Boolean(
    key &&
    key.length >= 20 &&
    !/COLOQUE|SUA_PUBLIC_KEY|PUBLIC_KEY_AQUI/i.test(key)
  );
}

router.get("/api/config", (req, res) => {
  const configured = publicKeyConfigured();

  res.json({
    publicKey: configured
      ? String(process.env.MERCADO_PAGO_PUBLIC_KEY).trim()
      : "",
    publicKeyConfigured: configured
  });
});

module.exports = router;
