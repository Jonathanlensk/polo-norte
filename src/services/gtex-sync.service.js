const db = require("../../database/db");
const {
  UNIT_TO_FILIAL,
  getGtexConfigStatus,
  filialForUnit,
  paymentConfig,
  getProductByCodprod,
  getProductsByRange,
  getStockByProduct,
  getStocksByRange,
  getPricesByProduct,
  getPricesByRange,
  insertOrder
} = require("./gtex.service");
const { ensureCategory, listManuallyDeletedCategoryNames } = require("./catalog.service");
const { syncLegacyProductStock } = require("./store-inventory.service");

let schemaReadyPromise = null;
let scheduler = null;
let syncRunning = false;

function text(value) {
  return String(value == null ? "" : value).trim();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeText(value) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatGtexDate(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}:${map.second}`;
}

function catalogStartDate() {
  return text(process.env.GTEX_CATALOG_START_DATE || "01/01/2000 00:00:00");
}

function overlapMinutes() {
  const value = Number(process.env.GTEX_SYNC_OVERLAP_MINUTES || 15);
  return Number.isFinite(value) && value >= 0 ? Math.min(value, 1440) : 15;
}

function isDeletedGtexRow(row) {
  return Boolean(text(row?.DTEXCLUSAO));
}

function inferCategory(row) {
  const source = normalizeText([
    row?.DESCRICAO,
    row?.SECAO,
    row?.DEPARTAMENTO,
    row?.MARCA
  ].filter(Boolean).join(" "));

  const rules = [
    ["Cervejas", /\b(cerveja|chopp|chope|beer|pilsen|lager|ipa)\b/],
    ["Energéticos", /\b(energetico|energy|red bull|monster)\b/],
    ["Refrigerantes", /\b(refrigerante|coca[ -]?cola|guarana|fanta|sprite|pepsi|soda)\b/],
    ["Águas", /\b(agua mineral|agua sem gas|agua com gas|agua 500|agua 1,?5)\b/],
    ["Vinhos", /\b(vinho|espumante|champagne|prosecco)\b/],
    ["Destilados", /\b(vodka|whisk(?:y|ey)|gin|cachaca|rum|tequila|licor|conhaque|bourbon)\b/],
    ["Sucos", /\b(suco|nectar|agua de coco|cha pronto)\b/],
    ["Gelo", /\b(gelo)\b/],
    ["Carvão", /\b(carvao)\b/],
    ["Salgadinhos", /\b(salgadinho|chips|batata|doritos|cheetos|ruffles|amendoim|snack)\b/],
    ["Doces", /\b(chocolate|bombom|bala|chiclete|doce|paçoca|pacoca|bomboniere)\b/]
  ];

  for (const [category, pattern] of rules) {
    if (pattern.test(source)) return category;
  }

  return "Outros";
}

function looseText(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberTokens(value) {
  return new Set((looseText(value).match(/\b\d+(?:[.,]\d+)?\b/g) || []).map((item) => item.replace(",", ".")));
}

function likelySameManualProduct(local, gtexName) {
  const localName = looseText(local?.name);
  const sourceName = looseText(gtexName);
  if (!localName || localName.length < 4 || !sourceName.includes(localName)) return false;

  const localNumbers = numberTokens(local?.description);
  if (!localNumbers.size) return true;
  const sourceNumbers = numberTokens(gtexName);
  return [...localNumbers].some((token) => sourceNumbers.has(token));
}

function buildProductDescription(row) {
  const pieces = [];
  const embalagem = text(row?.EMBALAGEM);
  const unidade = text(row?.UNIDADE);
  const marca = text(row?.MARCA);

  if (embalagem) pieces.push(embalagem);
  if (unidade && !pieces.some((item) => normalizeText(item) === normalizeText(unidade))) {
    pieces.push(`Unidade: ${unidade}`);
  }
  if (marca && normalizeText(marca) !== "sem marca") {
    pieces.push(`Marca: ${marca}`);
  }

  return pieces.join(" · ").slice(0, 500);
}

function productRowScore(row) {
  let score = 0;
  const qtunit = numberOrNull(row?.QTUNIT);
  const embalagem = normalizeText(row?.EMBALAGEM);
  const unidade = normalizeText(row?.UNIDADE);
  const codbarra = text(row?.CODBARRA);
  const codprod = text(row?.CODPROD);

  if (!isDeletedGtexRow(row)) score += 1000;
  if (qtunit === 1) score += 100;
  if (/^(1x1|1 x 1|unitario|unitario)$/i.test(embalagem)) score += 30;
  if (codbarra && codbarra !== codprod) score += 20;
  if (["un", "und", "pc", "pct", "lt", "gar", "gf"].includes(unidade)) score += 10;
  if (text(row?.DESCRICAO)) score += 5;
  return score;
}

function selectCanonicalProductRow(rows) {
  return [...rows].sort((a, b) => productRowScore(b) - productRowScore(a))[0] || null;
}

function groupGtexProducts(rows) {
  const groups = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const codprod = Number(row?.CODPROD);
    if (!Number.isInteger(codprod) || codprod <= 0) continue;
    if (!groups.has(codprod)) groups.set(codprod, []);
    groups.get(codprod).push(row);
  }

  return groups;
}

async function getSyncState(key) {
  const result = await db.query(
    `SELECT value FROM gtex_sync_state WHERE key = $1 LIMIT 1`,
    [key]
  );
  return text(result.rows[0]?.value) || null;
}

async function setSyncState(key, value) {
  await db.query(
    `
      INSERT INTO gtex_sync_state (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `,
    [key, value]
  );
}

async function syncWindow(stateKey, { full = false } = {}) {
  const now = new Date();
  let dtini = catalogStartDate();
  const previous = full ? null : await getSyncState(stateKey);

  if (previous) {
    const parsed = new Date(previous);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setMinutes(parsed.getMinutes() - overlapMinutes());
      dtini = formatGtexDate(parsed);
    }
  }

  return {
    startedAt: now,
    hadPrevious: Boolean(previous),
    dtini,
    dtfim: formatGtexDate(now)
  };
}

async function ensureGtexSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await db.query(`
        ALTER TABLE products
          ADD COLUMN IF NOT EXISTS gtex_codprod BIGINT,
          ADD COLUMN IF NOT EXISTS gtex_codbarra VARCHAR(80),
          ADD COLUMN IF NOT EXISTS gtex_synced_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS gtex_managed BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS gtex_deleted BOOLEAN NOT NULL DEFAULT FALSE
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_products_gtex_codprod
        ON products(gtex_codprod)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_products_gtex_codbarra
        ON products(gtex_codbarra)
      `);

      await db.query(`
        ALTER TABLE store_product_stock
          ADD COLUMN IF NOT EXISTS gtex_price NUMERIC(10,2)
            CHECK (gtex_price IS NULL OR gtex_price >= 0),
          ADD COLUMN IF NOT EXISTS gtex_stock_raw INTEGER,
          ADD COLUMN IF NOT EXISTS gtex_synced_at TIMESTAMPTZ
      `);

      await db.query(`
        ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS gtex_numped BIGINT,
          ADD COLUMN IF NOT EXISTS gtex_numtrans BIGINT,
          ADD COLUMN IF NOT EXISTS gtex_position VARCHAR(20),
          ADD COLUMN IF NOT EXISTS gtex_status VARCHAR(120),
          ADD COLUMN IF NOT EXISTS gtex_synced_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS gtex_last_error TEXT
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_gtex_numped
        ON orders(gtex_numped)
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS gtex_sync_state (
          key VARCHAR(80) PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }
  return schemaReadyPromise;
}

function pickStockRow(rows, codprod, codfilial) {
  if (!Array.isArray(rows)) return null;
  return rows.find((row) =>
    String(row.CODFILIAL) === String(codfilial) &&
    Number(row.CODPROD) === Number(codprod)
  ) || rows.find((row) => Number(row.CODPROD) === Number(codprod)) || null;
}

function pickPriceRow(rows, codprod, codfilial, codbarra) {
  if (!Array.isArray(rows)) return null;
  const candidates = rows.filter((row) =>
    String(row.CODFILIAL) === String(codfilial) &&
    Number(row.CODPROD) === Number(codprod)
  );

  if (codbarra) {
    const exact = candidates.find((row) => String(row.CODBARRA) === String(codbarra));
    if (exact) return exact;
  }

  return candidates[0] || rows.find((row) => Number(row.CODPROD) === Number(codprod)) || null;
}

async function localUnsyncedReservation(productId, unitId, client = db) {
  const result = await client.query(
    `
      SELECT COALESCE(SUM(oi.quantity), 0)::int AS quantity
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = $1
        AND o.unit_id = $2
        AND o.stock_reserved_at IS NOT NULL
        AND o.stock_released_at IS NULL
        AND COALESCE(o.gtex_numped, 0) = 0
        AND o.payment_status NOT IN ('rejected', 'cancelled')
    `,
    [productId, unitId]
  );
  return Number(result.rows[0]?.quantity || 0);
}

async function syncProductFromGtex(productId) {
  await ensureGtexSchema();

  const productResult = await db.query(
    `
      SELECT id, name, price, active, gtex_codprod, gtex_codbarra,
           COALESCE(gtex_managed, FALSE) AS gtex_managed,
           COALESCE(gtex_deleted, FALSE) AS gtex_deleted
      FROM products
      WHERE id = $1
      LIMIT 1
    `,
    [productId]
  );

  const product = productResult.rows[0];
  if (!product) {
    const error = new Error("Produto não encontrado.");
    error.status = 404;
    throw error;
  }

  const codprod = Number(product.gtex_codprod);
  if (!Number.isInteger(codprod) || codprod <= 0) {
    const error = new Error(`${product.name}: informe o CODPROD do GTEX antes de sincronizar.`);
    error.status = 409;
    throw error;
  }

  const productRows = await getProductByCodprod(codprod);
  const exactProductRows = Array.isArray(productRows)
    ? productRows.filter((row) => Number(row.CODPROD) === codprod)
    : [];

  let codbarra = text(product.gtex_codbarra);
  if (!codbarra) {
    const uniqueBarcodes = [...new Set(
      exactProductRows.map((row) => text(row.CODBARRA)).filter(Boolean)
    )];
    if (uniqueBarcodes.length === 1) {
      codbarra = uniqueBarcodes[0];
    }
  }

  const client = await db.connect();
  const unitResults = [];

  try {
    await client.query("BEGIN");

    for (const [unitId, codfilial] of Object.entries(UNIT_TO_FILIAL)) {
      const [stockRows, priceRows] = await Promise.all([
        getStockByProduct(codprod, codfilial),
        getPricesByProduct(codprod, codfilial)
      ]);

      const stockRow = pickStockRow(stockRows, codprod, codfilial);
      const priceRow = pickPriceRow(priceRows, codprod, codfilial, codbarra);

      const rawAvailable = Math.max(0, Math.floor(numberOrNull(stockRow?.QTDISPONIVEL) || 0));
      const unsyncedReserved = await localUnsyncedReservation(product.id, unitId, client);
      const available = Math.max(0, rawAvailable - unsyncedReserved);
      const gtexPrice = numberOrNull(priceRow?.PRECO);

      await client.query(
        `
          INSERT INTO store_product_stock (
            store_id,
            product_id,
            stock_quantity,
            active,
            gtex_price,
            gtex_stock_raw,
            gtex_synced_at,
            updated_at
          )
          VALUES ($1, $2, $3, ($3 > 0), $4, $5, NOW(), NOW())
          ON CONFLICT (store_id, product_id)
          DO UPDATE SET
            stock_quantity = EXCLUDED.stock_quantity,
            active = EXCLUDED.active,
            gtex_price = EXCLUDED.gtex_price,
            gtex_stock_raw = EXCLUDED.gtex_stock_raw,
            gtex_synced_at = NOW(),
            updated_at = NOW()
        `,
        [unitId, product.id, available, gtexPrice, rawAvailable]
      );

      unitResults.push({
        unitId,
        codfilial,
        stock: available,
        rawStock: rawAvailable,
        reservedLocally: unsyncedReserved,
        price: gtexPrice
      });
    }

    const referencePrice = unitResults.find((item) => item.unitId === "julio" && item.price != null)?.price
      ?? unitResults.find((item) => item.price != null)?.price
      ?? null;

    await client.query(
      `
        UPDATE products
        SET
          gtex_codbarra = COALESCE(NULLIF($2, ''), gtex_codbarra),
          price = COALESCE($3, price),
          active = CASE
            WHEN gtex_managed = TRUE AND gtex_deleted = TRUE THEN FALSE
            WHEN gtex_managed = TRUE THEN
              COALESCE($3, price) > 0
              AND EXISTS (
                SELECT 1
                FROM store_product_stock s
                WHERE s.product_id = products.id
                  AND s.active = TRUE
                  AND s.stock_quantity > 0
              )
            ELSE active
          END,
          gtex_synced_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [product.id, codbarra, referencePrice]
    );

    await syncLegacyProductStock(product.id, client);
    await client.query("COMMIT");

    return {
      productId: Number(product.id),
      name: product.name,
      codprod,
      codbarra: codbarra || null,
      units: unitResults
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function syncCatalogRegistrationsFromGtex({ full = false } = {}) {
  await ensureGtexSchema();

  const window = await syncWindow("catalog_products", { full });
  const tipoData = full || !window.hadPrevious ? "C" : "U";
  let sourceRows = await getProductsByRange({
    tipoData,
    dtini: window.dtini,
    dtfim: window.dtfim
  });

  if ((full || !window.hadPrevious) && (!Array.isArray(sourceRows) || sourceRows.length === 0)) {
    sourceRows = await getProductsByRange({
      tipoData: "U",
      dtini: window.dtini,
      dtfim: window.dtfim
    });
  }

  const groups = groupGtexProducts(sourceRows);
  const localResult = await db.query(`
    SELECT
      id,
      name,
      description,
      category,
      active,
      price,
      gtex_codprod,
      gtex_codbarra,
      COALESCE(gtex_managed, FALSE) AS gtex_managed,
      COALESCE(gtex_deleted, FALSE) AS gtex_deleted
    FROM products
    ORDER BY id
  `);

  const byCodprod = new Map();
  const unmappedByName = new Map();
  const usedLocalIds = new Set();

  for (const row of localResult.rows) {
    const codprod = Number(row.gtex_codprod);
    if (Number.isInteger(codprod) && codprod > 0 && !byCodprod.has(codprod)) {
      byCodprod.set(codprod, row);
      usedLocalIds.add(Number(row.id));
      continue;
    }

    if (!row.gtex_codprod) {
      const key = normalizeText(row.name);
      if (!unmappedByName.has(key)) unmappedByName.set(key, []);
      unmappedByName.get(key).push(row);
    }
  }

  const prepared = [];
  const categories = new Set();
  const manuallyDeletedCategories = new Set(
    (await listManuallyDeletedCategoryNames()).map((name) => normalizeText(name))
  );

  for (const [codprod, rows] of groups) {
    const canonical = selectCanonicalProductRow(rows);
    if (!canonical) continue;

    const activeRows = rows.filter((row) => !isDeletedGtexRow(row));
    const deleted = activeRows.length === 0;
    const name = text(canonical.DESCRICAO) || `Produto GTEX ${codprod}`;
    const inferredCategory = inferCategory(canonical);
    const category = manuallyDeletedCategories.has(normalizeText(inferredCategory))
      ? "Outros"
      : inferredCategory;
    const description = buildProductDescription(canonical);
    const availableBarcodes = new Set(rows.map((row) => text(row.CODBARRA)).filter(Boolean));

    let existing = byCodprod.get(codprod) || null;
    if (!existing) {
      const nameMatches = (unmappedByName.get(normalizeText(name)) || [])
        .filter((row) => !usedLocalIds.has(Number(row.id)));
      if (nameMatches.length === 1) {
        existing = nameMatches[0];
      } else {
        const likelyMatches = localResult.rows.filter((row) =>
          !row.gtex_codprod &&
          !usedLocalIds.has(Number(row.id)) &&
          likelySameManualProduct(row, name)
        );
        if (likelyMatches.length === 1) existing = likelyMatches[0];
      }

      if (existing) {
        byCodprod.set(codprod, existing);
        usedLocalIds.add(Number(existing.id));
        unmappedByName.delete(normalizeText(existing.name));
      }
    }

    let codbarra = text(existing?.gtex_codbarra);
    if (!codbarra || !availableBarcodes.has(codbarra)) {
      codbarra = text(canonical.CODBARRA);
    }

    prepared.push({
      codprod,
      codbarra: codbarra || null,
      name,
      description,
      category,
      deleted,
      existing
    });

    categories.add(existing?.category || category);
  }

  for (const category of categories) {
    if (text(category)) await ensureCategory(category, null, { reactivate: false });
  }

  const client = await db.connect();
  const summary = {
    mode: full || !window.hadPrevious ? "full" : "incremental",
    sourceRows: Array.isArray(sourceRows) ? sourceRows.length : 0,
    uniqueProducts: prepared.length,
    created: 0,
    linkedExisting: 0,
    updated: 0,
    inactivated: 0,
    productIds: []
  };

  try {
    await client.query("BEGIN");

    for (const item of prepared) {
      if (item.existing) {
        const managed = Boolean(item.existing.gtex_managed);
        const nextName = managed ? item.name : item.existing.name;
        const nextDescription = managed
          ? (item.description || item.existing.description || null)
          : (item.existing.description || item.description || null);
        const nextCategory = managed
          ? item.category
          : (item.existing.category || item.category);
        const nextActive = item.deleted
          ? false
          : (managed ? (Number(item.existing.price || 0) > 0) : item.existing.active !== false);

        const result = await client.query(
          `
            UPDATE products
            SET
              name = $2,
              description = $3,
              category = $4,
              active = $5,
              gtex_codprod = $6,
              gtex_codbarra = $7,
              gtex_deleted = $8,
              gtex_synced_at = NOW(),
              updated_at = NOW()
            WHERE id = $1
            RETURNING id
          `,
          [
            item.existing.id,
            nextName,
            nextDescription,
            nextCategory,
            nextActive,
            item.codprod,
            item.codbarra,
            item.deleted
          ]
        );

        summary.updated += 1;
        if (!item.existing.gtex_codprod) summary.linkedExisting += 1;
        if (item.deleted && item.existing.active !== false) summary.inactivated += 1;
        summary.productIds.push(Number(result.rows[0].id));
        continue;
      }

      const result = await client.query(
        `
          INSERT INTO products (
            name,
            description,
            category,
            price,
            stock_quantity,
            image_url,
            active,
            promotion_active,
            gtex_codprod,
            gtex_codbarra,
            gtex_synced_at,
            gtex_managed,
            gtex_deleted,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, 0, 0, NULL, FALSE, FALSE, $5, $6, NOW(), TRUE, $4, NOW(), NOW())
          RETURNING id
        `,
        [
          item.name,
          item.description || null,
          item.category,
          item.deleted,
          item.codprod,
          item.codbarra
        ]
      );

      const productId = Number(result.rows[0].id);
      summary.created += 1;
      if (item.deleted) summary.inactivated += 1;
      summary.productIds.push(productId);
      byCodprod.set(item.codprod, {
        id: productId,
        gtex_codprod: item.codprod,
        gtex_codbarra: item.codbarra,
        gtex_managed: true
      });
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await setSyncState("catalog_products", window.startedAt.toISOString());
  return summary;
}

function stockKey(codfilial, codprod) {
  return `${String(codfilial)}|${Number(codprod)}`;
}

function priceKey(codfilial, codprod, codbarra = "") {
  return `${String(codfilial)}|${Number(codprod)}|${text(codbarra)}`;
}

async function syncInventoryBulkFromGtex({ full = false } = {}) {
  await ensureGtexSchema();

  const window = await syncWindow("catalog_inventory", { full });
  const productsResult = await db.query(`
    SELECT id, name, price, active, gtex_codprod, gtex_codbarra,
           COALESCE(gtex_managed, FALSE) AS gtex_managed,
           COALESCE(gtex_deleted, FALSE) AS gtex_deleted
    FROM products
    WHERE gtex_codprod IS NOT NULL
      AND gtex_codprod > 0
    ORDER BY id
  `);

  const products = productsResult.rows;
  const stockMap = new Map();
  const priceExactMap = new Map();
  const priceFallbackMap = new Map();
  let stockRowsCount = 0;
  let priceRowsCount = 0;

  for (const codfilial of Object.values(UNIT_TO_FILIAL)) {
    const [stockRows, priceRows] = await Promise.all([
      getStocksByRange(codfilial, { dtini: window.dtini, dtfim: window.dtfim }),
      getPricesByRange(codfilial, { dtini: window.dtini, dtfim: window.dtfim })
    ]);

    for (const row of Array.isArray(stockRows) ? stockRows : []) {
      if (String(row.CODFILIAL) !== String(codfilial)) continue;
      const codprod = Number(row.CODPROD);
      if (!Number.isInteger(codprod) || codprod <= 0) continue;
      stockMap.set(stockKey(codfilial, codprod), row);
      stockRowsCount += 1;
    }

    for (const row of Array.isArray(priceRows) ? priceRows : []) {
      if (String(row.CODFILIAL) !== String(codfilial)) continue;
      const codprod = Number(row.CODPROD);
      if (!Number.isInteger(codprod) || codprod <= 0) continue;
      const barcode = text(row.CODBARRA);
      if (barcode) priceExactMap.set(priceKey(codfilial, codprod, barcode), row);
      if (!priceFallbackMap.has(stockKey(codfilial, codprod))) {
        priceFallbackMap.set(stockKey(codfilial, codprod), row);
      }
      priceRowsCount += 1;
    }
  }

  const currentInventoryResult = await db.query(`
    SELECT store_id, product_id, stock_quantity, gtex_price, gtex_stock_raw
    FROM store_product_stock
  `);
  const currentInventory = new Map(
    currentInventoryResult.rows.map((row) => [
      `${row.store_id}|${Number(row.product_id)}`,
      row
    ])
  );

  const reservationsResult = await db.query(`
    SELECT
      oi.product_id,
      o.unit_id,
      COALESCE(SUM(oi.quantity), 0)::int AS quantity
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.stock_reserved_at IS NOT NULL
      AND o.stock_released_at IS NULL
      AND COALESCE(o.gtex_numped, 0) = 0
      AND o.payment_status NOT IN ('rejected', 'cancelled')
    GROUP BY oi.product_id, o.unit_id
  `);
  const reservations = new Map(
    reservationsResult.rows.map((row) => [
      `${Number(row.product_id)}|${row.unit_id}`,
      Number(row.quantity || 0)
    ])
  );

  const client = await db.connect();
  const touchedProducts = new Set();
  let unitRowsUpdated = 0;

  try {
    await client.query("BEGIN");

    for (const product of products) {
      const codprod = Number(product.gtex_codprod);
      const codbarra = text(product.gtex_codbarra);
      const referencePrices = [];

      for (const [unitId, codfilial] of Object.entries(UNIT_TO_FILIAL)) {
        const sKey = stockKey(codfilial, codprod);
        const stockRow = stockMap.get(sKey) || null;
        const priceRow = priceExactMap.get(priceKey(codfilial, codprod, codbarra))
          || priceFallbackMap.get(sKey)
          || null;

        const current = currentInventory.get(`${unitId}|${Number(product.id)}`) || null;
        const hasChange = full || stockRow || priceRow || !current;
        if (!hasChange) continue;

        const reserved = reservations.get(`${Number(product.id)}|${unitId}`) || 0;
        const rawAvailable = stockRow
          ? Math.max(0, Math.floor(numberOrNull(stockRow.QTDISPONIVEL) || 0))
          : (full ? 0 : Math.max(0, Number(current?.gtex_stock_raw ?? current?.stock_quantity ?? 0)));
        const available = Math.max(0, rawAvailable - reserved);
        const parsedPrice = numberOrNull(priceRow?.PRECO);
        const gtexPrice = parsedPrice != null
          ? parsedPrice
          : (current?.gtex_price == null ? null : Number(current.gtex_price));

        await client.query(
          `
            INSERT INTO store_product_stock (
              store_id,
              product_id,
              stock_quantity,
              active,
              gtex_price,
              gtex_stock_raw,
              gtex_synced_at,
              updated_at
            )
            VALUES ($1, $2, $3, ($3 > 0), $4, $5, NOW(), NOW())
            ON CONFLICT (store_id, product_id)
            DO UPDATE SET
              stock_quantity = EXCLUDED.stock_quantity,
              active = EXCLUDED.active,
              gtex_price = COALESCE(EXCLUDED.gtex_price, store_product_stock.gtex_price),
              gtex_stock_raw = EXCLUDED.gtex_stock_raw,
              gtex_synced_at = NOW(),
              updated_at = NOW()
          `,
          [unitId, product.id, available, gtexPrice, rawAvailable]
        );

        if (gtexPrice != null) referencePrices.push({ unitId, price: gtexPrice });
        touchedProducts.add(Number(product.id));
        unitRowsUpdated += 1;
      }

      const referencePrice = referencePrices.find((item) => item.unitId === "julio")?.price
        ?? referencePrices[0]?.price
        ?? null;

      await client.query(
        `
          UPDATE products
          SET
            price = COALESCE($2, price),
            active = CASE
              WHEN gtex_managed = TRUE AND gtex_deleted = TRUE THEN FALSE
              WHEN gtex_managed = TRUE THEN
                COALESCE($2, price) > 0
                AND EXISTS (
                  SELECT 1
                  FROM store_product_stock s
                  WHERE s.product_id = products.id
                    AND s.active = TRUE
                    AND s.stock_quantity > 0
                )
              ELSE active
            END,
            gtex_synced_at = NOW(),
            stock_quantity = COALESCE((
              SELECT SUM(s.stock_quantity)::int
              FROM store_product_stock s
              WHERE s.product_id = products.id
            ), 0),
            updated_at = NOW()
          WHERE id = $1
        `,
        [product.id, referencePrice]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await setSyncState("catalog_inventory", window.startedAt.toISOString());

  return {
    mode: full || !window.hadPrevious ? "full" : "incremental",
    total: products.length,
    synced: touchedProducts.size,
    failed: 0,
    errors: [],
    unitRowsUpdated,
    stockRowsReceived: stockRowsCount,
    priceRowsReceived: priceRowsCount
  };
}

async function syncFullCatalogFromGtex() {
  const catalog = await syncCatalogRegistrationsFromGtex({ full: true });
  const inventory = await syncInventoryBulkFromGtex({ full: true });

  return {
    total: inventory.total,
    synced: inventory.synced,
    failed: inventory.failed,
    errors: inventory.errors,
    sourceRows: catalog.sourceRows,
    uniqueProducts: catalog.uniqueProducts,
    created: catalog.created,
    linkedExisting: catalog.linkedExisting,
    updated: catalog.updated,
    inactivated: catalog.inactivated,
    unitRowsUpdated: inventory.unitRowsUpdated,
    stockRowsReceived: inventory.stockRowsReceived,
    priceRowsReceived: inventory.priceRowsReceived
  };
}

async function syncIncrementalGtex() {
  const catalog = await syncCatalogRegistrationsFromGtex({ full: false });
  const inventory = await syncInventoryBulkFromGtex({ full: false });
  return { catalog, inventory };
}

async function syncAllMappedProducts() {
  await ensureGtexSchema();
  const result = await db.query(
    `
      SELECT id, name
      FROM products
      WHERE gtex_codprod IS NOT NULL
        AND gtex_codprod > 0
      ORDER BY id
    `
  );

  const summary = {
    total: result.rows.length,
    synced: 0,
    failed: 0,
    errors: []
  };

  for (const row of result.rows) {
    try {
      await syncProductFromGtex(row.id);
      summary.synced += 1;
    } catch (error) {
      summary.failed += 1;
      summary.errors.push({
        productId: Number(row.id),
        name: row.name,
        message: error.message
      });
    }
  }

  return summary;
}

function orderObservation(order) {
  const parts = [
    `E-commerce ${order.order_number}`,
    order.customer_name ? `Cliente: ${order.customer_name}` : null,
    order.customer_phone ? `Tel: ${order.customer_phone}` : null,
    order.delivery_address ? `Entrega: ${order.delivery_address}` : null,
    order.delivery_reference ? `Ref: ${order.delivery_reference}` : null
  ].filter(Boolean);

  return parts.join(" | ").slice(0, 1000);
}

async function markGtexError(orderId, error) {
  await ensureGtexSchema();
  await db.query(
    `
      UPDATE orders
      SET gtex_last_error = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [orderId, String(error?.message || error || "Erro GTEX").slice(0, 3000)]
  );
}

async function syncOrderToGtex(orderId, { force = false } = {}) {
  await ensureGtexSchema();
  const config = getGtexConfigStatus();

  if (!config.enabled && !force) {
    return { skipped: true, reason: "GTEX_ENABLED=false" };
  }

  const orderResult = await db.query(
    `
      SELECT *
      FROM orders
      WHERE id = $1
      LIMIT 1
    `,
    [orderId]
  );

  const order = orderResult.rows[0];
  if (!order) {
    const error = new Error("Pedido local não encontrado.");
    error.status = 404;
    throw error;
  }

  if (order.payment_status !== "approved") {
    return { skipped: true, reason: "Pagamento ainda não aprovado." };
  }

  if (Number(order.gtex_numped || 0) > 0) {
    return {
      skipped: true,
      reason: "Pedido já enviado ao GTEX.",
      numped: Number(order.gtex_numped),
      numtrans: Number(order.gtex_numtrans || 0) || null
    };
  }

  const itemsResult = await db.query(
    `
      SELECT
        oi.product_id,
        oi.product_name,
        oi.unit_price,
        oi.quantity,
        p.gtex_codprod,
        p.gtex_codbarra
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `,
    [order.id]
  );

  if (!itemsResult.rows.length) {
    const error = new Error("Pedido sem itens para enviar ao GTEX.");
    error.status = 409;
    await markGtexError(order.id, error);
    throw error;
  }

  const missing = itemsResult.rows.filter((item) => !text(item.gtex_codbarra));
  if (missing.length) {
    const error = new Error(
      `Há produto(s) sem CODBARRA GTEX: ${missing.map((item) => item.product_name).join(", ")}`
    );
    error.status = 409;
    await markGtexError(order.id, error);
    throw error;
  }

  const payment = paymentConfig(order.payment_method);
  const codfilial = filialForUnit(order.unit_id);
  const codcli = Number(process.env.GTEX_CODCLI || 2);
  const codvendedor = Number(process.env.GTEX_CODVENDEDOR || 1);
  const origemvenda = text(process.env.GTEX_ORIGEMVENDA || "VE");

  if (!Number.isInteger(codcli) || codcli <= 0) {
    throw new Error("GTEX_CODCLI inválido.");
  }
  if (!Number.isInteger(codvendedor) || codvendedor <= 0) {
    throw new Error("GTEX_CODVENDEDOR inválido.");
  }

  const deliveryFee = Number(order.delivery_fee || 0);
  const deliveryBarcode = text(process.env.GTEX_DELIVERY_CODBARRA);
  const allowFeeInObs = String(process.env.GTEX_ALLOW_DELIVERY_FEE_IN_OBS || "false").toLowerCase() === "true";

  if (deliveryFee > 0 && !deliveryBarcode && !allowFeeInObs) {
    const error = new Error(
      "O pedido possui taxa de entrega. Configure GTEX_DELIVERY_CODBARRA ou GTEX_ALLOW_DELIVERY_FEE_IN_OBS=true antes de enviar ao GTEX."
    );
    error.status = 409;
    await markGtexError(order.id, error);
    throw error;
  }

  const items = itemsResult.rows.map((item) => ({
    codbarra: text(item.gtex_codbarra),
    qt: Number(item.quantity),
    punit: Number(item.unit_price),
    obs: ""
  }));

  if (deliveryFee > 0 && deliveryBarcode) {
    items.push({
      codbarra: deliveryBarcode,
      qt: 1,
      punit: deliveryFee,
      obs: "Taxa de entrega e-commerce"
    });
  }

  const payload = {
    seuid: order.order_number,
    codfilial,
    codcli,
    codvendedor,
    codplpag: payment.codplpag,
    codcob: payment.codcob,
    origemvenda,
    obs: `${orderObservation(order)}${deliveryFee > 0 && !deliveryBarcode ? ` | Taxa entrega: R$ ${deliveryFee.toFixed(2)}` : ""}`,
    itens: items
  };

  try {
    const response = await insertOrder(payload);
    const result = Array.isArray(response) ? response[0] : response;
    const retorno = text(result?.RETORNO);
    const numped = Number(result?.NUMPED || 0);
    const numtrans = Number(result?.NUMTRANS || 0);

    if (retorno.toUpperCase() !== "OK" || numped <= 0) {
      const error = new Error(retorno || "GTEX não confirmou a inclusão do pedido.");
      error.details = response;
      error.status = 502;
      await markGtexError(order.id, error);
      throw error;
    }

    await db.query(
      `
        UPDATE orders
        SET
          gtex_numped = $2,
          gtex_numtrans = $3,
          gtex_position = $4,
          gtex_status = $5,
          gtex_synced_at = NOW(),
          gtex_last_error = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        order.id,
        numped,
        numtrans || null,
        text(result?.POSICAO) || null,
        text(result?.STATUS) || null
      ]
    );

    return {
      ok: true,
      orderId: Number(order.id),
      orderNumber: order.order_number,
      numped,
      numtrans: numtrans || null,
      position: text(result?.POSICAO) || null,
      status: text(result?.STATUS) || null
    };
  } catch (error) {
    await markGtexError(order.id, error);
    throw error;
  }
}

async function trySyncApprovedOrder(orderId) {
  try {
    return await syncOrderToGtex(orderId);
  } catch (error) {
    try {
      await markGtexError(orderId, error);
    } catch (markError) {
      console.error("GTEX registro de erro:", markError.message);
    }
    console.error("GTEX pedido:", error.message);
    return { ok: false, error: error.message };
  }
}

async function syncPendingApprovedOrders(limit = 20) {
  await ensureGtexSchema();
  const max = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const result = await db.query(
    `
      SELECT id
      FROM orders
      WHERE payment_status = 'approved'
        AND COALESCE(gtex_numped, 0) = 0
      ORDER BY created_at ASC
      LIMIT $1
    `,
    [max]
  );

  const summary = { total: result.rows.length, synced: 0, failed: 0 };
  for (const row of result.rows) {
    const outcome = await trySyncApprovedOrder(row.id);
    if (outcome?.ok || outcome?.numped) summary.synced += 1;
    else if (!outcome?.skipped) summary.failed += 1;
  }
  return summary;
}

function startGtexSyncScheduler() {
  const config = getGtexConfigStatus();
  const minutes = Number(process.env.GTEX_SYNC_INTERVAL_MINUTES || 0);

  if (!config.configured || !config.catalogSyncEnabled || !Number.isFinite(minutes) || minutes <= 0 || scheduler) {
    return;
  }

  const run = async () => {
    if (syncRunning) return;
    syncRunning = true;
    try {
      const catalogSync = await syncIncrementalGtex();
      const summary = catalogSync.inventory;
      const created = Number(catalogSync.catalog?.created || 0);
      console.log(`GTEX catálogo sincronizado: ${summary.synced}/${summary.total} produto(s); ${created} novo(s) importado(s).`);
      if (summary.failed) {
        console.warn(`GTEX: ${summary.failed} produto(s) com falha de sincronização.`);
      }

      if (config.enabled) {
        const orders = await syncPendingApprovedOrders(20);
        if (orders.total) {
          console.log(`GTEX pedidos pendentes: ${orders.synced}/${orders.total} sincronizado(s).`);
        }
      }
    } catch (error) {
      console.error("GTEX sincronização automática:", error.message);
    } finally {
      syncRunning = false;
    }
  };

  scheduler = setInterval(run, minutes * 60 * 1000);
  scheduler.unref?.();

  if (String(process.env.GTEX_SYNC_ON_START || "false").toLowerCase() === "true") {
    setTimeout(run, 1500).unref?.();
  }
}

module.exports = {
  ensureGtexSchema,
  syncProductFromGtex,
  syncCatalogRegistrationsFromGtex,
  syncInventoryBulkFromGtex,
  syncFullCatalogFromGtex,
  syncIncrementalGtex,
  syncAllMappedProducts,
  syncOrderToGtex,
  trySyncApprovedOrder,
  syncPendingApprovedOrders,
  startGtexSyncScheduler
};
