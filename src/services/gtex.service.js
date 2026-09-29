const GTEX_TOKEN_TTL_MS = 11 * 60 * 60 * 1000 + 45 * 60 * 1000;
const GTEX_TIMEOUT_MS = Number(process.env.GTEX_TIMEOUT_MS || 15000);
const GTEX_BULK_TIMEOUT_MS = Number(process.env.GTEX_BULK_TIMEOUT_MS || 120000);

let tokenCache = {
  token: null,
  expiresAt: 0
};

const UNIT_TO_FILIAL = {
  julio: String(process.env.GTEX_FILIAL_JULIO || "1"),
  divino: String(process.env.GTEX_FILIAL_DIVINO || "4"),
  vila: String(process.env.GTEX_FILIAL_VILA || "5")
};

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function gtexBaseUrl() {
  return clean(process.env.GTEX_URL).replace(/\/+$/, "");
}

function isPlaceholder(value) {
  return !clean(value) || /COLOQUE|USUARIO_AQUI|SENHA_AQUI|CODIGO_AQUI/i.test(clean(value));
}

function getGtexConfigStatus() {
  const baseUrl = gtexBaseUrl();
  const user = clean(process.env.GTEX_USER);
  const password = clean(process.env.GTEX_PASSWORD);

  const basicConfigured = Boolean(
    baseUrl &&
    /^https?:\/\//i.test(baseUrl) &&
    !isPlaceholder(user) &&
    !isPlaceholder(password)
  );

  return {
    configured: basicConfigured,
    enabled: String(process.env.GTEX_ENABLED || "false").toLowerCase() === "true",
    catalogSyncEnabled: String(process.env.GTEX_CATALOG_SYNC_ENABLED || "true").toLowerCase() === "true",
    baseUrl,
    userConfigured: !isPlaceholder(user),
    passwordConfigured: !isPlaceholder(password),
    codcli: Number(process.env.GTEX_CODCLI || 2),
    codvendedor: Number(process.env.GTEX_CODVENDEDOR || 1),
    origemvenda: clean(process.env.GTEX_ORIGEMVENDA || "VE"),
    filiais: { ...UNIT_TO_FILIAL }
  };
}

function assertBasicConfig() {
  const status = getGtexConfigStatus();
  if (!status.configured) {
    const error = new Error("Integração GTEX não configurada. Preencha GTEX_URL, GTEX_USER e GTEX_PASSWORD no .env.");
    error.status = 503;
    throw error;
  }
  return status;
}

function filialForUnit(unitId) {
  const id = clean(unitId).toLowerCase();
  const filial = UNIT_TO_FILIAL[id];
  if (!filial) {
    const error = new Error(`Unidade sem filial GTEX configurada: ${unitId}`);
    error.status = 400;
    throw error;
  }
  return filial;
}

function paymentConfig(paymentMethod) {
  const method = clean(paymentMethod).toLowerCase();
  const aliases = {
    pix: "PIX",
    credit_card: "CREDIT",
    debit_card: "DEBIT",
    cash: "CASH"
  };
  const prefix = aliases[method];
  if (!prefix) {
    const error = new Error(`Forma de pagamento sem mapeamento GTEX: ${paymentMethod}`);
    error.status = 409;
    throw error;
  }

  const codplpag = Number(process.env[`GTEX_${prefix}_CODPLPAG`]);
  const codcob = clean(process.env[`GTEX_${prefix}_CODCOB`]);

  if (!Number.isInteger(codplpag) || codplpag <= 0 || !codcob) {
    const error = new Error(
      `Falta configurar GTEX_${prefix}_CODPLPAG e GTEX_${prefix}_CODCOB no .env.`
    );
    error.status = 503;
    throw error;
  }

  return { codplpag, codcob };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs || GTEX_TIMEOUT_MS);
  const { timeoutMs: _ignoredTimeout, ...fetchOptions } = options;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
        ...(fetchOptions.headers || {})
      }
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text ? { raw: text } : null;
    }

    if (!response.ok) {
      const error = new Error(
        data?.erro || data?.message || data?.raw || `Erro GTEX HTTP ${response.status}`
      );
      error.status = response.status;
      error.details = data;
      throw error;
    }

    return { status: response.status, data };
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Tempo limite excedido ao conectar com a API GTEX.");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function login({ force = false } = {}) {
  const status = assertBasicConfig();

  if (!force && tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const url = new URL(`${status.baseUrl}/validarLogin`);
  url.searchParams.set("userid", clean(process.env.GTEX_USER));
  url.searchParams.set("password", clean(process.env.GTEX_PASSWORD));

  const result = await fetchJson(url.toString());
  const token = clean(result.data?.token);

  if (!token || clean(result.data?.msg).toUpperCase() !== "OK") {
    const error = new Error(result.data?.msg || result.data?.erro || "GTEX não retornou um token válido.");
    error.status = 401;
    error.details = result.data;
    throw error;
  }

  tokenCache = {
    token,
    expiresAt: Date.now() + GTEX_TOKEN_TTL_MS
  };

  return token;
}

