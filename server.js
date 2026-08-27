require("dotenv").config();

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

const dataDir = path.join(__dirname, "data");

const ordersFile = path.join(dataDir, "orders.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(ordersFile)) {
  fs.writeFileSync(ordersFile, "[]", "utf8");
}

const products = [
  { id: 1, nome: "Heineken", preco: 6.60 },
  { id: 2, nome: "Brahma", preco: 5.50 },
  { id: 3, nome: "Corona Extra", preco: 5.50 },
  { id: 4, nome: "Budweiser", preco: 6.50 },
  { id: 5, nome: "Smirnoff", preco: 49.90 },
  { id: 6, nome: "Jack Daniel's", preco: 139.90 },
  { id: 7, nome: "Red Label", preco: 89.90 },
  { id: 8, nome: "Tanqueray", preco: 89.90 },
  { id: 9, nome: "Red Bull", preco: 8.90 },
  { id: 10, nome: "Água Mineral", preco: 0.1 },
  { id: 11, nome: "Coca-Cola", preco: 11.90 },
  { id: 12, nome: "Gelo em Cubo", preco: 9.90 }
];

const units = {
  julio: {
    nome: "Júlio de Mesquita",
    taxa: 0.00
  },

  vila: {
    nome: "Vila Helena",
    taxa: 8.00
  },

  divino: {
    nome: "Largo do Divino",
    taxa: 10.00
  }
};

function readOrders() {
  return JSON.parse(fs.readFileSync(ordersFile, "utf8"));
}

function writeOrders(orders) {
  fs.writeFileSync(
    ordersFile,
    JSON.stringify(orders, null, 2),
    "utf8"
  );
}

function money(value) {
  return Number(Number(value).toFixed(2));
}

function calculateCart(items, unitId) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Carrinho vazio.");
  }

  const unit = units[unitId];

  if (!unit) {
    throw new Error("Unidade inválida.");
  }

  const normalized = [];

  let subtotal = 0;

  for (const item of items) {
    const product = products.find(
      p => p.id === Number(item.id)
    );

    const quantity = Number(item.quantidade);

    if (!product) {
      throw new Error(`Produto inválido: ${item.id}`);
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      throw new Error(
        `Quantidade inválida para ${product.nome}.`
      );
    }

    subtotal += product.preco * quantity;

    normalized.push({
      id: product.id,
      nome: product.nome,
      quantidade: quantity,
      precoUnitario: product.preco
    });
  }

  const entrega = unit.taxa;

  const total = money(subtotal + entrega);

  return {
    itens: normalized,
    subtotal: money(subtotal),
    entrega: money(entrega),
    total,
    unidade: unit
  };
}

