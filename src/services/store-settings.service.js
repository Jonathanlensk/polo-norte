const db = require("../../database/db");

let schemaReadyPromise = null;

const UNIT_IDS = ["julio", "vila", "divino"];

function numberEnv(name, fallback) {
  const raw = String(process.env[name] ?? "").trim().replace(",", ".");
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function defaultDeliverySettings() {
  return {
    pricePerKm: Math.max(0, numberEnv("DELIVERY_PRICE_PER_KM", 1.5)),
    minimumFee: Math.max(0, numberEnv("DELIVERY_MIN_FEE", 4)),
    maxDistanceKm: Math.max(0.5, numberEnv("DELIVERY_MAX_DISTANCE_KM", 15)),
    windowMinutes: Math.max(5, Math.round(numberEnv("DELIVERY_WINDOW_MINUTES", 10))),
    dispatchBufferMinutes: Math.max(0, Math.round(numberEnv("DELIVERY_DISPATCH_BUFFER_MINUTES", 5)))
  };
}

async function ensureStoreSettingsSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS store_settings (
          id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          store_open BOOLEAN NOT NULL DEFAULT TRUE,
          delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
          pix_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          credit_card_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          debit_card_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          cash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await db.query(`
        ALTER TABLE store_settings
          ADD COLUMN IF NOT EXISTS store_name VARCHAR(150),
          ADD COLUMN IF NOT EXISTS store_whatsapp VARCHAR(30),
          ADD COLUMN IF NOT EXISTS delivery_label VARCHAR(80),
          ADD COLUMN IF NOT EXISTS delivery_price_per_km NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS delivery_min_fee NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS delivery_max_distance_km NUMERIC(10,2),
          ADD COLUMN IF NOT EXISTS delivery_window_minutes INTEGER,
          ADD COLUMN IF NOT EXISTS delivery_dispatch_buffer_minutes INTEGER,
          ADD COLUMN IF NOT EXISTS unit_julio_active BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS unit_vila_active BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS unit_divino_active BOOLEAN NOT NULL DEFAULT TRUE
      `);

      await db.query(`
        INSERT INTO store_settings (id)
        VALUES (1)
        ON CONFLICT (id) DO NOTHING
      `);
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

function effectiveNumber(value, fallback, min = 0) {
  // Colunas adicionadas em versões anteriores podem estar NULL.
  // Number(null) vira 0 em JavaScript, o que fazia a tela exibir 0 / 0 / 0,5
  // no lugar dos valores padrão configurados no .env.
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, number) : fallback;
}

function mapSettings(row = {}) {
  const defaults = defaultDeliverySettings();

  return {
    storeName: String(row.store_name || "Polo Norte Bebidas").trim() || "Polo Norte Bebidas",
    whatsapp: String(row.store_whatsapp || "").trim(),
    // O fechamento agora é controlado individualmente por unidade.
    storeOpen: true,
    deliveryLabel: String(row.delivery_label || "Entrega rápida").trim() || "Entrega rápida",
    delivery: {
      pricePerKm: effectiveNumber(row.delivery_price_per_km, defaults.pricePerKm, 0),
      minimumFee: effectiveNumber(row.delivery_min_fee, defaults.minimumFee, 0),
      maxDistanceKm: effectiveNumber(row.delivery_max_distance_km, defaults.maxDistanceKm, 0.5),
      windowMinutes: Math.round(effectiveNumber(row.delivery_window_minutes, defaults.windowMinutes, 5)),
      dispatchBufferMinutes: Math.round(effectiveNumber(row.delivery_dispatch_buffer_minutes, defaults.dispatchBufferMinutes, 0))
    },
    units: {
      julio: { active: row.unit_julio_active !== false },
      vila: { active: row.unit_vila_active !== false },
      divino: { active: row.unit_divino_active !== false }
    }
  };
}

async function getStoreSettings() {
  await ensureStoreSettingsSchema();
  const result = await db.query(`SELECT * FROM store_settings WHERE id = 1 LIMIT 1`);
  return mapSettings(result.rows[0] || {});
}

function validateSettings(input = {}) {
  const storeName = String(input.storeName || "").trim();
  const whatsapp = String(input.whatsapp || "").replace(/[^0-9+]/g, "").trim();
  const deliveryLabel = String(input.deliveryLabel || "").trim();
  const delivery = input.delivery || {};
  const units = input.units || {};

  if (storeName.length < 2 || storeName.length > 150) {
    const error = new Error("Informe um nome de loja válido.");
    error.status = 400;
    throw error;
  }

  if (deliveryLabel.length < 2 || deliveryLabel.length > 80) {
    const error = new Error("Informe um texto de entrega válido.");
    error.status = 400;
    throw error;
  }

  if (whatsapp) {
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      const error = new Error("Informe um WhatsApp válido ou deixe em branco.");
      error.status = 400;
      throw error;
    }
  }

  const pricePerKm = Number(delivery.pricePerKm);
  const minimumFee = Number(delivery.minimumFee);
  const maxDistanceKm = Number(delivery.maxDistanceKm);
  const windowMinutes = Number(delivery.windowMinutes);
  const dispatchBufferMinutes = Number(delivery.dispatchBufferMinutes);

  const numericChecks = [
    [pricePerKm, 0, 100, "Valor por km"],
    [minimumFee, 0, 500, "Taxa mínima"],
    [maxDistanceKm, 0.5, 200, "Distância máxima"],
    [windowMinutes, 5, 180, "Janela da previsão"],
    [dispatchBufferMinutes, 0, 180, "Margem da previsão"]
  ];

  for (const [value, min, max, label] of numericChecks) {
    if (!Number.isFinite(value) || value < min || value > max) {
      const error = new Error(`${label} inválido.`);
      error.status = 400;
      throw error;
    }
  }

  return {
    storeName,
    whatsapp: whatsapp || null,
    // Mantido no banco apenas por compatibilidade com versões anteriores.
    storeOpen: true,
    deliveryLabel,
    delivery: {
      pricePerKm,
      minimumFee,
      maxDistanceKm,
      windowMinutes: Math.round(windowMinutes),
      dispatchBufferMinutes: Math.round(dispatchBufferMinutes)
    },
    units: Object.fromEntries(
      UNIT_IDS.map((id) => [id, { active: units[id]?.active !== false }])
    )
  };
}

