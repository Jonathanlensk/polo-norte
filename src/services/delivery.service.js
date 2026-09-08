const money = (value) => Number(Number(value).toFixed(2));

const UNIT_ADDRESSES = {
  julio: {
    nome: "Júlio de Mesquita",
    rua: "Rua Lamartine Babo",
    numero: "1092",
    bairro: "Conjunto Habitacional Júlio de Mesquita Filho",
    cidade: "Sorocaba",
    uf: "SP",
    cep: "18053-070",
    queries: [
      "Rua Lamartine Babo, 1092, Sorocaba, SP, 18053-070, Brasil",
      "Rua Lamartine Babo 1092, Sorocaba, SP, Brasil",
      "Rua Lamartine Babo, Sorocaba, SP, 18053-070, Brasil",
      "18053-070, Sorocaba, SP, Brasil"
    ]
  },
  vila: {
    nome: "Vila Helena",
    rua: "Avenida Riusaku Kanizawa",
    numero: "343",
    bairro: "Vila Helena",
    cidade: "Sorocaba",
    uf: "SP",
    cep: "18071-160",
    queries: [
      "Avenida Riusaku Kanizawa, 343, Sorocaba, SP, 18071-160, Brasil",
      "Avenida Riusaku Kanizawa 343, Sorocaba, SP, Brasil",
      "Avenida Riusaku Kanizawa, Sorocaba, SP, 18071-160, Brasil",
      "18071-160, Sorocaba, SP, Brasil"
    ]
  },
  divino: {
    nome: "Largo do Divino",
    rua: "Rua Doutor Luiz Mendes de Almeida",
    numero: "777",
    bairro: "Vila Espírito Santo",
    cidade: "Sorocaba",
    uf: "SP",
    cep: "18051-340",
    queries: [
      "Rua Doutor Luiz Mendes de Almeida, 777, Sorocaba, SP, 18051-340, Brasil",
      "Rua Dr. Luiz Mendes de Almeida 777, Sorocaba, SP, Brasil",
      "Avenida Doutor Luiz Mendes de Almeida, 777, Sorocaba, SP, Brasil",
      "Rua Doutor Luiz Mendes de Almeida, Sorocaba, SP, 18051-340, Brasil",
      "18051-340, Sorocaba, SP, Brasil"
    ]
  }
};

const geocodeCache = new Map();
const quoteCache = new Map();
let lastNominatimRequestAt = 0;

function numberEnv(name, fallback) {
  const raw = String(process.env[name] ?? "").trim().replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function deliverySettings() {
  return {
    pricePerKm: Math.max(0, numberEnv("DELIVERY_PRICE_PER_KM", 0)),
    minimumFee: Math.max(0, numberEnv("DELIVERY_MIN_FEE", 0)),
    maxDistanceKm: Math.max(0.5, numberEnv("DELIVERY_MAX_DISTANCE_KM", 15)),
    windowMinutes: Math.max(5, Math.round(numberEnv("DELIVERY_WINDOW_MINUTES", 10))),
    dispatchBufferMinutes: Math.max(0, Math.round(numberEnv("DELIVERY_DISPATCH_BUFFER_MINUTES", 5)))
  };
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeAddressKey(address = {}) {
  return [
    address.cep,
    address.rua,
    address.numero,
    address.bairro,
    address.cidade,
    address.uf
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join("|");
}

function buildAddressQueries(address = {}) {
  const full = [
    address.rua,
    address.numero,
    address.bairro,
    address.cidade,
    address.uf,
    address.cep,
    "Brasil"
  ].filter(Boolean).join(", ");

  const withoutNumber = [
    address.rua,
    address.bairro,
    address.cidade,
    address.uf,
    address.cep,
    "Brasil"
  ].filter(Boolean).join(", ");

  const byZip = [
    address.cep,
    address.cidade,
    address.uf,
    "Brasil"
  ].filter(Boolean).join(", ");

  return [...new Set([full, withoutNumber, byZip].filter(Boolean))];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      const error = new Error(`Serviço de mapas respondeu ${response.status}.`);
      error.status = 502;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("O serviço de mapas demorou para responder.");
      timeoutError.status = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function throttleNominatim() {
  const elapsed = Date.now() - lastNominatimRequestAt;
  const wait = Math.max(0, 1100 - elapsed);

  if (wait > 0) {
    await sleep(wait);
  }

  lastNominatimRequestAt = Date.now();
}

async function geocodeQuery(query) {
  const key = normalizeText(query);

  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }

  await throttleNominatim();

  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "br",
    q: query
  });

  const data = await fetchJson(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": "PoloNorteBebidas/1.0 delivery-quote",
        "Accept-Language": "pt-BR,pt;q=0.9"
      }
    }
  );

  const first = Array.isArray(data) ? data[0] : null;

  if (!first) {
    return null;
  }

  const point = {
    lat: Number(first.lat),
    lon: Number(first.lon),
    displayName: first.display_name || query
  };

  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) {
    return null;
  }

  geocodeCache.set(key, point);
  return point;
}

