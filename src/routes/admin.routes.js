const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../../database/db");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const {
  ensureCatalogSchema,
  ensureCategory,
  updateCategoryIcon,
  listActiveCategories,
  isCategoryIconKey,
  promotionCondition
} = require("../services/catalog.service");
const {
  criarTokenAdmin,
  salvarCookieAdmin,
  limparCookieAdmin,
  autenticarAdmin,
  exigirGerente,
  normalizarPerfilAdmin
} = require("../middleware/admin-auth.middleware");
const {
  ensureAdminSchema,
  normalizeLogin,
  isValidLogin,
  mapAdminUser
} = require("../services/admin-users.service");
const {
  getStoreSettings,
  updateStoreSettings
} = require("../services/store-settings.service");
const {
  STORE_UNITS,
  ensureStoreInventorySchema,
  normalizeProductInventory,
  setProductInventory,
  updateProductUnitInventory
} = require("../services/store-inventory.service");

const router = express.Router();

const ORDER_STATUSES = new Set([
  "received",
  "preparing",
  "out_for_delivery",
  "delivered"
]);

function storeUnitName(unitId) {
  return STORE_UNITS.find((unit) => unit.id === unitId)?.name || null;
}

function mapOrder(row) {
  return {
    id: Number(row.id),
    orderNumber: row.order_number,
    unitId: row.unit_id || null,
    unitName: storeUnitName(row.unit_id),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || null,
    deliveryAddress: row.delivery_address,
    deliveryReference: row.delivery_reference || null,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.post("/api/admin/auth/login", async (req, res) => {
  try {
    await ensureAdminSchema();

    const login = normalizeLogin(req.body?.login);
    const senha = String(req.body?.senha || "");

    if (!login || !senha) {
      return res.status(400).json({
        ok: false,
        message: "Informe matrícula e senha."
      });
    }

    const result = await db.query(
      `
        SELECT id, name, login, email, password_hash, role, unit_id, active
        FROM admins
        WHERE UPPER(login) = UPPER($1)
        LIMIT 1
      `,
      [login]
    );

    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({
        ok: false,
        message: "Matrícula ou senha incorretas."
      });
    }

    if (!admin.active) {
      return res.status(403).json({
        ok: false,
        message: "Este acesso administrativo está desativado."
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, admin.password_hash);

    if (!senhaCorreta) {
      return res.status(401).json({
        ok: false,
        message: "Matrícula ou senha incorretas."
      });
    }

    await db.query(
      `UPDATE admins SET last_login_at = NOW() WHERE id = $1`,
      [admin.id]
    );

    const token = criarTokenAdmin(admin);
    salvarCookieAdmin(res, token);

    return res.json({
      ok: true,
      admin: {
        id: Number(admin.id),
        name: admin.name,
        login: admin.login,
        email: admin.email || null,
        role: normalizarPerfilAdmin(admin.role),
        unitId: admin.unit_id || null,
        unitName: storeUnitName(admin.unit_id)
      }
    });
  } catch (error) {
    console.error("POST /api/admin/auth/login:", error);
    return res.status(500).json({
      ok: false,
      message: "Erro ao entrar no painel administrativo."
    });
  }
});

router.get("/api/admin/auth/me", autenticarAdmin, async (req, res) => {
  try {
    await ensureAdminSchema();

    const result = await db.query(
      `
        SELECT id, name, login, email, role, unit_id, active
        FROM admins
        WHERE id = $1
        LIMIT 1
      `,
      [req.adminId]
    );

    const admin = result.rows[0];

    if (!admin || !admin.active) {
      limparCookieAdmin(res);
      return res.status(401).json({
        ok: false,
        message: "Sessão administrativa inválida."
      });
    }

    return res.json({
      ok: true,
      admin: {
        id: Number(admin.id),
        name: admin.name,
        login: admin.login,
        email: admin.email || null,
        role: normalizarPerfilAdmin(admin.role),
        unitId: admin.unit_id || null,
        unitName: storeUnitName(admin.unit_id)
      }
    });
  } catch (error) {
    console.error("GET /api/admin/auth/me:", error);
    return res.status(500).json({
      ok: false,
      message: "Erro ao carregar o administrador."
    });
  }
});

router.post("/api/admin/auth/logout", (req, res) => {
  limparCookieAdmin(res);
  return res.json({ ok: true });
});

router.get(
  "/api/admin/manager/settings",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      const settings = await getStoreSettings();
      return res.json({ ok: true, settings });
    } catch (error) {
      console.error("GET /api/admin/manager/settings:", error);
      return res.status(500).json({ ok: false, message: "Erro ao carregar as configurações da loja." });
    }
  }
);

router.put(
  "/api/admin/manager/settings",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      const settings = await updateStoreSettings(req.body || {});
      return res.json({ ok: true, settings, message: "Configurações salvas com sucesso." });
    } catch (error) {
      console.error("PUT /api/admin/manager/settings:", error);
      return res.status(error.status || 500).json({
        ok: false,
        message: error.status ? error.message : "Erro ao salvar as configurações."
      });
    }
  }
);

