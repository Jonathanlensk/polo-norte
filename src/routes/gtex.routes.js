const express = require("express");
const db = require("../../database/db");
const { autenticarAdmin, exigirGerente } = require("../middleware/admin-auth.middleware");
const { getGtexConfigStatus, testConnection } = require("../services/gtex.service");
const {
  ensureGtexSchema,
  syncProductFromGtex,
  syncFullCatalogFromGtex,
  syncOrderToGtex
} = require("../services/gtex-sync.service");

const router = express.Router();

router.get(
  "/api/admin/gtex/status",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await ensureGtexSchema();
      const config = getGtexConfigStatus();
      const mapped = await db.query(`
        SELECT COUNT(*)::int AS total
        FROM products
        WHERE gtex_codprod IS NOT NULL AND gtex_codprod > 0
      `);

      return res.json({
        ok: true,
        gtex: {
          ...config,
          baseUrl: config.baseUrl || null,
          mappedProducts: Number(mapped.rows[0]?.total || 0)
        }
      });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, message: error.message });
    }
  }
);

router.post(
  "/api/admin/gtex/test",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      const result = await testConnection();
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, message: error.message });
    }
  }
);

router.post(
  "/api/admin/gtex/products/:id/sync",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, message: "Produto inválido." });
      }
      const product = await syncProductFromGtex(id);
      return res.json({ ok: true, product });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, message: error.message });
    }
  }
);

router.post(
  "/api/admin/gtex/sync-all",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      const summary = await syncFullCatalogFromGtex();
      return res.json({ ok: true, summary });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, message: error.message });
    }
  }
);

router.post(
  "/api/admin/gtex/orders/:id/sync",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, message: "Pedido inválido." });
      }
      const result = await syncOrderToGtex(id, { force: Boolean(req.body?.force) });
      return res.json({ ok: true, result });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, message: error.message });
    }
  }
);

module.exports = router;