async function geocodeAddress(address) {
  for (const query of buildAddressQueries(address)) {
    const point = await geocodeQuery(query);
    if (point) return point;
  }

  const error = new Error(
    "Não conseguimos localizar esse endereço no mapa. Confira rua, número, CEP e cidade."
  );
  error.status = 400;
  throw error;
}

async function geocodeUnit(unitId) {
  const unit = UNIT_ADDRESSES[unitId];

  if (!unit) {
    const error = new Error("Unidade inválida para calcular a entrega.");
    error.status = 400;
    throw error;
  }

  // O Nominatim nem sempre encontra um endereço comercial quando bairro,
  // abreviação ou tipo de logradouro estão escritos de uma única forma.
  // Por isso tentamos do endereço mais específico até o CEP como fallback.
  const queries = [
    ...(unit.queries || []),
    ...buildAddressQueries(unit)
  ];

  for (const query of [...new Set(queries.filter(Boolean))]) {
    const point = await geocodeQuery(query);
    if (point) {
      return point;
    }
  }

  const error = new Error(
    `Não foi possível localizar a unidade ${unit.nome} no mapa.`
  );
  error.status = 502;
  throw error;
}

async function routeBetween(origin, destination) {
  const coordinates = [
    `${origin.lon},${origin.lat}`,
    `${destination.lon},${destination.lat}`
  ].join(";");

  const params = new URLSearchParams({
    overview: "false",
    steps: "false",
    alternatives: "false"
  });

  const data = await fetchJson(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`
  );

  const route = data?.routes?.[0];

  if (!route) {
    const error = new Error("Não foi possível calcular uma rota até esse endereço.");
    error.status = 400;
    throw error;
  }

  return {
    distanceKm: Number(route.distance) / 1000,
    travelMinutes: Math.max(1, Math.ceil(Number(route.duration) / 60))
  };
}

function roundUpToFive(value) {
  return Math.max(5, Math.ceil(Number(value) / 5) * 5);
}

function calculateQuoteFromRoute(route, settings = deliverySettings()) {
  const distanceKm = Number(route.distanceKm);
  const travelMinutes = Number(route.travelMinutes);

  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error("Distância de entrega inválida.");
  }

  if (distanceKm > settings.maxDistanceKm) {
    const error = new Error(
      `Esse endereço fica a ${distanceKm.toFixed(1).replace(".", ",")} km da unidade. O limite atual é ${settings.maxDistanceKm.toFixed(1).replace(".", ",")} km.`
    );
    error.status = 400;
    error.code = "DELIVERY_OUT_OF_RANGE";
    throw error;
  }

  const rawFee = distanceKm * settings.pricePerKm;
  const fee = settings.pricePerKm > 0
    ? Math.max(settings.minimumFee, rawFee)
    : 0;

  // Pequena folga operacional para separar o pedido e liberar ao motoboy.
  // Ela entra somente no cálculo da previsão e não é exibida ao cliente.
  const estimatedMinMinutes = roundUpToFive(
    travelMinutes + settings.dispatchBufferMinutes
  );
  const estimatedMaxMinutes = estimatedMinMinutes + settings.windowMinutes;

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    travelMinutes: Math.ceil(travelMinutes),
    estimatedMinMinutes,
    estimatedMaxMinutes,
    estimatedText: `${estimatedMinMinutes}–${estimatedMaxMinutes} minutos`,
    fee: money(fee),
    pricePerKm: money(settings.pricePerKm),
    minimumFee: money(settings.minimumFee),
    maxDistanceKm: Number(settings.maxDistanceKm.toFixed(2))
  };
}

async function quoteDelivery(unitId, address) {
  const addressKey = normalizeAddressKey(address);

  if (!addressKey) {
    const error = new Error("Endereço inválido para calcular a entrega.");
    error.status = 400;
    throw error;
  }

  const settings = deliverySettings();
  const cacheKey = [
    unitId,
    addressKey,
    settings.pricePerKm,
    settings.minimumFee,
    settings.maxDistanceKm,
    settings.windowMinutes,
    settings.dispatchBufferMinutes
  ].join("|");

  const cached = quoteCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.quote;
  }

  const destination = await geocodeAddress(address);
  const origin = await geocodeUnit(unitId);
  const route = await routeBetween(origin, destination);
  const quote = calculateQuoteFromRoute(route, settings);

  quoteCache.set(cacheKey, {
    quote,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  return quote;
}

module.exports = {
  quoteDelivery,
  deliverySettings,
  calculateQuoteFromRoute,
  UNIT_ADDRESSES
};