router.get(
  "/api/admin/manager/users",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await ensureAdminSchema();
      const result = await db.query(`
        SELECT id, name, login, email, role, unit_id, active, last_login_at, created_at
        FROM admins
        ORDER BY active DESC, name ASC, id ASC
      `);
      return res.json({ ok: true, users: result.rows.map(mapAdminUser) });
    } catch (error) {
      console.error("GET /api/admin/manager/users:", error);
      return res.status(500).json({ ok: false, message: "Erro ao carregar os usuários administrativos." });
    }
  }
);

router.post(
  "/api/admin/manager/users",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await ensureAdminSchema();

      const name = String(req.body?.name || "").trim();
      const login = normalizeLogin(req.body?.login);
      const email = String(req.body?.email || "").trim().toLowerCase() || null;
      const role = normalizarPerfilAdmin(req.body?.role);
      const requestedUnitId = String(req.body?.unitId || "").trim();
      const unitId = role === "operator" ? requestedUnitId : null;
      const senha = String(req.body?.senha || "");

      if (name.length < 2 || name.length > 150) {
        return res.status(400).json({ ok: false, message: "Informe um nome válido." });
      }
      if (!isValidLogin(login)) {
        return res.status(400).json({
          ok: false,
          message: "A matrícula deve ter de 2 a 30 caracteres e usar apenas letras, números, ponto, hífen ou underline."
        });
      }
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ ok: false, message: "Informe um e-mail válido ou deixe em branco." });
      }
      if (role === "operator" && !STORE_UNITS.some((unit) => unit.id === unitId)) {
        return res.status(400).json({ ok: false, message: "Selecione a unidade do operador." });
      }
      if (senha.length < 8) {
        return res.status(400).json({ ok: false, message: "A senha deve ter pelo menos 8 caracteres." });
      }

      const duplicate = await db.query(
        `
          SELECT id
          FROM admins
          WHERE UPPER(login) = UPPER($1)
             OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))
          LIMIT 1
        `,
        [login, email]
      );

      if (duplicate.rows.length) {
        return res.status(409).json({ ok: false, message: "Já existe um usuário com esta matrícula ou e-mail." });
      }

      const passwordHash = await bcrypt.hash(senha, 12);
      const result = await db.query(
        `
          INSERT INTO admins (name, login, email, password_hash, role, unit_id, active)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE)
          RETURNING id, name, login, email, role, unit_id, active, last_login_at, created_at
        `,
        [name, login, email, passwordHash, role, unitId]
      );

      return res.status(201).json({ ok: true, user: mapAdminUser(result.rows[0]) });
    } catch (error) {
      console.error("POST /api/admin/manager/users:", error);
      return res.status(error.code === "23505" ? 409 : 500).json({
        ok: false,
        message: error.code === "23505"
          ? "Já existe um usuário com esta matrícula ou e-mail."
          : "Erro ao criar o usuário administrativo."
      });
    }
  }
);

