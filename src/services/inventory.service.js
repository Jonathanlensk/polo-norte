const db = require("../../database/db");
const {
  ensureStoreInventorySchema,
  assertStoreId,
  syncLegacyProductStock
} = require("./store-inventory.service");

let inventorySchemaPromise = null;

async function ensureInventorySchema() {
  if (!inventorySchemaPromise) {
    inventorySchemaPromise = (async () => {
      await ensureStoreInventorySchema();
      await db.query(`
        ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS stock_reserved_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS stock_released_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS unit_id VARCHAR(30)
      `);
    })().catch((error) => {
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
          unit_id,
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

    if (["rejected", "cancelled"].includes(String(order.payment_status || ""))) {
      if (ownsClient) {
        await connection.query("COMMIT");
      }

      return {
        reserved: false,
        alreadyProcessed: false
      };
    }

    if (!order.unit_id) {
      const error = new Error("O pedido não possui unidade vinculada para reservar o estoque.");
      error.status = 409;
      throw error;
    }

    const unitId = assertStoreId(order.unit_id);

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
          UPDATE store_product_stock
          SET
            stock_quantity = stock_quantity - $3,
            updated_at = NOW()
          WHERE product_id = $1
            AND store_id = $2
            AND active = TRUE
            AND stock_quantity >= $3
          RETURNING stock_quantity
        `,
        [item.product_id, unitId, quantity]
      );

      if (!stockResult.rows.length) {
        const currentResult = await connection.query(
          `
            SELECT stock_quantity, active
            FROM store_product_stock
            WHERE product_id = $1
              AND store_id = $2
            LIMIT 1
          `,
          [item.product_id, unitId]
        );

        const current = currentResult.rows[0];
        const available = current && current.active
          ? Number(current.stock_quantity || 0)
          : 0;

        const error = new Error(
          `Estoque insuficiente para ${item.product_name} nesta unidade. Disponível: ${available}.`
        );
        error.status = 409;
        throw error;
      }

      await syncLegacyProductStock(item.product_id, connection);
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
      alreadyProcessed: false,
      unitId
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
          unit_id,
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

    if (!order.unit_id) {
      const error = new Error("O pedido não possui unidade vinculada para devolver o estoque.");
      error.status = 409;
      throw error;
    }

    const unitId = assertStoreId(order.unit_id);

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
          INSERT INTO store_product_stock (
            store_id,
            product_id,
            stock_quantity,
            active,
            updated_at
          )
          VALUES ($1, $2, $3, TRUE, NOW())
          ON CONFLICT (store_id, product_id)
          DO UPDATE SET
            stock_quantity = store_product_stock.stock_quantity + EXCLUDED.stock_quantity,
            updated_at = NOW()
        `,
        [unitId, item.product_id, quantity]
      );

      await syncLegacyProductStock(item.product_id, connection);
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
      released: true,
      unitId
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
