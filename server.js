require("dotenv").config();

const db = require("./database/db");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID } = require("crypto");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MP_API = "https://api.mercadopago.com";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// =========================
// AUTENTICAÇÃO DO CLIENTE
// =========================

const AUTH_COOKIE = "polo_norte_token";

function criarTokenCliente(clienteId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não configurado.");
  }

  return jwt.sign(
    {
      tipo: "cliente"
    },
    process.env.JWT_SECRET,
    {
      subject: String(clienteId),
      expiresIn: "30d"
    }
  );
}

function salvarCookieLogin(res, token) {
  res.cookie(
    AUTH_COOKIE,
    token,
    {
      httpOnly: true,
      sameSite: "lax",

      secure:
        process.env.NODE_ENV === "production",

      maxAge:
        30 * 24 * 60 * 60 * 1000,

      path: "/"
    }
  );
}

function autenticarCliente(req, res, next) {
  try {
    const token =
      req.cookies?.[AUTH_COOKIE];

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: "Cliente não autenticado."
      });
    }

    const dados = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (dados.tipo !== "cliente") {
      return res.status(401).json({
        ok: false,
        message: "Sessão inválida."
      });
    }

    req.customerId = dados.sub;

    next();

  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: "Sessão inválida ou expirada."
    });
  }
}
function identificarClienteOpcional(req, res, next) {
  try {
    const token =
      req.cookies?.[AUTH_COOKIE];

    // Sem login: continua como visitante
    if (!token) {
      req.customerId = null;
      return next();
    }

    const dados = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Cookie existe, mas não é de cliente
    if (dados.tipo !== "cliente") {
      req.customerId = null;
      return next();
    }

    // Cliente logado
    req.customerId = dados.sub;

    next();

  } catch (error) {
    // Token inválido/expirado:
    // não bloqueia a compra como visitante
    req.customerId = null;
    next();
  }
}

const money = (value) =>
  Number(Number(value).toFixed(2));

// =========================
// PEDIDOS - POSTGRESQL
// =========================

async function findOrder(orderId) {
  const result = await db.query(
    `
      SELECT
        id,
        order_number AS "orderNumber",
        mercado_pago_order_id AS "mercadoPagoOrderId",
        mercado_pago_payment_id AS "mercadoPagoPaymentId",
        payment_status AS status,
        payment_status_detail AS "statusDetail",
        test_approved AS "testApproved"
      FROM orders
      WHERE mercado_pago_order_id = $1
      LIMIT 1
    `,
    [String(orderId)]
  );

  return result.rows[0] || null;
}

async function saveOrderToDatabase({
  orderNumber,
  mpOrder,
  payment,
  status,
  statusDetail,
  metodo,
  endereco,
  cart,
  customerId,
  customerAddressId
}) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const deliveryAddress = [
      `${endereco.rua}, ${endereco.numero}`,
      endereco.complemento
        ? ` - ${endereco.complemento}`
        : "",
      ` - ${endereco.bairro}`,
      endereco.cidade
        ? ` - ${endereco.cidade}${endereco.uf ? `/${endereco.uf}` : ""}`
        : "",
      endereco.cep
        ? ` - CEP ${endereco.cep}`
        : ""
    ].join("");

    const paymentId =
      payment?.id != null
        ? String(payment.id)
        : null;

    const orderResult =
  await client.query(
    `
      INSERT INTO orders (
        order_number,
        customer_id,
        customer_address_id,
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
        payment_status_detail,
        order_status,
        mercado_pago_order_id,
        mercado_pago_payment_id
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16
      )
      RETURNING id
    `,
    [
      orderNumber,
      customerId || null,
      endereco.nome,
      endereco.whatsapp,
      endereco.email || null,
      deliveryAddress,
      endereco.referencia || null,
      cart.entrega,
      cart.subtotal,
      cart.total,
      metodo,
      status,
      statusDetail || null,
      "received",
      String(mpOrder.id),
      paymentId
    ]
  );
    const databaseOrderId =
      orderResult.rows[0].id;

    for (const item of cart.itens) {
      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            subtotal
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          databaseOrderId,
          item.id,
          item.nome,
          item.precoUnitario,
          item.quantidade,
          money(
            item.precoUnitario *
            item.quantidade
          )
        ]
      );
    }

  const approvedAt =
  status === "approved"
    ? new Date()
    : null;

