const db = require("../../database/db");

let schemaReadyPromise = null;

function normalizeLogin(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function isValidLogin(value) {
  return /^[A-Z0-9._-]{2,30}$/.test(normalizeLogin(value));
}

async function ensureAdminSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await db.query(`
        ALTER TABLE admins
          ADD COLUMN IF NOT EXISTS login VARCHAR(30),
          ADD COLUMN IF NOT EXISTS unit_id VARCHAR(30)
      `);

      // Administradores já existentes recebem uma matrícula previsível.
      // Ex.: id 1 -> 0001. O gerente pode trocá-la depois na aba Usuários.
      await db.query(`
        UPDATE admins
        SET login = LPAD(id::text, 4, '0')
        WHERE login IS NULL OR TRIM(login) = ''
      `);

      await db.query(`
        ALTER TABLE admins
          ALTER COLUMN login SET NOT NULL,
          ALTER COLUMN email DROP NOT NULL
      `);

      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_login_unique
        ON admins (UPPER(login))
      `);
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

function mapAdminUser(row) {
  return {
    id: Number(row.id),
    name: row.name,
    login: row.login,
    email: row.email || null,
    role: String(row.role || "operator").toLowerCase() === "manager" || String(row.role || "").toLowerCase() === "admin"
      ? "manager"
      : "operator",
    unitId: row.unit_id || null,
    active: Boolean(row.active),
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at || null
  };
}

module.exports = {
  ensureAdminSchema,
  normalizeLogin,
  isValidLogin,
  mapAdminUser
};
