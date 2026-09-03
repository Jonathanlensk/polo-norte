const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../../database/db");
const { identificarClienteOpcional } = require("../middleware/auth.middleware");
const { calculateCart } = require("../services/cart.service");
const { findOrder, saveOrderToDatabase } = require("../services/order.service");
const {
  mpRequest,
  getPaymentStatus,
  getMpOrder,
  updateLocalOrder
} = require("../services/mercadoPago.service");

const router = express.Router();

router.post(
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

    if (metodo === "cartao" && Number(cart.total) < 0.50) {
      return res.status(400).json({
        message:
          "Pagamento com cartão disponível a partir de R$ 0,50."
      });
    }

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

              // A loja aceita cartão somente à vista.
              // O backend força 1x mesmo que o frontend seja manipulado.
              installments: 1
            }
    };

    if (
      metodo === "cartao" &&
      (
        !pagamento?.token ||
        !pagamento?.payment_method_id
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

          ...(metodo === "cartao" && {
            config: {
              online: {
                transaction_security: {
                  validation: "on_fraud_risk",
                  liability_shift: "required"
                }
              }
            }
          }),

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
  customerId: req.customerId || null,
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
        mpMethod.ticket_url || null,

      challengeUrl:
        mpMethod.transaction_security?.url || null
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

router.get("/api/orders/:id", async (req, res) => {
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
      statusDetail,

      challengeUrl:
        payment.payment_method
          ?.transaction_security?.url || null
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

router.post(
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

router.post(
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

module.exports = router;
