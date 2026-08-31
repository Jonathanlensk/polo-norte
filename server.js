require("dotenv").config();

const db = require("./database/db");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID } = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MP_API = "https://api.mercadopago.com";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

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
      status,
      statusDetail || null,
      paymentId
    ]
  );

  const order = result.rows[0];

  if (!order) {
    return null;
  }

  await db.query(
    `
      UPDATE payments
      SET
        external_payment_id =
          COALESCE($2, external_payment_id),
        status = $3,

        approved_at =
      CASE
        WHEN $3::text = 'approved'
        THEN COALESCE(approved_at, NOW())
        ELSE approved_at
       END,
        updated_at = NOW()

      WHERE order_id = $1
    `,
    [
      order.id,
      paymentId,
      status
    ]
  );

  return order;
}

async function saveOrderToDatabase({
  orderNumber,
  mpOrder,
  payment,
  status,
  statusDetail,
  metodo,
  endereco,
  cart
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
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15
          )
          RETURNING id
        `,
        [
          orderNumber,
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

app.post("/api/orders", async (req, res) => {
  try {
    const {
      metodo,
      unidadeId,
      itens,
      endereco,
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
  cart
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
});


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