function authHeaders(idempotencyKey) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error(
      "MERCADO_PAGO_ACCESS_TOKEN não configurado."
    );
  }

  return {
    "Content-Type": "application/json",

    "Authorization":
      `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,

    "X-Idempotency-Key": idempotencyKey
  };
}

async function mercadoPagoRequest(endpoint, options = {}) {
  const response = await fetch(
    `${MP_API}${endpoint}`,
    options
  );

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = {
      raw: text
    };
  }

  console.log("\n==============================");
  console.log("MERCADO PAGO RESPONSE");
  console.log("Endpoint:", endpoint);
  console.log("Status:", response.status);
  console.log(
    "Resposta:",
    JSON.stringify(data, null, 2)
  );
  console.log("==============================\n");

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.cause?.[0]?.description ||
      data?.status ||
      data?.raw ||
      text ||
      `Erro do Mercado Pago. Status: ${response.status}`;

    const error = new Error(
      typeof message === "string"
        ? message
        : JSON.stringify(message)
    );

    error.status = response.status;
    error.details = data;

    throw error;
  }

  return data;
}

function saveLocalOrder(order) {
  const orders = readOrders();

  orders.push(order);

  writeOrders(orders);
}

/*
  CORREÇÃO DO STATUS DO PAGAMENTO

  O Mercado Pago pode retornar:

  Order:
  processed

  Payment:
  approved

  Para saber se o pagamento foi realmente aprovado,
  priorizamos sempre o status do payment.
*/

function getPaymentStatus(mpOrder) {
  const payment =
    mpOrder?.transactions?.payments?.[0] || {};

  return {
    payment,

    status:
      payment.status ||
      mpOrder.status ||
      "pending",

    statusDetail:
      payment.status_detail ||
      mpOrder.status_detail ||
      null
  };
}

/*
  HEALTH CHECK
*/

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,

    service: "Polo Norte Bebidas API",

    mercadoPagoConfigured: Boolean(
      process.env.MERCADO_PAGO_ACCESS_TOKEN
    )
  });
});

/*
  CONFIGURAÇÃO DO FRONTEND
*/

app.get("/api/config", (req, res) => {
  res.json({
    publicKey:
      process.env.MERCADO_PAGO_PUBLIC_KEY || ""
  });
});

/*
  CRIAR PEDIDO
*/

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

    if (
      !endereco?.nome ||
      !endereco?.email ||
      !endereco?.whatsapp ||
      !endereco?.cep ||
      !endereco?.rua ||
      !endereco?.numero ||
      !endereco?.bairro
    ) {
      return res.status(400).json({
        message:
          "Preencha os dados obrigatórios de entrega."
      });
    }

    const cart = calculateCart(
      itens,
      unidadeId
    );

    const orderNumber =
      `PN-${Date.now().toString().slice(-8)}`;

    const externalReference =
      orderNumber;

    const idempotencyKey =
      randomUUID();

    const localOrder = {
      orderNumber,

      externalReference,

      status: "pending",

      statusDetail: null,

      paymentMethod: metodo,

      unidade: unidadeId,

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

    let mpOrder;

    /*
      PAGAMENTO PIX
    */

    if (metodo === "pix") {
      const body = {
        type: "online",

        processing_mode: "automatic",

        total_amount:
          cart.total.toFixed(2),

        external_reference:
          externalReference,

        transactions: {
          payments: [
            {
              amount:
                cart.total.toFixed(2),

              payment_method: {
                id: "pix",

                type: "bank_transfer"
              }
            }
          ]
        },

        payer: {
          email: endereco.email
        }
      };

      mpOrder =
        await mercadoPagoRequest(
          "/v1/orders",
          {
            method: "POST",

            headers:
              authHeaders(idempotencyKey),

            body:
              JSON.stringify(body)
          }
        );
    }

    /*
      PAGAMENTO CARTÃO
    */

    else {
      if (
        !pagamento?.token ||
        !pagamento?.payment_method_id ||
        !pagamento?.installments
      ) {
        return res.status(400).json({
          message:
            "Dados tokenizados do cartão incompletos."
        });
      }

      const paymentType =
        pagamento.payment_type_id ||
        "credit_card";

      const body = {
        type: "online",

        processing_mode: "automatic",

        total_amount:
          cart.total.toFixed(2),

        external_reference:
          externalReference,

        transactions: {
          payments: [
            {
              amount:
                cart.total.toFixed(2),

              payment_method: {
                id:
                  pagamento.payment_method_id,

                type:
                  paymentType,

                token:
                  pagamento.token,

                installments:
                  Number(
                    pagamento.installments
                  )
              }
            }
          ]
        },

        payer: {
          email:
            pagamento.payer?.email ||
            endereco.email,

          identification:
            pagamento.payer?.identification
        }
      };

      mpOrder =
        await mercadoPagoRequest(
          "/v1/orders",
          {
            method: "POST",

            headers:
              authHeaders(idempotencyKey),

            body:
              JSON.stringify(body)
          }
        );
    }

    /*
      PEGA O STATUS REAL DO PAGAMENTO
    */

    const {
      payment,
      status,
      statusDetail
    } = getPaymentStatus(mpOrder);

    const mpPaymentMethod =
      payment.payment_method || {};

    localOrder.mercadoPagoOrderId =
      mpOrder.id;

    localOrder.mercadoPagoPaymentId =
      payment.id || null;

    localOrder.status =
      status;

    localOrder.statusDetail =
      statusDetail;

    saveLocalOrder(localOrder);

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
        mpPaymentMethod.qr_code || null,

      qrCodeBase64:
        mpPaymentMethod.qr_code_base64 ||
        null,

      ticketUrl:
        mpPaymentMethod.ticket_url ||
        null
    });
  } catch (error) {
    console.error(
      "POST /api/orders:",
      error.details || error
    );

    return res
      .status(error.status || 500)
      .json({
        message:
          error.message ||
          "Erro interno ao criar pedido."
      });
  }
});

/*
  CONSULTAR STATUS DO PEDIDO
*/

app.get("/api/orders/:id", async (req, res) => {
  try {
    const mpOrder =
      await mercadoPagoRequest(
        `/v1/orders/${encodeURIComponent(req.params.id)}`,
        {
          method: "GET",

          headers: {
            "Authorization":
              `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
          }
        }
      );

    /*
      CORREÇÃO:
      Prioriza payment.status antes de mpOrder.status
    */

    const {
      payment,
      status,
      statusDetail
    } = getPaymentStatus(mpOrder);

    const orders =
      readOrders();

    const local =
      orders.find(
        o =>
          String(
            o.mercadoPagoOrderId
          ) ===
          String(
            req.params.id
          )
      );

    if (local) {
      local.status =
        status;

      local.statusDetail =
        statusDetail;

      local.mercadoPagoPaymentId =
        payment.id ||
        local.mercadoPagoPaymentId;

      local.updatedAt =
        new Date().toISOString();

      writeOrders(orders);
    }

    return res.json({
      orderId:
        mpOrder.id,

      paymentId:
        payment.id || null,

      status,

      statusDetail
    });
  } catch (error) {
    console.error(
      "GET /api/orders/:id:",
      error.details || error
    );

    return res
      .status(error.status || 500)
      .json({
        message:
          error.message ||
          "Erro ao consultar pedido."
      });
  }
});