await client.query(
  `
    INSERT INTO payments (
      order_id,
      provider,
      external_payment_id,
      payment_method,
      status,
      amount,
      approved_at
    )
    VALUES (
      $1,
      'mercado_pago',
      $2,
      $3,
      $4,
      $5,
      $6
    )
  `,
  [
    databaseOrderId,
    paymentId,
    metodo,
    status,
    cart.total,
    approvedAt
  ]
);

    await client.query("COMMIT");

    return databaseOrderId;

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;

  } finally {
    client.release();
  }
}
const units = {
  julio: {
    nome: "Júlio de Mesquita",
    taxa: 0
  },

  vila: {
    nome: "Vila Helena",
    taxa: 0
  },

  divino: {
    nome: "Largo do Divino",
    taxa: 0
  }
};


// =========================
// CARRINHO
// =========================

async function calculateCart(items, unitId) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Carrinho vazio.");
  }

  const unit = units[unitId];

  if (!unit) {
    throw new Error("Unidade inválida.");
  }

  const ids = items.map((item) => Number(item.id));

  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("Produto inválido no carrinho.");
  }

  const result = await db.query(
    `
      SELECT
        id,
        name,
        price::float AS price,
        stock_quantity,
        active
      FROM products
      WHERE id = ANY($1::bigint[])
        AND active = TRUE
    `,
    [ids]
  );

  const productsById = new Map(
    result.rows.map((product) => [
      Number(product.id),
      product
    ])
  );

  let subtotal = 0;

  const itens = items.map((item) => {
    const product = productsById.get(
      Number(item.id)
    );

    const quantidade = Number(item.quantidade);

    if (!product) {
      throw new Error(
        `Produto indisponível: ${item.id}`
      );
    }

    if (
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > 99
    ) {
      throw new Error(
        `Quantidade inválida para ${product.name}.`
      );
    }

    if (quantidade > product.stock_quantity) {
      throw new Error(
        `Estoque insuficiente para ${product.name}. Disponível: ${product.stock_quantity}.`
      );
    }

    subtotal += product.price * quantidade;

    return {
      id: Number(product.id),
      nome: product.name,
      quantidade,
      precoUnitario: product.price
    };
  });

  const entrega = unit.taxa;

  return {
    itens,
    subtotal: money(subtotal),
    entrega: money(entrega),
    total: money(subtotal + entrega),
    unidade: unit
  };
}


// =========================
// MERCADO PAGO
// =========================

