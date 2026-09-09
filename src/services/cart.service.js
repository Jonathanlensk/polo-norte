const db = require("../../database/db");
const { quoteDelivery } = require("./delivery.service");
const { ensureCatalogSchema, promotionCondition } = require("./catalog.service");

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
  await ensureCatalogSchema();
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
        p.stock_quantity,
        p.active
      FROM products p
      WHERE p.id = ANY($1::bigint[])
        AND p.active = TRUE
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

  let entrega = unit.taxa;
  let entregaDetalhes = null;

  if (deliveryAddress) {
    entregaDetalhes = await quoteDelivery(unitId, deliveryAddress);
    entrega = entregaDetalhes.fee;
  }

  return {
    itens,
    subtotal: money(subtotal),
    entrega: money(entrega),
    total: money(subtotal + entrega),
    unidade: unit,
    entregaDetalhes
  };

}

module.exports = {
  calculateCart,
  units
};
