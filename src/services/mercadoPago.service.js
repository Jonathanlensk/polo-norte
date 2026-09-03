const db = require("../../database/db");

const MP_API = "https://api.mercadopago.com";

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
    rejected: "rejected",
    failed: "rejected",
    canceled: "cancelled"
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

module.exports = {
  mpRequest,
  getPaymentStatus,
  getMpOrder,
  updateLocalOrder
};
