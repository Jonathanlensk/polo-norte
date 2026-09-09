const db = require("../../database/db");

let inventorySchemaPromise = null;

async function ensureInventorySchema() {
  if (!inventorySchemaPromise) {
    inventorySchemaPromise = db.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS stock_reserved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS stock_released_at TIMESTAMPTZ
    `).catch((error) => {
      inventorySchemaPromise = null;
      throw error;
    });
  }

  return inventorySchemaPromise;
}

async function reserveStockForOrder(orderId, client) {
  await ensureInventorySchema();

  const ownsClient = !client;
  const connection = client || await db.connect();

  try {
    if (ownsClient) {
      await connection.query("BEGIN");
    }

    const orderResult = await connection.query(
      `
        SELECT
          id,
          payment_status,
          stock_reserved_at,
          stock_released_at
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
      [orderId]
    );

    const order = orderResult.rows[0];

    if (!order) {
      const error = new Error("Pedido não encontrado para reservar estoque.");
      error.status = 404;
      throw error;
    }

    // Já reservado (ou já reservado e posteriormente devolvido):
    // não desconta uma segunda vez.
    if (order.stock_reserved_at || order.stock_released_at) {
      if (ownsClient) {
        await connection.query("COMMIT");
      }

      return {
        reserved: Boolean(order.stock_reserved_at && !order.stock_released_at),
        alreadyProcessed: true
      };
    }

    // Pedido rejeitado/cancelado não deve consumir estoque.
    if (["rejected", "cancelled"].includes(String(order.payment_status || ""))) {
      if (ownsClient) {
        await connection.query("COMMIT");
      }

      return {
        reserved: false,
        alreadyProcessed: false
      };
    }

    const itemsResult = await connection.query(
      `
        SELECT
          product_id,
          product_name,
          quantity
        FROM order_items
        WHERE order_id = $1
          AND product_id IS NOT NULL
        ORDER BY id
      `,
      [orderId]
    );

    for (const item of itemsResult.rows) {
      const quantity = Number(item.quantity || 0);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        continue;
      }

      const stockResult = await connection.query(
        `
          UPDATE products
          SET
            stock_quantity = stock_quantity - $2,
            updated_at = NOW()
          WHERE id = $1
            AND active = TRUE
            AND stock_quantity >= $2
          RETURNING stock_quantity
        `,
        [item.product_id, quantity]
      );

      if (!stockResult.rows.length) {
        const currentResult = await connection.query(
          `SELECT stock_quantity FROM products WHERE id = $1 LIMIT 1`,
          [item.product_id]
        );

        const available = currentResult.rows.length
          ? Number(currentResult.rows[0].stock_quantity || 0)
          : 0;

        const error = new Error(
          `Estoque insuficiente para ${item.product_name}. Disponível: ${available}.`
        );
        error.status = 409;
        throw error;
      }
    }

    await connection.query(
      `
        UPDATE orders
        SET
          stock_reserved_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId]
    );

    if (ownsClient) {
      await connection.query("COMMIT");
    }

    return {
      reserved: true,
      alreadyProcessed: false
    };
  } catch (error) {
    if (ownsClient) {
      await connection.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (ownsClient) {
      connection.release();
    }
  }
}

async function releaseStockForOrder(orderId, client) {
  await ensureInventorySchema();

  const ownsClient = !client;
  const connection = client || await db.connect();

  try {
    if (ownsClient) {
      await connection.query("BEGIN");
    }

    const orderResult = await connection.query(
      `
        SELECT
          id,
          stock_reserved_at,
          stock_released_at
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
      [orderId]
    );

    const order = orderResult.rows[0];

    if (!order || !order.stock_reserved_at || order.stock_released_at) {
      if (ownsClient) {
        await connection.query("COMMIT");
      }

      return {
        released: false
      };
    }

    const itemsResult = await connection.query(
      `
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = $1
          AND product_id IS NOT NULL
      `,
      [orderId]
    );

    for (const item of itemsResult.rows) {
      const quantity = Number(item.quantity || 0);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        continue;
      }

      await connection.query(
        `
          UPDATE products
          SET
            stock_quantity = stock_quantity + $2,
            updated_at = NOW()
          WHERE id = $1
        `,
        [item.product_id, quantity]
      );
    }

    await connection.query(
      `
        UPDATE orders
        SET
          stock_released_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [orderId]
    );

    if (ownsClient) {
      await connection.query("COMMIT");
    }

    return {
      released: true
    };
  } catch (error) {
    if (ownsClient) {
      await connection.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (ownsClient) {
      connection.release();
    }
  }
}

module.exports = {
  ensureInventorySchema,
  reserveStockForOrder,
  releaseStockForOrder
};