router.patch(
  "/api/admin/manager/users/:id",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await ensureAdminSchema();

      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, message: "Usuário inválido." });
      }

      const currentResult = await db.query(
        `SELECT id, name, login, email, role, unit_id, active FROM admins WHERE id = $1 LIMIT 1`,
        [id]
      );
      const current = currentResult.rows[0];

      if (!current) {
        return res.status(404).json({ ok: false, message: "Usuário não encontrado." });
      }

      const name = String(req.body?.name ?? current.name).trim();
      const login = normalizeLogin(req.body?.login ?? current.login);
      const emailRaw = req.body?.email === undefined ? current.email : req.body.email;
      const email = String(emailRaw || "").trim().toLowerCase() || null;
      const role = req.body?.role === undefined
        ? normalizarPerfilAdmin(current.role)
        : normalizarPerfilAdmin(req.body.role);
      const requestedUnitId = req.body?.unitId === undefined
        ? String(current.unit_id || "").trim()
        : String(req.body.unitId || "").trim();
      const unitId = role === "operator" ? requestedUnitId : null;
      const active = req.body?.active === undefined ? Boolean(current.active) : Boolean(req.body.active);

      if (name.length < 2 || name.length > 150) {
        return res.status(400).json({ ok: false, message: "Informe um nome válido." });
      }
      if (!isValidLogin(login)) {
        return res.status(400).json({ ok: false, message: "Matrícula inválida." });
      }
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ ok: false, message: "E-mail inválido." });
      }
      if (role === "operator" && !STORE_UNITS.some((unit) => unit.id === unitId)) {
        return res.status(400).json({ ok: false, message: "Selecione a unidade do operador." });
      }

      if (String(req.adminId) === String(id)) {
        if (!active) {
          return res.status(400).json({ ok: false, message: "Você não pode desativar o próprio acesso." });
        }
        if (role !== "manager") {
          return res.status(400).json({ ok: false, message: "Você não pode remover o próprio perfil de gerente." });
        }
      }

      const result = await db.query(
        `
          UPDATE admins
          SET name = $1, login = $2, email = $3, role = $4, unit_id = $5, active = $6, updated_at = NOW()
          WHERE id = $7
          RETURNING id, name, login, email, role, unit_id, active, last_login_at, created_at
        `,
        [name, login, email, role, unitId, active, id]
      );

      return res.json({ ok: true, user: mapAdminUser(result.rows[0]) });
    } catch (error) {
      console.error("PATCH /api/admin/manager/users/:id:", error);
      return res.status(error.code === "23505" ? 409 : (error.status || 500)).json({
        ok: false,
        message: error.code === "23505"
          ? "Já existe outro usuário com esta matrícula ou e-mail."
          : (error.status ? error.message : "Erro ao atualizar o usuário.")
      });
    }
  }
);

