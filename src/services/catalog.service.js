const db = require("../../database/db");

let schemaReadyPromise = null;

const CATEGORY_ICON_KEYS = new Set([
  "presente",
  "caneca",
  "garrafa",
  "taca",
  "lata",
  "copo",
  "gota",
  "floco",
  "raio",
  "snack",
  "doce",
  "fogo",
  "caixa"
]);

const DEFAULT_CATEGORY_ICONS = new Map([
  ["cervejas", "caneca"],
  ["destilados", "garrafa"],
  ["vinhos", "taca"],
  ["refrigerantes", "lata"],
  ["energeticos", "raio"],
  ["aguas", "gota"],
  ["gelo", "floco"],
  ["sucos", "copo"],
  ["combos", "presente"],
  ["snacks", "snack"],
  ["salgadinho", "snack"],
  ["salgadinhos", "snack"],
  ["doces", "doce"],
  ["balas", "doce"],
  ["chicletes", "doce"],
  ["balas e chicletes", "doce"],
  ["balas, chicletes e doces", "doce"],
  ["carvao", "fogo"]
]);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function defaultCategoryIcon(name) {
  return DEFAULT_CATEGORY_ICONS.get(normalizeText(name)) || "presente";
}

function isCategoryIconKey(iconKey) {
  return CATEGORY_ICON_KEYS.has(String(iconKey || "").trim().toLowerCase());
}

function normalizeCategoryIcon(iconKey, categoryName = "") {
  const value = String(iconKey || "").trim().toLowerCase();
  return isCategoryIconKey(value) ? value : defaultCategoryIcon(categoryName);
}

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
          icon_key VARCHAR(40),
          active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await db.query(`
        ALTER TABLE product_categories
          ADD COLUMN IF NOT EXISTS icon_key VARCHAR(40)
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

      await db.query(`
        UPDATE product_categories
        SET icon_key = CASE
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'cervejas' THEN 'caneca'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'destilados' THEN 'garrafa'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'vinhos' THEN 'taca'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'refrigerantes' THEN 'lata'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'energeticos' THEN 'raio'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'aguas' THEN 'gota'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'gelo' THEN 'floco'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'sucos' THEN 'copo'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'combos' THEN 'presente'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'snacks' THEN 'snack'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) IN ('salgadinho', 'salgadinhos') THEN 'snack'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) IN ('doces', 'balas', 'chicletes', 'balas e chicletes', 'balas, chicletes e doces') THEN 'doce'
          WHEN LOWER(TRANSLATE(name, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) = 'carvao' THEN 'fogo'
          ELSE 'presente'
        END
        WHERE icon_key IS NULL OR TRIM(icon_key) = ''
      `);

      await db.query(`
        ALTER TABLE product_categories
          ALTER COLUMN icon_key SET DEFAULT 'presente',
          ALTER COLUMN icon_key SET NOT NULL
      `);

    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

async function ensureCategory(name, iconKey = null) {
  const category = String(name || "").trim();

  if (!category) {
    throw new Error("Informe a categoria do produto.");
  }

  await ensureCatalogSchema();

  const selectedIcon = iconKey == null
    ? null
    : normalizeCategoryIcon(iconKey, category);

  const existing = await db.query(
    `
      SELECT id, name, icon_key, active, sort_order
      FROM product_categories
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
    `,
    [category]
  );

  if (existing.rows.length) {
    const current = existing.rows[0];

    if (!current.active || selectedIcon) {
      const updated = await db.query(
        `
          UPDATE product_categories
          SET
            active = TRUE,
            icon_key = COALESCE($2, icon_key),
            updated_at = NOW()
          WHERE id = $1
          RETURNING id, name, icon_key, active, sort_order
        `,
        [current.id, selectedIcon]
      );

      return updated.rows[0];
    }

    return current;
  }

  const inserted = await db.query(
    `
      INSERT INTO product_categories (name, icon_key)
      VALUES ($1, $2)
      RETURNING id, name, icon_key, active, sort_order
    `,
    [category, selectedIcon || defaultCategoryIcon(category)]
  );

  return inserted.rows[0];
}

async function updateCategoryIcon(id, iconKey) {
  await ensureCatalogSchema();

  const categoryId = Number(id);
  const normalizedIcon = String(iconKey || "").trim().toLowerCase();

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    const error = new Error("Categoria inválida.");
    error.status = 400;
    throw error;
  }

  if (!isCategoryIconKey(normalizedIcon)) {
    const error = new Error("Selecione um ícone válido para a categoria.");
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `
      UPDATE product_categories
      SET icon_key = $2, updated_at = NOW()
      WHERE id = $1 AND active = TRUE
      RETURNING id, name, icon_key, active, sort_order
    `,
    [categoryId, normalizedIcon]
  );

  if (!result.rows.length) {
    const error = new Error("Categoria não encontrada.");
    error.status = 404;
    throw error;
  }

  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: row.name,
    icon: row.icon_key || "presente",
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0)
  };
}

async function listActiveCategories() {
  await ensureCatalogSchema();

  const result = await db.query(`
    SELECT id, name, icon_key, active, sort_order
    FROM product_categories
    WHERE active = TRUE
    ORDER BY sort_order ASC, name ASC
  `);

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    icon: row.icon_key || defaultCategoryIcon(row.name),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0)
  }));
}

module.exports = {
  ensureCatalogSchema,
  ensureCategory,
  updateCategoryIcon,
  listActiveCategories,
  isCategoryIconKey,
  promotionCondition
};
