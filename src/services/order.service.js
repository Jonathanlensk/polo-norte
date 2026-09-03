const db = require("../../database/db");

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
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17
      )
      RETURNING id
    `,
    [
      orderNumber,
      customerId || null,
      customerAddressId || null,
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

module.exports = {
  findOrder,
  saveOrderToDatabase
};