function mpHeaders(idempotencyKey) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error(
      "MERCADO_PAGO_ACCESS_TOKEN não configurado."
    );
  }

  return {
    "Content-Type": "application/json",
    Authorization:
      `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
    ...(idempotencyKey && {
      "X-Idempotency-Key": idempotencyKey
    })
  };
}

async function mpRequest(
  endpoint,
  { method = "GET", body, idempotencyKey } = {}
) {
  const response = await fetch(
    `${MP_API}${endpoint}`,
    {
      method,
      headers: mpHeaders(idempotencyKey),
      ...(body && {
        body: JSON.stringify(body)
      })
    }
  );

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(
      data.message ||
      data.error ||
      data.cause?.[0]?.description ||
      data.raw ||
      `Erro Mercado Pago: ${response.status}`
    );

    error.status = response.status;
    error.details = data;

    throw error;
  }

  return data;
}


// =========================
// STATUS
// =========================

function normalizeStatus(status) {
  const statuses = {
    processed: "approved",
    created: "pending",
    action_required: "pending",
    cancelled: "cancelled",
    expired: "cancelled",
    rejected: "rejected"
  };

  return statuses[status] || status;
}

function getPaymentStatus(mpOrder) {
  const payment =
    mpOrder?.transactions?.payments?.[0] || {};

  const rawStatus =
    payment.status ||
    mpOrder.status ||
    "pending";

  return {
    payment,

    status: normalizeStatus(rawStatus),

    statusDetail:
      payment.status_detail ||
      mpOrder.status_detail ||
      null
  };
}

async function getMpOrder(orderId) {
  return mpRequest(
    `/v1/orders/${encodeURIComponent(orderId)}`
  );
}

async function updateLocalOrder(
  orderId,
  payment,
  status,
  statusDetail
) {
  const paymentId =
    payment?.id != null
      ? String(payment.id)
      : null;

  const approvedAt =
    status === "approved"
      ? new Date()
      : null;

  // Atualiza o pedido
  const result = await db.query(
    `
      UPDATE orders
      SET
        payment_status = $2,
        payment_status_detail = $3,
        mercado_pago_payment_id =
          COALESCE($4, mercado_pago_payment_id),
        updated_at = NOW()
      WHERE mercado_pago_order_id = $1
      RETURNING
        id,
        order_number AS "orderNumber",
        mercado_pago_order_id AS "mercadoPagoOrderId",
        mercado_pago_payment_id AS "mercadoPagoPaymentId",
        payment_status AS status,
        payment_status_detail AS "statusDetail",
        test_approved AS "testApproved"
    `,
    [
      String(orderId),
      String(status),
      statusDetail ? String(statusDetail) : null,
      paymentId
    ]
  );

  const order = result.rows[0];

  if (!order) {
    return null;
  }

  // Atualiza o pagamento
  await db.query(
    `
      UPDATE payments
      SET
        external_payment_id =
          COALESCE($2, external_payment_id),

        status = $3,

        approved_at =
          COALESCE($4, approved_at),

        updated_at = NOW()

      WHERE order_id = $1
    `,
    [
      order.id,
      paymentId,
      String(status),
      approvedAt
    ]
  );

  return order;
}

// =========================
// HEALTH
// =========================

app.get("/api/health", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT NOW() AS database_time"
    );

    res.json({
      ok: true,
      service: "Polo Norte Bebidas API",

      database: {
        connected: true,
        time: result.rows[0].database_time
      },

      mercadoPagoConfigured: Boolean(
        process.env.MERCADO_PAGO_ACCESS_TOKEN
      )
    });

  } catch (error) {
    console.error("Erro PostgreSQL:", error);

    res.status(500).json({
      ok: false,
      service: "Polo Norte Bebidas API",

      database: {
        connected: false
      },

      message: "Não foi possível conectar ao PostgreSQL."
    });
  }
});


// =========================
// CONFIG
// =========================

app.get("/api/config", (req, res) => {
  res.json({
    publicKey:
      process.env.MERCADO_PAGO_PUBLIC_KEY || ""
  });
});

// =========================
// CADASTRO DO CLIENTE
// =========================

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      nome,
      email,
      whatsapp,
      senha
    } = req.body;

    const nomeLimpo =
      String(nome || "").trim();

    const emailLimpo =
      String(email || "")
        .trim()
        .toLowerCase();

    const telefoneLimpo =
      String(whatsapp || "")
        .replace(/\D/g, "");

    const senhaLimpa =
      String(senha || "");

    if (nomeLimpo.length < 2) {
      return res.status(400).json({
        message: "Informe seu nome."
      });
    }

    if (
      !/^\S+@\S+\.\S+$/.test(emailLimpo)
    ) {
      return res.status(400).json({
        message: "Informe um e-mail válido."
      });
    }

    if (
      telefoneLimpo.length < 10 ||
      telefoneLimpo.length > 11
    ) {
      return res.status(400).json({
        message: "Informe um WhatsApp válido."
      });
    }

    if (senhaLimpa.length < 8) {
      return res.status(400).json({
        message:
          "A senha deve ter pelo menos 8 caracteres."
      });
    }

    const existente =
      await db.query(
        `
          SELECT id
          FROM customers
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [emailLimpo]
      );

    if (existente.rows.length) {
      return res.status(409).json({
        message:
          "Já existe uma conta com este e-mail."
      });
    }

    const passwordHash =
      await bcrypt.hash(
        senhaLimpa,
        12
      );

    const resultado =
      await db.query(
        `
          INSERT INTO customers (
            name,
            email,
            phone,
            password_hash
          )
          VALUES ($1, $2, $3, $4)

          RETURNING
            id,
            name,
            email,
            phone
        `,
        [
          nomeLimpo,
          emailLimpo,
          telefoneLimpo,
          passwordHash
        ]
      );

    const cliente =
      resultado.rows[0];

    const token =
      criarTokenCliente(cliente.id);

    salvarCookieLogin(
      res,
      token
    );

    return res.status(201).json({
      ok: true,

      cliente: {
        id: cliente.id,
        nome: cliente.name,
        email: cliente.email,
        whatsapp: cliente.phone
      }
    });

  } catch (error) {
    console.error(
      "POST /api/auth/register:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Já existe uma conta com este e-mail."
      });
    }

    return res.status(500).json({
      message:
        "Erro ao criar conta."
    });
  }
});


