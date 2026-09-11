const db = require("../../database/db");
const { quoteDelivery } = require("./delivery.service");
const { ensureCatalogSchema, promotionCondition } = require("./catalog.service");
const {
  assertStoreId,
  ensureStoreInventorySchema
} = require("./store-inventory.service");

const money = (value) =>
  Number(Number(value).toFixed(2));

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

async function calculateCart(items, unitId, deliveryAddress = null) {
  await Promise.all([
    ensureCatalogSchema(),
    ensureStoreInventorySchema()
  ]);

  if (!Array.isArray(items) || !items.length) {
    throw new Error("Carrinho vazio.");
  }

  const normalizedUnitId = assertStoreId(unitId);
  const unit = units[normalizedUnitId];

  if (!unit) {
    throw new Error("Unidade inválida.");
  }

  const ids = items.map((item) => Number(item.id));

  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("Produto inválido no carrinho.");
  }

  const promo = promotionCondition("p");

  const result = await db.query(
    `
      SELECT
        p.id,
        p.name,
        CASE WHEN ${promo}
          THEN p.promotion_price::float
          ELSE p.price::float
        END AS price,
        COALESCE(s.stock_quantity, 0)::int AS stock_quantity,
        COALESCE(s.active, FALSE) AS store_active,
        p.active
      FROM products p
      LEFT JOIN store_product_stock s
        ON s.product_id = p.id
       AND s.store_id = $2
      WHERE p.id = ANY($1::bigint[])
        AND p.active = TRUE
    `,
    [ids, normalizedUnitId]
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

    if (!product.store_active) {
      throw new Error(
        `${product.name} não está disponível nesta unidade.`
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

    if (quantidade > Number(product.stock_quantity || 0)) {
      throw new Error(
        `Estoque insuficiente para ${product.name}. Disponível nesta unidade: ${Number(product.stock_quantity || 0)}.`
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

  let entrega = unit.taxa;
  let entregaDetalhes = null;

  if (deliveryAddress) {
    entregaDetalhes = await quoteDelivery(normalizedUnitId, deliveryAddress);
    entrega = entregaDetalhes.fee;
  }

  return {
    itens,
    subtotal: money(subtotal),
    entrega: money(entrega),
    total: money(subtotal + entrega),
    unidade: {
      ...unit,
      id: normalizedUnitId
    },
    unidadeId: normalizedUnitId,
    entregaDetalhes
  };

}

module.exports = {
  calculateCart,
  units
};
