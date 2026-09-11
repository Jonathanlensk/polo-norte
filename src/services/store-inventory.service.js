const db = require("../../database/db");

const STORE_UNITS = [
  { id: "julio", name: "Júlio de Mesquita" },
  { id: "vila", name: "Vila Helena" },
  { id: "divino", name: "Largo do Divino" }
];

const STORE_IDS = new Set(STORE_UNITS.map((unit) => unit.id));
let schemaReadyPromise = null;

function normalizeStoreId(value) {
  return String(value || "").trim().toLowerCase();
}

function assertStoreId(value) {
  const storeId = normalizeStoreId(value);
  if (!STORE_IDS.has(storeId)) {
    const error = new Error("Unidade inválida.");
    error.status = 400;
    throw error;
  }
  return storeId;
}

function parseStockValue(value) {
  const stock = Number(value);
  if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) {
    const error = new Error("Quantidade de estoque inválida.");
    error.status = 400;
    throw error;
  }
  return stock;
}

function normalizeProductInventory(input = {}) {
  const source = input && typeof input === "object" ? input : {};

  return Object.fromEntries(
    STORE_UNITS.map((unit) => {
      const entry = source[unit.id] && typeof source[unit.id] === "object"
        ? source[unit.id]
        : {};

      return [
        unit.id,
        {
          stockQuantity: parseStockValue(entry.stockQuantity ?? 0),
          active: entry.active !== false
        }
      ];
    })
  );
}

async function ensureStoreInventorySchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await db.query(`
        ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS unit_id VARCHAR(30)
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS store_product_stock (
          store_id VARCHAR(30) NOT NULL,
          product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (store_id, product_id)
        )
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_store_product_stock_product
        ON store_product_stock(product_id)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_store_product_stock_store
        ON store_product_stock(store_id)
      `);

      // Migração compatível com o estoque único existente: cada unidade começa
      // com a quantidade que o produto possuía antes. Depois disso cada loja
      // passa a ser administrada separadamente.
      await db.query(`
        INSERT INTO store_product_stock (
          store_id,
          product_id,
          stock_quantity,
          active
        )
        SELECT
          unit.store_id,
          p.id,
          GREATEST(COALESCE(p.stock_quantity, 0), 0),
          TRUE
        FROM products p
        CROSS JOIN (
          VALUES ('julio'), ('vila'), ('divino')
        ) AS unit(store_id)
        ON CONFLICT (store_id, product_id) DO NOTHING
      `);
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}


async function syncLegacyProductStock(productId, client = db) {
  await client.query(
    `
      UPDATE products p
      SET stock_quantity = COALESCE((
        SELECT SUM(s.stock_quantity)::int
        FROM store_product_stock s
        WHERE s.product_id = p.id
      ), 0),
      updated_at = NOW()
      WHERE p.id = $1
    `,
    [productId]
  );
}

async function setProductInventory(productId, input, client = db) {
  await ensureStoreInventorySchema();
  const inventory = normalizeProductInventory(input);

  for (const unit of STORE_UNITS) {
    const entry = inventory[unit.id];
    await client.query(
      `
        INSERT INTO store_product_stock (
          store_id,
          product_id,
          stock_quantity,
          active,
          updated_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (store_id, product_id)
        DO UPDATE SET
          stock_quantity = EXCLUDED.stock_quantity,
          active = EXCLUDED.active,
          updated_at = NOW()
      `,
      [unit.id, productId, entry.stockQuantity, entry.active]
    );
  }

  await syncLegacyProductStock(productId, client);
  return inventory;
}

async function updateProductUnitInventory(productId, storeId, input, client = db) {
  await ensureStoreInventorySchema();
  const normalizedStoreId = assertStoreId(storeId);
  const stockQuantity = parseStockValue(input?.stockQuantity);
  const active = input?.active !== false;

  const productResult = await client.query(
    `SELECT id FROM products WHERE id = $1 LIMIT 1`,
    [productId]
  );

  if (!productResult.rows.length) {
    const error = new Error("Produto não encontrado.");
    error.status = 404;
    throw error;
  }

  const result = await client.query(
    `
      INSERT INTO store_product_stock (
        store_id,
        product_id,
        stock_quantity,
        active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (store_id, product_id)
      DO UPDATE SET
        stock_quantity = EXCLUDED.stock_quantity,
        active = EXCLUDED.active,
        updated_at = NOW()
      RETURNING store_id, product_id, stock_quantity, active
    `,
    [normalizedStoreId, productId, stockQuantity, active]
  );

  await syncLegacyProductStock(productId, client);

  return {
    storeId: result.rows[0].store_id,
    productId: Number(result.rows[0].product_id),
    stockQuantity: Number(result.rows[0].stock_quantity),
    active: Boolean(result.rows[0].active)
  };
}

module.exports = {
  STORE_UNITS,
  STORE_IDS,
  normalizeStoreId,
  assertStoreId,
  normalizeProductInventory,
  ensureStoreInventorySchema,
  syncLegacyProductStock,
  setProductInventory,
  updateProductUnitInventory
};
