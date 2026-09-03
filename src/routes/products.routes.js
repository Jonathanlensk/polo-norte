const express = require("express");
const db = require("../../database/db");

const router = express.Router();

router.get("/api/products", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        name AS nome,
        description AS detalhe,
        category AS categoria,
        price::float AS preco,
        stock_quantity AS estoque,
        image_url AS imagem,
        active AS ativo
      FROM products
      WHERE active = TRUE
      ORDER BY id
    `);

    res.json({
      ok: true,
      products: result.rows
    });

  } catch (error) {
    console.error("GET /api/products:", error);

    res.status(500).json({
      ok: false,
      message: "Erro ao buscar produtos."
    });
  }
});

module.exports = router;