router.patch(
  "/api/admin/manager/users/:id/password",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await ensureAdminSchema();
      const id = Number(req.params.id);
      const senha = String(req.body?.senha || "");

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, message: "Usuário inválido." });
      }
      if (senha.length < 8) {
        return res.status(400).json({ ok: false, message: "A nova senha deve ter pelo menos 8 caracteres." });
      }

      const passwordHash = await bcrypt.hash(senha, 12);
      const result = await db.query(
        `UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
        [passwordHash, id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ ok: false, message: "Usuário não encontrado." });
      }

      return res.json({ ok: true, message: "Senha redefinida com sucesso." });
    } catch (error) {
      console.error("PATCH /api/admin/manager/users/:id/password:", error);
      return res.status(500).json({ ok: false, message: "Erro ao redefinir a senha." });
    }
  }
);

router.get(
  "/api/admin/manager/overview",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await Promise.all([
        ensureCatalogSchema(),
        ensureStoreInventorySchema()
      ]);

      const [productResult, categoryResult] = await Promise.all([
        db.query(`
          SELECT
            (SELECT COUNT(*)::int FROM products WHERE active = TRUE) AS active_products,
            (
              SELECT COUNT(*)::int
              FROM store_product_stock s
              JOIN products p ON p.id = s.product_id
              WHERE p.active = TRUE
                AND s.active = TRUE
                AND s.stock_quantity <= 5
            ) AS low_stock
        `),
        db.query(`
          SELECT COUNT(*)::int AS categories
          FROM product_categories
          WHERE active = TRUE
        `)
      ]);

      const productRow = productResult.rows[0] || {};
      const categoryRow = categoryResult.rows[0] || {};

      return res.json({
        ok: true,
        overview: {
          activeProducts: Number(productRow.active_products || 0),
          lowStock: Number(productRow.low_stock || 0),
          categories: Number(categoryRow.categories || 0)
        }
      });
    } catch (error) {
      console.error("GET /api/admin/manager/overview:", error);
      return res.status(500).json({
        ok: false,
        message: "Erro ao carregar o resumo gerencial."
      });
    }
  }
);

router.get("/api/admin/orders", autenticarAdmin, async (req, res) => {
  try {
    await ensureStoreInventorySchema();
    const status = String(req.query?.status || "").trim();
    const search = String(req.query?.search || "").trim();

    const params = [];
    const where = [];

    if (req.adminRole === "operator") {
      if (!req.adminUnitId || !STORE_UNITS.some((unit) => unit.id === req.adminUnitId)) {
        return res.status(403).json({
          ok: false,
          message: "Este operador ainda não possui uma unidade vinculada. Peça ao gerente para definir a unidade em Usuários."
        });
      }
      params.push(req.adminUnitId);
      where.push(`o.unit_id = $${params.length}`);
    }

    if (status && ORDER_STATUSES.has(status)) {
      params.push(status);
      where.push(`o.order_status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(`(
        o.order_number ILIKE $${params.length}
        OR o.customer_name ILIKE $${params.length}
        OR o.customer_phone ILIKE $${params.length}
      )`);
    }

    const result = await db.query(
      `
        SELECT
          o.id,
          o.order_number,
          o.unit_id,
          o.customer_name,
          o.customer_phone,
          o.customer_email,
          o.delivery_address,
          o.delivery_reference,
          o.delivery_fee,
          o.subtotal,
          o.total,
          o.payment_method,
          o.payment_status,
          o.order_status,
          o.notes,
          o.created_at,
          o.updated_at,
          COALESCE(SUM(oi.quantity), 0)::int AS item_quantity
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 100
      `,
      params
    );

    const summaryParams = [];
    let summaryScope = "";
    if (req.adminRole === "operator") {
      summaryParams.push(req.adminUnitId);
      summaryScope = `WHERE o.unit_id = $1`;
    }

    const summaryResult = await db.query(`
      WITH limites_dia AS (
        SELECT
          ((NOW() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp
            AT TIME ZONE 'America/Sao_Paulo') AS inicio_hoje,
          (((NOW() AT TIME ZONE 'America/Sao_Paulo')::date + 1)::timestamp
            AT TIME ZONE 'America/Sao_Paulo') AS inicio_amanha
      )
      SELECT
        COUNT(*) FILTER (
          WHERE o.created_at >= l.inicio_hoje
            AND o.created_at < l.inicio_amanha
        )::int AS total,

        -- Pedidos ainda aguardando atendimento aparecem mesmo se
        -- tiverem sido criados em um dia anterior. Assim nenhum
        -- pedido pendente some da fila operacional do caixa.
        COUNT(*) FILTER (
          WHERE o.order_status = 'received'
        )::int AS received,

        COUNT(*) FILTER (
          WHERE o.order_status = 'preparing'
        )::int AS preparing,

        COUNT(*) FILTER (
          WHERE o.order_status = 'out_for_delivery'
        )::int AS out_for_delivery,

        -- "Entregues" representa os pedidos finalizados hoje.
        -- Usamos updated_at porque um pedido pode ter sido criado
        -- ontem e ser entregue somente hoje.
        COUNT(*) FILTER (
          WHERE o.order_status = 'delivered'
            AND o.updated_at >= l.inicio_hoje
            AND o.updated_at < l.inicio_amanha
        )::int AS delivered
      FROM orders o
      CROSS JOIN limites_dia l
      ${summaryScope}
    `, summaryParams);

    return res.json({
      ok: true,
      orders: result.rows.map((row) => ({
        ...mapOrder(row),
        itemQuantity: Number(row.item_quantity || 0)
      })),
      summary: summaryResult.rows[0] || {
        total: 0,
        received: 0,
        preparing: 0,
        out_for_delivery: 0,
        delivered: 0
      }
    });
  } catch (error) {
    console.error("GET /api/admin/orders:", error);
    return res.status(500).json({
      ok: false,
      message: "Erro ao carregar os pedidos."
    });
  }
});