/*
  WEBHOOK DO MERCADO PAGO
*/

app.post(
  "/api/webhooks/mercadopago",
  async (req, res) => {
    /*
      Responde imediatamente para o Mercado Pago
    */

    res.sendStatus(200);

    try {
      const orderId =
        req.body?.data?.id ||
        req.body?.id ||
        req.query?.id;

      if (!orderId) {
        return;
      }

      console.log(
        "Webhook recebido para o pedido:",
        orderId
      );

      const mpOrder =
        await mercadoPagoRequest(
          `/v1/orders/${encodeURIComponent(orderId)}`,
          {
            method: "GET",

            headers: {
              "Authorization":
                `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
            }
          }
        );

      /*
        CORREÇÃO:
        Prioriza o status real do pagamento
      */

      const {
        payment,
        status,
        statusDetail
      } = getPaymentStatus(mpOrder);

      const orders =
        readOrders();

      const local =
        orders.find(
          o =>
            String(
              o.mercadoPagoOrderId
            ) ===
            String(orderId)
        );

      if (local) {
        local.status =
          status;

        local.statusDetail =
          statusDetail;

        local.mercadoPagoPaymentId =
          payment.id ||
          local.mercadoPagoPaymentId;

        local.updatedAt =
          new Date().toISOString();

        writeOrders(orders);

        console.log(
          "Pedido atualizado:",
          {
            orderId,
            paymentId:
              payment.id,
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

/*
  ARQUIVOS DO FRONTEND
*/

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);

/*
  FALLBACK PARA O FRONTEND
*/

app.get(
  "/{*splat}",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );
  }
);

/*
  INICIAR SERVIDOR
*/

app.listen(PORT, () => {
  console.log(
    `Polo Norte Bebidas rodando em http://localhost:${PORT}`
  );
});