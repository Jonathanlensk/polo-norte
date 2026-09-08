const express = require("express");
const { quoteDelivery } = require("../services/delivery.service");

const router = express.Router();

router.post("/api/delivery/quote", async (req, res) => {
  try {
    const { unidadeId, endereco } = req.body || {};

    if (!unidadeId) {
      return res.status(400).json({
        message: "Selecione uma unidade para calcular a entrega."
      });
    }

    const required = ["rua", "numero", "bairro", "cidade", "uf"];
    const invalid = required.some(field => !String(endereco?.[field] || "").trim());

    if (invalid) {
      return res.status(400).json({
        message: "Preencha rua, número, bairro, cidade e UF para calcular a entrega."
      });
    }

    const quote = await quoteDelivery(unidadeId, endereco);

    res.json({
      ok: true,
      quote
    });
  } catch (error) {
    console.error("POST /api/delivery/quote:", error);

    res.status(error.status || 500).json({
      message:
        error.message ||
        "Não foi possível calcular a entrega agora.",
      code: error.code || null
    });
  }
});

module.exports = router;