router.get(
  "/api/admin/orders/:orderNumber",
  autenticarAdmin,
  async (req, res) => {
    try {
      await ensureStoreInventorySchema();
      if (req.adminRole === "operator" && (!req.adminUnitId || !STORE_UNITS.some((unit) => unit.id === req.adminUnitId))) {
        return res.status(403).json({ ok: false, message: "Operador sem unidade vinculada." });
      }

      const orderParams = [req.params.orderNumber];
      const unitScope = req.adminRole === "operator"
        ? `AND unit_id = $2`
        : "";
      if (req.adminRole === "operator") orderParams.push(req.adminUnitId);

      const orderResult = await db.query(
        `
          SELECT
            id,
            order_number,
            unit_id,
            customer_name,
            customer_phone,
            customer_email,
            delivery_address,
            delivery_reference,
            delivery_fee,
            subtotal,
            total,
            payment_method,
            payment_status,
            order_status,
            notes,
            created_at,
            updated_at
          FROM orders
          WHERE order_number = $1
            ${unitScope}
          LIMIT 1
        `,
        orderParams
      );

      if (!orderResult.rows.length) {
        return res.status(404).json({
          ok: false,
          message: "Pedido não encontrado."
        });
      }

      const row = orderResult.rows[0];
      const itemsResult = await db.query(
        `
          SELECT
            product_id,
            product_name,
            unit_price,
            quantity,
            subtotal
          FROM order_items
          WHERE order_id = $1
          ORDER BY id ASC
        `,
        [row.id]
      );

      return res.json({
        ok: true,
        order: {
          ...mapOrder(row),
          items: itemsResult.rows.map((item) => ({
            productId:
              item.product_id == null ? null : Number(item.product_id),
            productName: item.product_name,
            unitPrice: Number(item.unit_price),
            quantity: Number(item.quantity),
            subtotal: Number(item.subtotal)
          }))
        }
      });
    } catch (error) {
      console.error("GET /api/admin/orders/:orderNumber:", error);
      return res.status(500).json({
        ok: false,
        message: "Erro ao carregar o pedido."
      });
    }
  }
);

router.patch(
  "/api/admin/orders/:orderNumber/status",
  autenticarAdmin,
  async (req, res) => {
    try {
      const orderStatus = String(req.body?.orderStatus || "").trim();

      if (!ORDER_STATUSES.has(orderStatus)) {
        return res.status(400).json({
          ok: false,
          message: "Status do pedido inválido."
        });
      }

      const currentResult = await db.query(
        `
          SELECT id, unit_id, payment_status, order_status
          FROM orders
          WHERE order_number = $1
          LIMIT 1
        `,
        [req.params.orderNumber]
      );

      if (!currentResult.rows.length) {
        return res.status(404).json({
          ok: false,
          message: "Pedido não encontrado."
        });
      }

      const current = currentResult.rows[0];

      if (req.adminRole === "operator") {
        if (!req.adminUnitId || current.unit_id !== req.adminUnitId) {
          return res.status(403).json({
            ok: false,
            message: "Você só pode atualizar pedidos da sua unidade."
          });
        }
      }

      if (
        orderStatus !== "received" &&
        current.payment_status !== "approved"
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "Aguarde a aprovação do pagamento antes de avançar o pedido."
        });
      }

      const result = await db.query(
        `
          UPDATE orders
          SET order_status = $1,
              updated_at = NOW()
          WHERE order_number = $2
          RETURNING order_number, order_status, updated_at
        `,
        [orderStatus, req.params.orderNumber]
      );

      return res.json({
        ok: true,
        orderNumber: result.rows[0].order_number,
        orderStatus: result.rows[0].order_status,
        updatedAt: result.rows[0].updated_at
      });
    } catch (error) {
      console.error("PATCH /api/admin/orders/:orderNumber/status:", error);
      return res.status(500).json({
        ok: false,
        message: "Erro ao atualizar o status do pedido."
      });
    }
  }
);


function parseMoney(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    const error = new Error(`${fieldName} inválido.`);
    error.status = 400;
    throw error;
  }
  return Number(number.toFixed(2));
}

function parseStock(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    const error = new Error("Estoque inválido.");
    error.status = 400;
    throw error;
  }
  return number;
}

