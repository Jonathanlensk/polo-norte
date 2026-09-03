const express = require("express");
const db = require("../../database/db");
const { autenticarCliente } = require("../middleware/auth.middleware");

const router = express.Router();

function mapOrder(row) {
  return {
    id: Number(row.id),
    orderNumber: row.order_number,
    total: Number(row.total),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    deliveryAddress: row.delivery_address,
    deliveryReference: row.delivery_reference || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// =====================================================
// PEDIDOS DO CLIENTE LOGADO
// =====================================================

router.get(
  "/api/customer/orders",
  autenticarCliente,
  async (req, res) => {
    try {
      const result = await db.query(
        `
          SELECT
            id,
            order_number,
            subtotal,
            delivery_fee,
            total,
            payment_method,
            payment_status,
            order_status,
            delivery_address,
            delivery_reference,
            created_at,
            updated_at
          FROM orders
          WHERE customer_id = $1
          ORDER BY created_at DESC
          LIMIT 50
        `,
        [req.customerId]
      );

      return res.json({
        ok: true,
        orders: result.rows.map(mapOrder)
      });
    } catch (error) {
      console.error("GET /api/customer/orders:", error);

      return res.status(500).json({
        ok: false,
        message: "Erro ao carregar seus pedidos."
      });
    }
  }
);

router.get(
  "/api/customer/orders/:orderNumber",
  autenticarCliente,
  async (req, res) => {
    try {
      const orderResult = await db.query(
        `
          SELECT
            id,
            order_number,
            subtotal,
            delivery_fee,
            total,
            payment_method,
            payment_status,
            order_status,
            delivery_address,
            delivery_reference,
            created_at,
            updated_at
          FROM orders
          WHERE order_number = $1
            AND customer_id = $2
          LIMIT 1
        `,
        [req.params.orderNumber, req.customerId]
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
              item.product_id != null
                ? Number(item.product_id)
                : null,
            productName: item.product_name,
            unitPrice: Number(item.unit_price),
            quantity: Number(item.quantity),
            subtotal: Number(item.subtotal)
          }))
        }
      });
    } catch (error) {
      console.error(
        "GET /api/customer/orders/:orderNumber:",
        error
      );

      return res.status(500).json({
        ok: false,
        message: "Erro ao carregar o pedido."
      });
    }
  }
);

module.exports = router;
