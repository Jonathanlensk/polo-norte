require("dotenv").config();

const db = require("../database/db");

function text(value) {
  return String(value == null ? "" : value).trim();
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function paymentPreview(paymentMethod) {
  const method = text(paymentMethod).toLowerCase();
  const aliases = {
    pix: "PIX",
    credit_card: "CREDIT",
    debit_card: "DEBIT",
    cash: "CASH"
  };

  const prefix = aliases[method];
  if (!prefix) {
    return {
      codplpag: null,
      codcob: null,
      warning: `Forma de pagamento ainda sem mapeamento GTEX: ${paymentMethod || "vazia"}`
    };
  }

  const rawPlan = text(process.env[`GTEX_${prefix}_CODPLPAG`]);
  const codplpag = rawPlan ? Number(rawPlan) : null;
  const codcob = text(process.env[`GTEX_${prefix}_CODCOB`]) || null;
  const validPlan = Number.isInteger(codplpag) && codplpag > 0;

  return {
    codplpag: validPlan ? codplpag : null,
    codcob,
    warning:
      validPlan && codcob
        ? null
        : `Pagamento ${paymentMethod}: falta configurar GTEX_${prefix}_CODPLPAG e/ou GTEX_${prefix}_CODCOB.`
  };
}

function filialForUnit(unitId) {
  const map = {
    julio: text(process.env.GTEX_FILIAL_JULIO || "1"),
    divino: text(process.env.GTEX_FILIAL_DIVINO || "4"),
    vila: text(process.env.GTEX_FILIAL_VILA || "5")
  };
  return map[text(unitId).toLowerCase()] || null;
}

function buildObservation(order) {
  const parts = [
    `E-commerce ${order.order_number}`,
    order.customer_name ? `Cliente: ${order.customer_name}` : null,
    order.customer_phone ? `Tel: ${order.customer_phone}` : null,
    order.delivery_address ? `Entrega: ${order.delivery_address}` : null,
    order.delivery_reference ? `Ref: ${order.delivery_reference}` : null
  ].filter(Boolean);

  return parts.join(" | ").slice(0, 1000);
}

async function main() {
  const requestedId = Number(process.argv[2] || 0);
  const orderSql = requestedId > 0
    ? `SELECT * FROM orders WHERE id = $1 LIMIT 1`
    : `SELECT * FROM orders ORDER BY id DESC LIMIT 1`;
  const orderParams = requestedId > 0 ? [requestedId] : [];

  const orderResult = await db.query(orderSql, orderParams);
  const order = orderResult.rows[0];

  if (!order) {
    throw new Error(
      requestedId > 0
        ? `Pedido local ID ${requestedId} não encontrado.`
        : "Nenhum pedido local encontrado. Faça um pedido de teste no site e rode novamente."
    );
  }

  const itemsResult = await db.query(
    `
      SELECT
        oi.product_id,
        oi.product_name,
        oi.unit_price,
        oi.quantity,
        p.gtex_codprod,
        p.gtex_codbarra
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `,
    [order.id]
  );

  const warnings = [];
  const missingBarcodes = itemsResult.rows.filter((item) => !text(item.gtex_codbarra));
  if (missingBarcodes.length) {
    warnings.push(
      `Produto(s) sem CODBARRA GTEX: ${missingBarcodes.map((item) => item.product_name).join(", ")}`
    );
  }

  const payment = paymentPreview(order.payment_method);
  if (payment.warning) warnings.push(payment.warning);

  const codfilial = filialForUnit(order.unit_id);
  if (!codfilial) warnings.push(`Unidade sem filial GTEX configurada: ${order.unit_id || "vazia"}`);

  const codcli = Number(process.env.GTEX_CODCLI || 2);
  const codvendedor = Number(process.env.GTEX_CODVENDEDOR || 1);
  const origemvenda = text(process.env.GTEX_ORIGEMVENDA || "VE");
  const deliveryFee = money(order.delivery_fee);
  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
    warnings.push("Valor de frete inválido no pedido local.");
  }

  const itens = itemsResult.rows.map((item) => ({
    codbarra: text(item.gtex_codbarra) || null,
    qt: Number(item.quantity),
    punit: money(item.unit_price),
    obs: ""
  }));

  const payload = {
    seuid: order.order_number,
    codfilial,
    codcli,
    codvendedor,
    codplpag: payment.codplpag,
    codcob: payment.codcob,
    origemvenda,
    obs: buildObservation(order),
    vlfrete: Number(deliveryFee.toFixed(2)),
    itens
  };

  const productsTotal = itens
    .reduce((sum, item) => sum + Number(item.qt || 0) * Number(item.punit || 0), 0);
  const expectedGtexTotal = productsTotal + deliveryFee;

  console.log("\n============================================");
  console.log(" PREVIEW DO PEDIDO GTEX - NAO ENVIA NADA");
  console.log("============================================\n");
  console.log("Pedido local ID:", order.id);
  console.log("Numero do pedido:", order.order_number);
  console.log("Unidade:", order.unit_id);
  console.log("Pagamento local:", order.payment_method, `(${order.payment_status})`);
  console.log("Subtotal local: R$", money(order.subtotal).toFixed(2));
  console.log("Entrega local: R$", deliveryFee.toFixed(2));
  console.log("Total pago/site: R$", money(order.total).toFixed(2));
  console.log("Total de produtos que iria ao GTEX: R$", productsTotal.toFixed(2));
  console.log("Frete enviado em vlfrete: R$", deliveryFee.toFixed(2));
  console.log("Total esperado no GTEX (produtos + frete): R$", expectedGtexTotal.toFixed(2));
  console.log("\nJSON que seria enviado ao GTEX:\n");
  console.log(JSON.stringify(payload, null, 2));

  if (warnings.length) {
    console.log("\nPENDENCIAS / AVISOS:");
    for (const warning of warnings) console.log("-", warning);
  } else {
    console.log("\nOK: payload completo, sem pendencias detectadas pelo preview.");
  }

  console.log("\nCONFIRMACAO: nenhum pedido foi enviado ao GTEX.\n");
}

main()
  .catch((error) => {
    console.error("ERRO PREVIEW GTEX:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await db.end?.(); } catch {}
  });