// =========================
// LOGIN
// =========================

app.post("/api/auth/login", async (req, res) => {
  try {
    const email =
      String(req.body?.email || "")
        .trim()
        .toLowerCase();

    const senha =
      String(req.body?.senha || "");

    if (!email || !senha) {
      return res.status(400).json({
        message:
          "Informe e-mail e senha."
      });
    }

    const resultado =
      await db.query(
        `
          SELECT
            id,
            name,
            email,
            phone,
            password_hash,
            active
          FROM customers
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [email]
      );

    const cliente =
      resultado.rows[0];

    if (!cliente) {
      return res.status(401).json({
        message:
          "E-mail ou senha incorretos."
      });
    }

    if (!cliente.active) {
      return res.status(403).json({
        message:
          "Esta conta está desativada."
      });
    }

    const senhaCorreta =
      await bcrypt.compare(
        senha,
        cliente.password_hash
      );

    if (!senhaCorreta) {
      return res.status(401).json({
        message:
          "E-mail ou senha incorretos."
      });
    }

    const token =
      criarTokenCliente(cliente.id);

    salvarCookieLogin(
      res,
      token
    );

    return res.json({
      ok: true,

      cliente: {
        id: cliente.id,
        nome: cliente.name,
        email: cliente.email,
        whatsapp: cliente.phone
      }
    });

  } catch (error) {
    console.error(
      "POST /api/auth/login:",
      error
    );

    return res.status(500).json({
      message:
        "Erro ao entrar na conta."
    });
  }
});


// =========================
// CLIENTE LOGADO
// =========================

app.get(
  "/api/auth/me",
  autenticarCliente,
  async (req, res) => {
    try {
      const resultado =
        await db.query(
          `
            SELECT
              id,
              name,
              email,
              phone
            FROM customers
            WHERE id = $1
              AND active = TRUE
            LIMIT 1
          `,
          [req.customerId]
        );

      const cliente =
        resultado.rows[0];

      if (!cliente) {
        return res.status(404).json({
          message:
            "Cliente não encontrado."
        });
      }

      return res.json({
        ok: true,

        cliente: {
          id: cliente.id,
          nome: cliente.name,
          email: cliente.email,
          whatsapp: cliente.phone
        }
      });

    } catch (error) {
      console.error(
        "GET /api/auth/me:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao carregar cliente."
      });
    }
  }
);


// =========================
// LOGOUT
// =========================

app.post("/api/auth/logout", (req, res) => {

  res.clearCookie(
    AUTH_COOKIE,
    {
      httpOnly: true,
      sameSite: "lax",

      secure:
        process.env.NODE_ENV === "production",

      path: "/"
    }
  );

  return res.json({
    ok: true,
    message: "Logout realizado."
  });
});

// =========================
// ENDEREÇO DO CLIENTE
// =========================

app.get(
  "/api/customer/address",
  autenticarCliente,
  async (req, res) => {
    try {
      const resultado = await db.query(
        `
          SELECT
            id,
            recipient_name,
            zip_code,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            reference
          FROM customer_addresses
          WHERE customer_id = $1
            AND active = TRUE
          ORDER BY is_default DESC, id DESC
          LIMIT 1
        `,
        [req.customerId]
      );

      return res.json({
        ok: true,
        endereco: resultado.rows[0] || null
      });

    } catch (error) {
      console.error(
        "GET /api/customer/address:",
        error
      );

      return res.status(500).json({
        message: "Erro ao carregar endereço."
      });
    }
  }
);


app.post(
  "/api/customer/address",
  autenticarCliente,
  async (req, res) => {
    try {
      const {
        nome,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        uf,
        complemento,
        referencia
      } = req.body;

      if (
        !nome ||
        !cep ||
        !rua ||
        !numero ||
        !bairro
      ) {
        return res.status(400).json({
          message:
            "Preencha os dados obrigatórios do endereço."
        });
      }

      const existente = await db.query(
        `
          SELECT id
          FROM customer_addresses
          WHERE customer_id = $1
            AND is_default = TRUE
            AND active = TRUE
          LIMIT 1
        `,
        [req.customerId]
      );

      let resultado;

      if (existente.rows.length) {

        resultado = await db.query(
          `
            UPDATE customer_addresses
            SET
              recipient_name = $2,
              zip_code = $3,
              street = $4,
              number = $5,
              complement = $6,
              neighborhood = $7,
              city = $8,
              state = $9,
              reference = $10,
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `,
          [
            existente.rows[0].id,
            nome,
            cep,
            rua,
            numero,
            complemento || null,
            bairro,
            cidade || null,
            uf || null,
            referencia || null
          ]
        );

      } else {

        resultado = await db.query(
          `
            INSERT INTO customer_addresses (
              customer_id,
              label,
              recipient_name,
              zip_code,
              street,
              number,
              complement,
              neighborhood,
              city,
              state,
              reference,
              is_default,
              active
            )
            VALUES (
              $1,
              'Principal',
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              TRUE,
              TRUE
            )
            RETURNING *
          `,
          [
            req.customerId,
            nome,
            cep,
            rua,
            numero,
            complemento || null,
            bairro,
            cidade || null,
            uf || null,
            referencia || null
          ]
        );
      }

      return res.json({
        ok: true,
        endereco: resultado.rows[0]
      });

    } catch (error) {
      console.error(
        "POST /api/customer/address:",
        error
      );

      return res.status(500).json({
        message: "Erro ao salvar endereço."
      });
    }
  }
);
// =========================================
// VÁRIOS ENDEREÇOS DO CLIENTE
// =========================================


// LISTAR TODOS OS ENDEREÇOS
app.get(
  "/api/customer/addresses",
  autenticarCliente,
  async (req, res) => {
    try {
      const resultado = await db.query(
        `
          SELECT
            id,
            label,
            recipient_name,
            zip_code,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            reference,
            is_default
          FROM customer_addresses
          WHERE customer_id = $1
            AND active = TRUE
          ORDER BY is_default DESC, id DESC
        `,
        [req.customerId]
      );

      return res.json({
        ok: true,
        enderecos: resultado.rows
      });

    } catch (error) {
      console.error(
        "GET /api/customer/addresses:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao carregar endereços."
      });
    }
  }
);


// CRIAR NOVO ENDEREÇO
app.post(
  "/api/customer/addresses",
  autenticarCliente,
  async (req, res) => {
    const client = await db.connect();

    try {
      const {
        label,
        nome,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        uf,
        complemento,
        referencia,
        principal
      } = req.body;

      if (
        !nome ||
        !cep ||
        !rua ||
        !numero ||
        !bairro
      ) {
        return res.status(400).json({
          message:
            "Preencha os dados obrigatórios."
        });
      }

      await client.query("BEGIN");

      // Verifica se é o primeiro endereço
      const quantidade =
        await client.query(
          `
            SELECT COUNT(*)::int AS total
            FROM customer_addresses
            WHERE customer_id = $1
              AND active = TRUE
          `,
          [req.customerId]
        );

      const primeiroEndereco =
        quantidade.rows[0].total === 0;

      const seraPrincipal =
        primeiroEndereco ||
        principal === true;

      // Se este será principal,
      // remove o principal dos outros
      if (seraPrincipal) {
        await client.query(
          `
            UPDATE customer_addresses
            SET
              is_default = FALSE,
              updated_at = NOW()
            WHERE customer_id = $1
              AND active = TRUE
          `,
          [req.customerId]
        );
      }

      const resultado =
        await client.query(
          `
            INSERT INTO customer_addresses (
              customer_id,
              label,
              recipient_name,
              zip_code,
              street,
              number,
              complement,
              neighborhood,
              city,
              state,
              reference,
              is_default,
              active
            )
            VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              $11, $12, TRUE
            )
            RETURNING *
          `,
          [
            req.customerId,
            String(label || "Endereço").trim(),
            nome,
            cep,
            rua,
            numero,
            complemento || null,
            bairro,
            cidade || null,
            uf || null,
            referencia || null,
            seraPrincipal
          ]
        );

      await client.query("COMMIT");

      return res.status(201).json({
        ok: true,
        endereco: resultado.rows[0]
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "POST /api/customer/addresses:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao adicionar endereço."
      });

    } finally {
      client.release();
    }
  }
);


// EDITAR UM ENDEREÇO
app.put(
  "/api/customer/addresses/:id",
  autenticarCliente,
  async (req, res) => {
    try {
      const {
        label,
        nome,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        uf,
        complemento,
        referencia
      } = req.body;

      if (
        !nome ||
        !cep ||
        !rua ||
        !numero ||
        !bairro
      ) {
        return res.status(400).json({
          message:
            "Preencha os dados obrigatórios."
        });
      }

      const resultado =
        await db.query(
          `
            UPDATE customer_addresses
            SET
              label = $3,
              recipient_name = $4,
              zip_code = $5,
              street = $6,
              number = $7,
              complement = $8,
              neighborhood = $9,
              city = $10,
              state = $11,
              reference = $12,
              updated_at = NOW()
            WHERE id = $1
              AND customer_id = $2
              AND active = TRUE
            RETURNING *
          `,
          [
            req.params.id,
            req.customerId,
            String(label || "Endereço").trim(),
            nome,
            cep,
            rua,
            numero,
            complemento || null,
            bairro,
            cidade || null,
            uf || null,
            referencia || null
          ]
        );

      if (!resultado.rows.length) {
        return res.status(404).json({
          message:
            "Endereço não encontrado."
        });
      }

      return res.json({
        ok: true,
        endereco: resultado.rows[0]
      });

    } catch (error) {
      console.error(
        "PUT /api/customer/addresses/:id:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao editar endereço."
      });
    }
  }
);


// DEFINIR ENDEREÇO PRINCIPAL
app.put(
  "/api/customer/addresses/:id/default",
  autenticarCliente,
  async (req, res) => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const existe =
        await client.query(
          `
            SELECT id
            FROM customer_addresses
            WHERE id = $1
              AND customer_id = $2
              AND active = TRUE
            LIMIT 1
          `,
          [
            req.params.id,
            req.customerId
          ]
        );

      if (!existe.rows.length) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message:
            "Endereço não encontrado."
        });
      }

      await client.query(
        `
          UPDATE customer_addresses
          SET
            is_default = FALSE,
            updated_at = NOW()
          WHERE customer_id = $1
            AND active = TRUE
        `,
        [req.customerId]
      );

      const resultado =
        await client.query(
          `
            UPDATE customer_addresses
            SET
              is_default = TRUE,
              updated_at = NOW()
            WHERE id = $1
              AND customer_id = $2
            RETURNING *
          `,
          [
            req.params.id,
            req.customerId
          ]
        );

      await client.query("COMMIT");

      return res.json({
        ok: true,
        endereco: resultado.rows[0]
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "PUT endereço principal:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao definir endereço principal."
      });

    } finally {
      client.release();
    }
  }
);


// EXCLUIR ENDEREÇO
app.delete(
  "/api/customer/addresses/:id",
  autenticarCliente,
  async (req, res) => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const resultado =
        await client.query(
          `
            UPDATE customer_addresses
            SET
              active = FALSE,
              updated_at = NOW()
            WHERE id = $1
              AND customer_id = $2
              AND active = TRUE
            RETURNING id, is_default
          `,
          [
            req.params.id,
            req.customerId
          ]
        );

      if (!resultado.rows.length) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message:
            "Endereço não encontrado."
        });
      }

      // Se apagou o principal,
      // define outro endereço como principal
      if (resultado.rows[0].is_default) {

        const proximo =
          await client.query(
            `
              SELECT id
              FROM customer_addresses
              WHERE customer_id = $1
                AND active = TRUE
              ORDER BY id DESC
              LIMIT 1
            `,
            [req.customerId]
          );

        if (proximo.rows.length) {
          await client.query(
            `
              UPDATE customer_addresses
              SET
                is_default = TRUE,
                updated_at = NOW()
              WHERE id = $1
            `,
            [proximo.rows[0].id]
          );
        }
      }

      await client.query("COMMIT");

      return res.json({
        ok: true,
        message:
          "Endereço removido."
      });

    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "DELETE endereço:",
        error
      );

      return res.status(500).json({
        message:
          "Erro ao remover endereço."
      });

    } finally {
      client.release();
    }
  }
);
// =========================
// PRODUTOS - POSTGRESQL
// =========================

app.get("/api/products", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        name AS nome,
        description AS detalhe,
        category AS categoria,
        price::float AS preco,
        stock_quantity AS estoque,
        image_url AS imagem,
        active AS ativo
      FROM products
      WHERE active = TRUE
      ORDER BY id
    `);

    res.json({
      ok: true,
      products: result.rows
    });

  } catch (error) {
    console.error("GET /api/products:", error);

    res.status(500).json({
      ok: false,
      message: "Erro ao buscar produtos."
    });
  }
});


