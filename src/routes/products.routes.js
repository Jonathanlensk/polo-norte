const express = require("express");
const db = require("../../database/db");
const {
  ensureCatalogSchema,
  listActiveCategories,
  promotionCondition
} = require("../services/catalog.service");
const {
  STORE_IDS,
  normalizeStoreId,
  ensureStoreInventorySchema
} = require("../services/store-inventory.service");

const router = express.Router();

router.get("/api/products", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    await Promise.all([
      ensureCatalogSchema(),
      ensureStoreInventorySchema()
    ]);

    const requestedUnitId = normalizeStoreId(req.query?.unitId);

    if (req.query?.unitId && !STORE_IDS.has(requestedUnitId)) {
      return res.status(400).json({
        ok: false,
        message: "Unidade inválida."
      });
    }

    const unitId = STORE_IDS.has(requestedUnitId) ? requestedUnitId : null;
    const promo = promotionCondition("p");

    const inventoryJoin = unitId
      ? `LEFT JOIN store_product_stock s
           ON s.product_id = p.id
          AND s.store_id = $1`
      : `LEFT JOIN LATERAL (
           SELECT
             COALESCE(SUM(sp.stock_quantity), 0)::int AS stock_quantity,
             BOOL_OR(sp.active) AS active
           FROM store_product_stock sp
           WHERE sp.product_id = p.id
         ) s ON TRUE`;

    const resultPromise = db.query(
      `
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
          COALESCE(s.stock_quantity, 0)::int AS estoque,
          p.image_url AS imagem,
          p.active AS ativo,
          COALESCE(s.active, FALSE) AS "disponivelNaUnidade",
          CASE WHEN ${promo} THEN TRUE ELSE FALSE END AS "emPromocao"
        FROM products p
        ${inventoryJoin}
        WHERE p.active = TRUE
        ORDER BY p.id
      `,
      unitId ? [unitId] : []
    );

    const [result, categories] = await Promise.all([
      resultPromise,
      listActiveCategories()
    ]);

    res.json({
      ok: true,
      unitId,
      products: result.rows,
      categories: categories.map((category) => category.name),
      categoryDetails: categories.map((category) => ({
        name: category.name,
        icon: category.icon
      }))
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