function noDataResponse(data) {
  const message = clean(data?.erro || data?.message).toLowerCase();
  return message.includes("não retornou dados") || message.includes("nao retornou dados");
}

async function gtexRequest(pathname, {
  method = "GET",
  params = {},
  body,
  allowNoData = false,
  retryAuth = true,
  timeoutMs = GTEX_TIMEOUT_MS
} = {}) {
  const status = assertBasicConfig();
  const token = await login();
  const url = new URL(`${status.baseUrl}${pathname}`);
  url.searchParams.set("token", token);

  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && clean(value) !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const execute = () => fetchJson(url.toString(), {
    method,
    timeoutMs,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  let result = await execute();

  const message = clean(result.data?.erro || result.data?.message).toLowerCase();
  const looksLikeAuthError =
    message.includes("token") &&
    (message.includes("invál") || message.includes("invalid") || message.includes("expir"));

  if (looksLikeAuthError && retryAuth) {
    const freshToken = await login({ force: true });
    url.searchParams.set("token", freshToken);
    result = await fetchJson(url.toString(), {
      method,
      timeoutMs,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
  }

  if (allowNoData && noDataResponse(result.data)) {
    return [];
  }

  if (result.data?.erro) {
    const error = new Error(result.data.erro);
    error.status = result.status || 502;
    error.details = result.data;
    throw error;
  }

  return result.data;
}

async function getProductByCodprod(codprod) {
  return gtexRequest("/api/gtex_produtos", {
    params: { codprod },
    allowNoData: true
  });
}

async function getProductsByRange({ tipoData = "C", dtini, dtfim } = {}) {
  return gtexRequest("/api/gtex_produtos", {
    params: {
      tipo_data: tipoData,
      dtini,
      dtfim
    },
    allowNoData: true,
    timeoutMs: GTEX_BULK_TIMEOUT_MS
  });
}

async function getStockByProduct(codprod, codfilial) {
  return gtexRequest("/api/gtex_estoque", {
    params: { codfilial, codprod },
    allowNoData: true
  });
}

async function getStocksByRange(codfilial, { dtini, dtfim } = {}) {
  return gtexRequest("/api/gtex_estoque", {
    params: { codfilial, dtini, dtfim },
    allowNoData: true,
    timeoutMs: GTEX_BULK_TIMEOUT_MS
  });
}

async function getPricesByProduct(codprod, codfilial) {
  return gtexRequest("/api/gtex_precos", {
    params: { codfilial, codprod },
    allowNoData: true
  });
}

async function getPricesByRange(codfilial, { dtini, dtfim } = {}) {
  return gtexRequest("/api/gtex_precos", {
    params: { codfilial, dtini, dtfim },
    allowNoData: true,
    timeoutMs: GTEX_BULK_TIMEOUT_MS
  });
}

async function insertOrder(payload) {
  return gtexRequest("/api/gtex_inserir_pedido", {
    method: "POST",
    body: payload
  });
}

async function testConnection() {
  const token = await login({ force: true });
  return {
    ok: true,
    tokenReceived: Boolean(token),
    expiresInHours: 12
  };
}

module.exports = {
  UNIT_TO_FILIAL,
  getGtexConfigStatus,
  filialForUnit,
  paymentConfig,
  login,
  gtexRequest,
  getProductByCodprod,
  getProductsByRange,
  getStockByProduct,
  getStocksByRange,
  getPricesByProduct,
  getPricesByRange,
  insertOrder,
  testConnection
};