// =========================
// CRIAR PEDIDO
// =========================

app.post(
  "/api/orders",
  identificarClienteOpcional,
  async (req, res) => {
  try {
   const {
  metodo,
  unidadeId,
  itens,
  endereco,
  enderecoId,
  pagamento
} = req.body;

    if (!["pix", "cartao"].includes(metodo)) {
      return res.status(400).json({
        message: "Método de pagamento inválido."
      });
    }

    const requiredAddress = [
      "nome",
      "email",
      "whatsapp",
      "cep",
      "rua",
      "numero",
      "bairro"
    ];

    const invalidAddress =
      requiredAddress.some(
        (field) => !endereco?.[field]
      );

    if (invalidAddress) {
      return res.status(400).json({
        message:
          "Preencha os dados obrigatórios de entrega."
      });
    }
let customerAddressId = null;

// Se estiver logado e enviou um endereço salvo,
// confirma que esse endereço realmente pertence ao cliente.
if (req.customerId && enderecoId) {
  const enderecoSalvo = await db.query(
    `
      SELECT id
      FROM customer_addresses
      WHERE id = $1
        AND customer_id = $2
        AND active = TRUE
      LIMIT 1
    `,
    [
      enderecoId,
      req.customerId
    ]
  );

  if (!enderecoSalvo.rows.length) {
    return res.status(400).json({
      message:
        "O endereço selecionado não pertence à sua conta."
    });
  }

  customerAddressId =
    enderecoSalvo.rows[0].id;
}
    const cart =
       await calculateCart(itens, unidadeId);

    const orderNumber =
      `PN-${Date.now().toString().slice(-8)}`;

    const paymentBody = {
      amount: cart.total.toFixed(2),

      payment_method:
        metodo === "pix"
          ? {
              id: "pix",
              type: "bank_transfer"
            }
          : {
              id:
                pagamento?.payment_method_id,

              type:
                pagamento?.payment_type_id ||
                "credit_card",

              token:
                pagamento?.token,

              installments:
                Number(
                  pagamento?.installments
                )
            }
    };

    if (
      metodo === "cartao" &&
      (
        !pagamento?.token ||
        !pagamento?.payment_method_id ||
        !pagamento?.installments
      )
    ) {
      return res.status(400).json({
        message:
          "Dados tokenizados do cartão incompletos."
      });
    }

    const mpOrder =
      await mpRequest("/v1/orders", {
        method: "POST",

        idempotencyKey: randomUUID(),

        body: {
          type: "online",

          processing_mode: "automatic",

          total_amount:
            cart.total.toFixed(2),

          external_reference:
            orderNumber,

          transactions: {
            payments: [paymentBody]
          },

          payer: {
            email:
              pagamento?.payer?.email ||
              endereco.email,

            ...(pagamento?.payer?.identification && {
              identification:
                pagamento.payer.identification
            })
          }
        }
      });

    const {
      payment,
      status,
      statusDetail
    } = getPaymentStatus(mpOrder);

await saveOrderToDatabase({
  orderNumber,
  mpOrder,
  payment,
  status,
  statusDetail,
  metodo,
  endereco,
  cart,
  customerId: req.customerId || null

  customerAddressId
});

    const mpMethod =
      payment.payment_method || {};

    return res.status(201).json({
      ok: true,

      orderNumber,

      mercadoPagoOrderId:
        mpOrder.id,

      mercadoPagoPaymentId:
        payment.id || null,

      paymentMethod:
        metodo,

      status,
      statusDetail,

      qrCode:
        mpMethod.qr_code || null,

      qrCodeBase64:
        mpMethod.qr_code_base64 || null,

      ticketUrl:
        mpMethod.ticket_url || null
    });

  } catch (error) {
    console.error(
      "POST /api/orders:",
      error.details || error
    );

    res
      .status(error.status || 500)
      .json({
        message:
          error.message ||
          "Erro interno ao criar pedido."
      });
  }
  }
);