async function updateStoreSettings(input) {
  await ensureStoreSettingsSchema();
  const settings = validateSettings(input);

  await db.query(
    `
      UPDATE store_settings
      SET
        store_name = $1,
        store_whatsapp = $2,
        store_open = $3,
        delivery_label = $4,
        delivery_price_per_km = $5,
        delivery_min_fee = $6,
        delivery_max_distance_km = $7,
        delivery_window_minutes = $8,
        delivery_dispatch_buffer_minutes = $9,
        unit_julio_active = $10,
        unit_vila_active = $11,
        unit_divino_active = $12,
        updated_at = NOW()
      WHERE id = 1
    `,
    [
      settings.storeName,
      settings.whatsapp,
      settings.storeOpen,
      settings.deliveryLabel,
      settings.delivery.pricePerKm,
      settings.delivery.minimumFee,
      settings.delivery.maxDistanceKm,
      settings.delivery.windowMinutes,
      settings.delivery.dispatchBufferMinutes,
      settings.units.julio.active,
      settings.units.vila.active,
      settings.units.divino.active
    ]
  );

  return getStoreSettings();
}

function publicSettings(settings) {
  return {
    storeName: settings.storeName,
    whatsapp: settings.whatsapp,
    storeOpen: Object.values(settings.units || {}).some((unit) => unit.active !== false),
    statusText: "Aberto 24 horas",
    deliveryLabel: settings.deliveryLabel,
    units: settings.units
  };
}

module.exports = {
  UNIT_IDS,
  defaultDeliverySettings,
  ensureStoreSettingsSchema,
  getStoreSettings,
  updateStoreSettings,
  publicSettings
};