function parseOptionalDate(value, fieldName) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} inválida.`);
    error.status = 400;
    throw error;
  }
  return date.toISOString();
}

function validatePromotion(body, regularPrice) {
  const active = Boolean(body?.promotionActive);
  const priceRaw = body?.promotionPrice;
  const promotionPrice = priceRaw === "" || priceRaw == null
    ? null
    : parseMoney(priceRaw, "Preço promocional");
  const startsAt = parseOptionalDate(body?.promotionStartsAt, "Data inicial da promoção");
  const endsAt = parseOptionalDate(body?.promotionEndsAt, "Data final da promoção");

  if (active) {
    if (promotionPrice == null) {
      const error = new Error("Informe o preço promocional.");
      error.status = 400;
      throw error;
    }

    if (promotionPrice >= regularPrice) {
      const error = new Error("O preço promocional deve ser menor que o preço normal.");
      error.status = 400;
      throw error;
    }
  }

  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    const error = new Error("A data final da promoção deve ser posterior à data inicial.");
    error.status = 400;
    throw error;
  }

  return {
    promotionActive: active,
    promotionPrice,
    promotionStartsAt: startsAt,
    promotionEndsAt: endsAt
  };
}

function promotionRunningFromRow(row) {
  if (row.promotion_running != null) {
    return Boolean(row.promotion_running);
  }

  if (!row.promotion_active || row.promotion_price == null) return false;
  if (Number(row.promotion_price) >= Number(row.price)) return false;

  const now = Date.now();
  if (row.promotion_starts_at && new Date(row.promotion_starts_at).getTime() > now) return false;
  if (row.promotion_ends_at && new Date(row.promotion_ends_at).getTime() < now) return false;
  return true;
}

function mapManagerProduct(row) {
  const rawUnitStock = row.unit_stock && typeof row.unit_stock === "object"
    ? row.unit_stock
    : {};

  const unitStock = Object.fromEntries(
    STORE_UNITS.map((unit) => {
      const entry = rawUnitStock[unit.id] || {};
      return [unit.id, {
        stockQuantity: Number(entry.stockQuantity ?? entry.stock_quantity ?? 0),
        active: entry.active !== false
      }];
    })
  );

  return {
    id: Number(row.id),
    name: row.name,
    description: row.description || "",
    category: row.category || "",
    price: Number(row.price),
    stockQuantity: Object.values(unitStock).reduce(
      (total, entry) => total + Number(entry.stockQuantity || 0),
      0
    ),
    unitStock,
    imageUrl: row.image_url || null,
    active: Boolean(row.active),
    promotionPrice: row.promotion_price == null ? null : Number(row.promotion_price),
    promotionActive: Boolean(row.promotion_active),
    promotionStartsAt: row.promotion_starts_at || null,
    promotionEndsAt: row.promotion_ends_at || null,
    promotionRunning: promotionRunningFromRow(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function saveProductImage(imageData) {
  if (!imageData) return null;

  const match = String(imageData).match(
    /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/
  );

  if (!match) {
    const error = new Error("Imagem inválida. Use JPG, PNG ou WEBP.");
    error.status = 400;
    throw error;
  }

  const extensionMap = {
    jpeg: "jpg",
    jpg: "jpg",
    png: "png",
    webp: "webp"
  };

  const buffer = Buffer.from(match[2], "base64");

  if (!buffer.length || buffer.length > 2.5 * 1024 * 1024) {
    const error = new Error("A imagem deve ter no máximo 2,5 MB após o redimensionamento.");
    error.status = 400;
    throw error;
  }

  const extension = extensionMap[match[1]];
  const fileName = `${randomUUID()}.${extension}`;
  const uploadDirectory = path.join(__dirname, "../../public/uploads/products");

  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadDirectory, fileName), buffer);

  return `/uploads/products/${fileName}`;
}

async function removeLocalProductImage(imageUrl) {
  const value = String(imageUrl || "");

  if (!value.startsWith("/uploads/products/")) return;

  const fileName = path.basename(value);
  const filePath = path.join(__dirname, "../../public/uploads/products", fileName);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Removendo imagem do produto:", error);
    }
  }
}

router.get(
  "/api/admin/manager/products",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await Promise.all([
        ensureCatalogSchema(),
        ensureStoreInventorySchema()
      ]);
      const promo = promotionCondition("p");

      const result = await db.query(`
        SELECT
          p.id,
          p.name,
          p.description,
          p.category,
          p.price,
          p.stock_quantity,
          COALESCE((
            SELECT jsonb_object_agg(
              s.store_id,
              jsonb_build_object(
                'stockQuantity', s.stock_quantity,
                'active', s.active
              )
            )
            FROM store_product_stock s
            WHERE s.product_id = p.id
          ), '{}'::jsonb) AS unit_stock,
          p.image_url,
          p.active,
          p.promotion_price,
          p.promotion_active,
          p.promotion_starts_at,
          p.promotion_ends_at,
          CASE WHEN ${promo} THEN TRUE ELSE FALSE END AS promotion_running,
          p.created_at,
          p.updated_at
        FROM products p
        ORDER BY p.active DESC, p.name ASC
      `);

      const categories = await listActiveCategories();

      return res.json({
        ok: true,
        products: result.rows.map(mapManagerProduct),
        categories
      });
    } catch (error) {
      console.error("GET /api/admin/manager/products:", error);
      return res.status(500).json({
        ok: false,
        message: "Erro ao carregar os produtos."
      });
    }
  }
);

router.post(
  "/api/admin/manager/products",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await Promise.all([
        ensureCatalogSchema(),
        ensureStoreInventorySchema()
      ]);

      const name = String(req.body?.name || "").trim();
      const description = String(req.body?.description || "").trim();
      const category = String(req.body?.category || "").trim();
      const price = parseMoney(req.body?.price, "Preço");
      const unitStock = normalizeProductInventory(req.body?.unitStock || {});
      const active = req.body?.active !== false;

      if (!name) {
        return res.status(400).json({ ok: false, message: "Informe o nome do produto." });
      }

      if (!category) {
        return res.status(400).json({ ok: false, message: "Selecione uma categoria." });
      }

      await ensureCategory(category);
      const promotion = validatePromotion(req.body, price);
      const imageUrl = await saveProductImage(req.body?.imageData);

      const result = await db.query(
        `
          INSERT INTO products (
            name,
            description,
            category,
            price,
            stock_quantity,
            image_url,
            active,
            promotion_price,
            promotion_active,
            promotion_starts_at,
            promotion_ends_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          RETURNING *
        `,
        [
          name,
          description || null,
          category,
          price,
          0,
          imageUrl,
          active,
          promotion.promotionPrice,
          promotion.promotionActive,
          promotion.promotionStartsAt,
          promotion.promotionEndsAt
        ]
      );

      await setProductInventory(result.rows[0].id, unitStock);

      return res.status(201).json({
        ok: true,
        product: mapManagerProduct({
          ...result.rows[0],
          unit_stock: unitStock
        })
      });
    } catch (error) {
      console.error("POST /api/admin/manager/products:", error);
      return res.status(error.status || 500).json({
        ok: false,
        message: error.status ? error.message : "Erro ao cadastrar o produto."
      });
    }
  }
);

router.put(
  "/api/admin/manager/products/:id",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await Promise.all([
        ensureCatalogSchema(),
        ensureStoreInventorySchema()
      ]);

      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, message: "Produto inválido." });
      }

      const currentResult = await db.query(
        `SELECT * FROM products WHERE id = $1 LIMIT 1`,
        [id]
      );

      if (!currentResult.rows.length) {
        return res.status(404).json({ ok: false, message: "Produto não encontrado." });
      }

      const current = currentResult.rows[0];
      const name = String(req.body?.name || "").trim();
      const description = String(req.body?.description || "").trim();
      const category = String(req.body?.category || "").trim();
      const price = parseMoney(req.body?.price, "Preço");
      const unitStock = normalizeProductInventory(req.body?.unitStock || {});
      const active = req.body?.active !== false;

      if (!name) {
        return res.status(400).json({ ok: false, message: "Informe o nome do produto." });
      }

      if (!category) {
        return res.status(400).json({ ok: false, message: "Selecione uma categoria." });
      }

      await ensureCategory(category);
      const promotion = validatePromotion(req.body, price);

      let imageUrl = current.image_url || null;
      let oldImageToRemove = null;

      if (req.body?.removeImage) {
        oldImageToRemove = imageUrl;
        imageUrl = null;
      }

      if (req.body?.imageData) {
        const newImageUrl = await saveProductImage(req.body.imageData);
        oldImageToRemove = imageUrl;
        imageUrl = newImageUrl;
      }

      const result = await db.query(
        `
          UPDATE products
          SET
            name = $1,
            description = $2,
            category = $3,
            price = $4,
            stock_quantity = $5,
            image_url = $6,
            active = $7,
            promotion_price = $8,
            promotion_active = $9,
            promotion_starts_at = $10,
            promotion_ends_at = $11,
            updated_at = NOW()
          WHERE id = $12
          RETURNING *
        `,
        [
          name,
          description || null,
          category,
          price,
          0,
          imageUrl,
          active,
          promotion.promotionPrice,
          promotion.promotionActive,
          promotion.promotionStartsAt,
          promotion.promotionEndsAt,
          id
        ]
      );

      if (oldImageToRemove && oldImageToRemove !== imageUrl) {
        await removeLocalProductImage(oldImageToRemove);
      }

      await setProductInventory(id, unitStock);

      return res.json({
        ok: true,
        product: mapManagerProduct({
          ...result.rows[0],
          unit_stock: unitStock
        })
      });
    } catch (error) {
      console.error("PUT /api/admin/manager/products/:id:", error);
      return res.status(error.status || 500).json({
        ok: false,
        message: error.status ? error.message : "Erro ao atualizar o produto."
      });
    }
  }
);

router.patch(
  "/api/admin/manager/products/:id/stock",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      await ensureStoreInventorySchema();
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, message: "Produto inválido." });
      }

      const inventory = await updateProductUnitInventory(
        id,
        req.body?.unitId,
        {
          stockQuantity: req.body?.stockQuantity,
          active: req.body?.active !== false
        }
      );

      return res.json({
        ok: true,
        ...inventory
      });
    } catch (error) {
      console.error("PATCH /api/admin/manager/products/:id/stock:", error);
      return res.status(error.status || 500).json({
        ok: false,
        message: error.status ? error.message : "Erro ao atualizar o estoque."
      });
    }
  }
);

router.get(
  "/api/admin/manager/categories",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      const categories = await listActiveCategories();
      return res.json({ ok: true, categories });
    } catch (error) {
      console.error("GET /api/admin/manager/categories:", error);
      return res.status(500).json({ ok: false, message: "Erro ao carregar as categorias." });
    }
  }
);

router.post(
  "/api/admin/manager/categories",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim();
      const icon = String(req.body?.icon || "").trim().toLowerCase();

      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({
          ok: false,
          message: "Informe uma categoria entre 2 e 100 caracteres."
        });
      }

      if (!isCategoryIconKey(icon)) {
        return res.status(400).json({
          ok: false,
          message: "Escolha um ícone para a categoria."
        });
      }

      const category = await ensureCategory(name, icon);

      return res.status(201).json({
        ok: true,
        category: {
          id: Number(category.id),
          name: category.name,
          icon: category.icon_key || icon,
          active: true,
          sortOrder: Number(category.sort_order || 0)
        }
      });
    } catch (error) {
      console.error("POST /api/admin/manager/categories:", error);
      return res.status(500).json({ ok: false, message: "Erro ao criar a categoria." });
    }
  }
);

router.patch(
  "/api/admin/manager/categories/:id/icon",
  autenticarAdmin,
  exigirGerente,
  async (req, res) => {
    try {
      const icon = String(req.body?.icon || "").trim().toLowerCase();

      if (!isCategoryIconKey(icon)) {
        return res.status(400).json({
          ok: false,
          message: "Selecione um ícone válido para a categoria."
        });
      }

      const category = await updateCategoryIcon(req.params.id, icon);
      return res.json({ ok: true, category });
    } catch (error) {
      console.error("PATCH /api/admin/manager/categories/:id/icon:", error);
      return res.status(error.status || 500).json({
        ok: false,
        message: error.status ? error.message : "Erro ao atualizar o ícone da categoria."
      });
    }
  }
);

module.exports = router;