// =========================
// CONSULTAR PEDIDO
// =========================

app.get("/api/orders/:id", async (req, res) => {
  try {
    const local =
  await findOrder(req.params.id);

    // Pagamento simulado
    if (local?.testApproved) {
      return res.json({
        orderId:
          local.mercadoPagoOrderId,

        paymentId:
          local.mercadoPagoPaymentId ||
          null,

        orderNumber:
          local.orderNumber,

        status: "approved",

        statusDetail:
          "accredited"
      });
    }

    const mpOrder =
      await getMpOrder(req.params.id);

    const {
      payment,
      status,
      statusDetail
    } = getPaymentStatus(mpOrder);

    const updated =
  await updateLocalOrder(
        req.params.id,
        payment,
        status,
        statusDetail
      );

    res.json({
      orderId: mpOrder.id,

      paymentId:
        payment.id || null,

      orderNumber:
        updated?.orderNumber || null,

      status,
      statusDetail
    });

  } catch (error) {
    console.error(
      "GET /api/orders/:id:",
      error.details || error
    );

    res
      .status(error.status || 500)
      .json({
        message:
          error.message ||
          "Erro ao consultar pedido."
      });
  }
});


// =========================
// WEBHOOK MERCADO PAGO
// =========================

app.post(
  "/api/webhooks/mercadopago",
  async (req, res) => {
    res.sendStatus(200);

    try {
      const orderId =
        req.body?.data?.id ||
        req.body?.id ||
        req.query?.id;

      if (!orderId) return;

      const mpOrder =
        await getMpOrder(orderId);

      const {
        payment,
        status,
        statusDetail
      } = getPaymentStatus(mpOrder);

      const local =
  await updateLocalOrder( 
          orderId,
          payment,
          status,
          statusDetail
        );

      if (local) {
        console.log(
          "Pedido atualizado:",
          {
            orderId,
            paymentId: payment.id,
            status,
            statusDetail
          }
        );
      }

    } catch (error) {
      console.error(
        "Webhook Mercado Pago:",
        error.details || error
      );
    }
  }
);


