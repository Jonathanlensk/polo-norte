require("dotenv").config();

const db = require("./database/db");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MP_API = "https://api.mercadopago.com";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// =========================
// BANCO DE DADOS LOCAL
// =========================

const dataDir = path.join(__dirname, "data");
const ordersFile = path.join(dataDir, "orders.json");

fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(ordersFile)) {
  fs.writeFileSync(ordersFile, "[]", "utf8");
}

const readOrders = () =>
  JSON.parse(fs.readFileSync(ordersFile, "utf8"));

const writeOrders = (orders) =>
  fs.writeFileSync(
    ordersFile,
    JSON.stringify(orders, null, 2),
    "utf8"
  );

const findOrder = (id) =>
  readOrders().find(
    (order) =>
      String(order.mercadoPagoOrderId) === String(id)
  );

const money = (value) =>
  Number(Number(value).toFixed(2));


// =========================
// PRODUTOS
// =========================

const products = [
  { id: 1, nome: "Heineken", preco: 6.6 },
  { id: 2, nome: "Brahma", preco: 5.5 },
  { id: 3, nome: "Corona Extra", preco: 5.5 },
  { id: 4, nome: "Budweiser", preco: 6.5 },
  { id: 5, nome: "Smirnoff", preco: 49.9 },
  { id: 6, nome: "Jack Daniel's", preco: 139.9 },
  { id: 7, nome: "Red Label", preco: 89.9 },
  { id: 8, nome: "Tanqueray", preco: 89.9 },
  { id: 9, nome: "Red Bull", preco: 8.9 },
  { id: 10, nome: "Água Mineral", preco: 0.1 },
  { id: 11, nome: "Coca-Cola", preco: 11.9 },
  { id: 12, nome: "Gelo em Cubo", preco: 9.9 }
];

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

function calculateCart(items, unitId) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Carrinho vazio.");
  }

  const unit = units[unitId];

  if (!unit) {
    throw new Error("Unidade inválida.");
  }

  let subtotal = 0;

  const itens = items.map((item) => {
    const product = products.find(
      (p) => p.id === Number(item.id)
    );

    const quantidade = Number(item.quantidade);

    if (!product) {
      throw new Error(`Produto inválido: ${item.id}`);
    }

    if (
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > 99
    ) {
      throw new Error(
        `Quantidade inválida para ${product.nome}.`
      );
    }

    subtotal += product.preco * quantidade;

    return {
      id: product.id,
      nome: product.nome,
      quantidade,
      precoUnitario: product.preco
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

function updateLocalOrder(orderId, payment, status, statusDetail) {
  const orders = readOrders();

  const local = orders.find(
    (order) =>
      String(order.mercadoPagoOrderId) ===
      String(orderId)
  );

  if (!local) return null;

  local.status = status;
  local.statusDetail = statusDetail;
  local.mercadoPagoPaymentId =
    payment.id ||
    local.mercadoPagoPaymentId;

  local.updatedAt =
    new Date().toISOString();

  writeOrders(orders);

  return local;
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
      calculateCart(itens, unidadeId);

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

    const localOrder = {
      orderNumber,

      externalReference:
        orderNumber,

      mercadoPagoOrderId:
        mpOrder.id,

      mercadoPagoPaymentId:
        payment.id || null,

      status,
      statusDetail,

      paymentMethod:
        metodo,

      unidade:
        unidadeId,

      cliente: {
        nome: endereco.nome,
        email: endereco.email,
        whatsapp: endereco.whatsapp
      },

      endereco: {
        cep: endereco.cep,
        rua: endereco.rua,
        numero: endereco.numero,
        bairro: endereco.bairro,
        cidade: endereco.cidade || "",
        uf: endereco.uf || "",
        complemento:
          endereco.complemento || "",
        referencia:
          endereco.referencia || ""
      },

      itens: cart.itens,
      subtotal: cart.subtotal,
      entrega: cart.entrega,
      total: cart.total,

      createdAt:
        new Date().toISOString()
    };

    const orders = readOrders();

    orders.push(localOrder);

    writeOrders(orders);

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
      findOrder(req.params.id);

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
      updateLocalOrder(
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
        updateLocalOrder(
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
// TESTE
// =========================

app.post(
  "/api/test/approve/:id",
  (req, res) => {
    try {
      const orders = readOrders();

      const local = orders.find(
        (order) =>
          String(
            order.mercadoPagoOrderId
          ) ===
          String(req.params.id)
      );

      if (!local) {
        return res.status(404).json({
          message:
            "Pedido não encontrado."
        });
      }

      local.status = "approved";

      local.statusDetail =
        "accredited";

      local.testApproved = true;

      local.updatedAt =
        new Date().toISOString();

      writeOrders(orders);

      console.log(
        "PAGAMENTO SIMULADO COMO APROVADO:",
        local.orderNumber
      );

      res.json({
        ok: true,

        orderId:
          local.mercadoPagoOrderId,

        orderNumber:
          local.orderNumber,

        status: "approved",

        statusDetail:
          "accredited"
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