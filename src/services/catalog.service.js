const db = require("../../database/db");

let schemaReadyPromise = null;

function promotionCondition(alias = "p") {
  return `
    ${alias}.promotion_active = TRUE
    AND ${alias}.promotion_price IS NOT NULL
    AND ${alias}.promotion_price >= 0
    AND ${alias}.promotion_price < ${alias}.price
    AND (${alias}.promotion_starts_at IS NULL OR ${alias}.promotion_starts_at <= NOW())
    AND (${alias}.promotion_ends_at IS NULL OR ${alias}.promotion_ends_at >= NOW())
  `;
}

async function ensureCatalogSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await db.query(`
        ALTER TABLE products
          ADD COLUMN IF NOT EXISTS promotion_price NUMERIC(10,2)
            CHECK (promotion_price IS NULL OR promotion_price >= 0),
          ADD COLUMN IF NOT EXISTS promotion_active BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS promotion_starts_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS promotion_ends_at TIMESTAMPTZ
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS product_categories (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_name_unique
        ON product_categories (LOWER(name))
      `);

      await db.query(`
        INSERT INTO product_categories (name)
        SELECT DISTINCT TRIM(p.category)
        FROM products p
        WHERE p.category IS NOT NULL
          AND TRIM(p.category) <> ''
          AND NOT EXISTS (
            SELECT 1
            FROM product_categories c
            WHERE LOWER(c.name) = LOWER(TRIM(p.category))
          )
      `);
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

async function ensureCategory(name) {
  const category = String(name || "").trim();

  if (!category) {
    throw new Error("Informe a categoria do produto.");
  }

  await ensureCatalogSchema();

  const existing = await db.query(
    `
      SELECT id, name, active, sort_order
      FROM product_categories
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
    `,
    [category]
  );

  if (existing.rows.length) {
    if (!existing.rows[0].active) {
      await db.query(
        `UPDATE product_categories SET active = TRUE, updated_at = NOW() WHERE id = $1`,
        [existing.rows[0].id]
      );
    }

    return existing.rows[0];
  }

  const inserted = await db.query(
    `
      INSERT INTO product_categories (name)
      VALUES ($1)
      RETURNING id, name, active, sort_order
    `,
    [category]
  );

  return inserted.rows[0];
}

async function listActiveCategories() {
  await ensureCatalogSchema();

  const result = await db.query(`
    SELECT id, name, active, sort_order
    FROM product_categories
    WHERE active = TRUE
    ORDER BY sort_order ASC, name ASC
  `);

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0)
  }));
}

module.exports = {
  ensureCatalogSchema,
  ensureCategory,
  listActiveCategories,
  promotionCondition
};