// =========================
// TESTE - APROVAR PIX
// =========================

app.post(
  "/api/test/approve/:id",
  async (req, res) => {
    try {
      const orderId = String(req.params.id);

      const result = await db.query(
        `
          UPDATE orders
          SET
            payment_status = 'approved',
            payment_status_detail = 'accredited',
            test_approved = TRUE,
            updated_at = NOW()
          WHERE mercado_pago_order_id = $1
          RETURNING
            id,
            order_number,
            mercado_pago_order_id,
            mercado_pago_payment_id
        `,
        [orderId]
      );

      const order = result.rows[0];

      if (!order) {
        return res.status(404).json({
          message: "Pedido não encontrado."
        });
      }

      await db.query(
        `
          UPDATE payments
          SET
            status = 'approved',
            approved_at = COALESCE(
              approved_at,
              NOW()
            ),
            updated_at = NOW()
          WHERE order_id = $1
        `,
        [order.id]
      );

      console.log(
        "PAGAMENTO SIMULADO COMO APROVADO:",
        order.order_number
      );

      res.json({
        ok: true,

        orderId:
          order.mercado_pago_order_id,

        paymentId:
          order.mercado_pago_payment_id,

        orderNumber:
          order.order_number,

        status: "approved",

        statusDetail: "accredited"
      });

    } catch (error) {
      console.error(
        "Erro ao simular pagamento:",
        error
      );

      res.status(500).json({
        message:
          "Erro ao simular pagamento."
      });
    }
  }
);


// =========================
// FRONTEND
// =========================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});


// =========================
// INICIAR
// =========================

app.listen(PORT, () => {
  console.log(
    `Polo Norte Bebidas rodando em http://localhost:${PORT}`
  );
});