const express = require("express");
const db = require("../../database/db");
const {
  ensureCatalogSchema,
  listActiveCategories,
  promotionCondition
} = require("../services/catalog.service");

const router = express.Router();

router.get("/api/products", async (req, res) => {
  try {
    // Catálogo muda em tempo real pelo painel do gerente.
    // Evita que navegador/proxy mantenha preço ou promoção antiga em cache.
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    await ensureCatalogSchema();

    const promo = promotionCondition("p");

    const [result, categories] = await Promise.all([
      db.query(`
        SELECT
          p.id,
          p.name AS nome,
          p.description AS detalhe,
          p.category AS categoria,
          CASE WHEN ${promo}
            THEN p.promotion_price::float
            ELSE p.price::float
          END AS preco,
          CASE WHEN ${promo}
            THEN p.price::float
            ELSE NULL
          END AS "precoOriginal",
          p.stock_quantity AS estoque,
          p.image_url AS imagem,
          p.active AS ativo,
          CASE WHEN ${promo} THEN TRUE ELSE FALSE END AS "emPromocao"
        FROM products p
        WHERE p.active = TRUE
        ORDER BY p.id
      `),
      listActiveCategories()
    ]);

    res.json({
      ok: true,
      products: result.rows,
      categories: categories.map((category) => category.name)
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
