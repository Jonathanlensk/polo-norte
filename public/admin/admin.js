const app = document.getElementById("adminApp");

const state = {
  admin: null,
  view: "orders",
  orders: [],
  summary: {
    total: 0,
    received: 0,
    preparing: 0,
    out_for_delivery: 0,
    delivered: 0
  },
  managerOverview: {
    activeProducts: 0,
    lowStock: 0,
    categories: 0
  },
  products: [],
  categories: [],
  users: [],
  settings: null,
  selectedOrder: null,
  selectedProduct: null,
  pendingImageData: null,
  removeProductImage: false,
  loading: false,
  catalogLoading: false,
  usersLoading: false,
  settingsLoading: false,
  filterStatus: "",
  search: "",
  productSearch: "",
  productCategory: "",
  stockUnit: "julio",
  loginError: ""
};

const ORDER_STATUS_TEXT = {
  received: "Pedido recebido",
  preparing: "Em separação",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue"
};

const PAYMENT_STATUS_TEXT = {
  pending: "Aguardando pagamento",
  approved: "Pagamento aprovado",
  rejected: "Pagamento rejeitado",
  cancelled: "Pagamento cancelado",
  refunded: "Pagamento estornado"
};

const PAYMENT_METHOD_TEXT = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  cartao: "Cartão"
};

const ROLE_TEXT = {
  operator: "Operador",
  manager: "Gerente"
};

const CATEGORY_ICON_OPTIONS = [
  { key: "caneca", symbol: "🍺", label: "Cerveja" },
  { key: "garrafa", symbol: "🍾", label: "Garrafa" },
  { key: "taca", symbol: "🍷", label: "Vinho" },
  { key: "lata", symbol: "🥤", label: "Refrigerante" },
  { key: "copo", symbol: "🧃", label: "Suco" },
  { key: "gota", symbol: "💧", label: "Água" },
  { key: "floco", symbol: "❄️", label: "Gelo" },
  { key: "raio", symbol: "⚡", label: "Energético" },
  { key: "snack", symbol: "🍟", label: "Salgadinho" },
  { key: "doce", symbol: "🍬", label: "Balas, chicletes e doces" },
  { key: "fogo", symbol: "🔥", label: "Carvão" },
  { key: "presente", symbol: "🎁", label: "Combo" },
  { key: "caixa", symbol: "📦", label: "Outros" }
];

const ADMIN_UNITS = [
  { id: "julio", name: "Júlio de Mesquita" },
  { id: "vila", name: "Vila Helena" },
  { id: "divino", name: "Largo do Divino" }
];

function categoryIconOption(key) {
  return CATEGORY_ICON_OPTIONS.find((option) => option.key === key)
    || CATEGORY_ICON_OPTIONS.find((option) => option.key === "presente");
}

function categoryIconSymbol(key) {
  return categoryIconOption(key)?.symbol || "🎁";
}

function adminUnitName(unitId) {
  return ADMIN_UNITS.find((unit) => unit.id === unitId)?.name || unitId;
}

function productUnitInventory(product, unitId) {
  const entry = product?.unitStock?.[unitId] || {};
  return {
    stockQuantity: Number(entry.stockQuantity || 0),
    active: entry.active !== false
  };
}

function productTotalStock(product) {
  return ADMIN_UNITS.reduce(
    (total, unit) => total + productUnitInventory(product, unit.id).stockQuantity,
    0
  );
}

function productActiveUnitCount(product) {
  return ADMIN_UNITS.filter(
    (unit) => productUnitInventory(product, unit.id).active
  ).length;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function dateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function dateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function isManager() {
  return state.admin?.role === "manager";
}

function roleText() {
  return ROLE_TEXT[state.admin?.role] || "Operador";
}

function statusBadge(value, type = "order") {
  const text = type === "payment"
    ? PAYMENT_STATUS_TEXT[value] || value
    : ORDER_STATUS_TEXT[value] || value;

  return `<span class="badge ${escapeHtml(value)}">${escapeHtml(text)}</span>`;
}

function renderLogin() {
  app.innerHTML = `
    <main class="admin-login-page">
      <section class="login-card">
        <img class="login-logo" src="/LOGO-POLO-NORTE.png" alt="Polo Norte Bebidas">
        <h1>Painel Administrativo</h1>
        <p class="subtitle">Operadores e gerentes entram pelo mesmo acesso.</p>

        <form id="loginForm">
          <div class="field">
            <label for="adminLogin">Matrícula</label>
            <input id="adminLogin" type="text" maxlength="30" autocomplete="username" placeholder="Ex.: 0001" required>
          </div>

          <div class="field">
            <label for="adminSenha">Senha</label>
            <input id="adminSenha" type="password" autocomplete="current-password" required>
          </div>

          <button class="primary-button" type="submit">Entrar</button>
          <p class="message ${state.loginError ? "error" : ""}" id="loginMessage">
            ${escapeHtml(state.loginError)}
          </p>
        </form>
      </section>
    </main>
  `;

  document.getElementById("loginForm").addEventListener("submit", login);
}

const MANAGER_MENU = [
  ["orders", "▣", "Pedidos", "Acompanhar operação"],
  ["products", "+", "Produtos", "Cadastro, preço, imagem e descrição"],
  ["stock", "#", "Estoque", "Controle de quantidade dos produtos"],
  ["categories", "≡", "Categorias", "Criar categorias da loja"],
  ["promotions", "%", "Promoções", "Ofertas e preços promocionais"],
  ["settings", "⚙", "Configurações", "Regras gerais da loja"],
  ["users", "●", "Usuários", "Operadores e gerentes"]
];

function renderManagerSidebar() {
  if (!isManager()) return "";

  return `
    <aside class="manager-sidebar">
      <div class="manager-sidebar-title">
        <span>Área do gerente</span>
        <strong>Gerenciamento</strong>
      </div>

      ${MANAGER_MENU.map(([view, icon, name, description]) => `
        <button
          class="manager-menu-item ${state.view === view ? "active" : ""}"
          type="button"
          data-manager-view="${view}"
        >
          <span class="menu-icon">${icon}</span>
          <span>
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(description)}</small>
          </span>
        </button>
      `).join("")}
    </aside>
  `;
}

function renderManagerOverview() {
  if (!isManager()) return "";

  return `
    <section class="manager-overview">
      <div>
        <span>Produtos ativos</span>
        <strong>${Number(state.managerOverview.activeProducts || 0)}</strong>
      </div>
      <div class="${state.managerOverview.lowStock > 0 ? "attention" : ""}">
        <span>Estoque baixo</span>
        <strong>${Number(state.managerOverview.lowStock || 0)}</strong>
      </div>
      <div>
        <span>Categorias atuais</span>
        <strong>${Number(state.managerOverview.categories || 0)}</strong>
      </div>
    </section>
  `;
}

function renderHeader() {
  return `
    <header class="admin-header">
      <div class="brand">
        <img src="/LOGO-POLO-NORTE.png" alt="Polo Norte">
        <div>
          <strong>Polo Norte Bebidas</strong>
          <span>Painel administrativo</span>
        </div>
      </div>

      <div class="admin-user">
        <span class="role-pill ${isManager() ? "manager" : "operator"}">${escapeHtml(roleText())}</span>
        <div class="admin-user-copy">
          <strong>${escapeHtml(state.admin.name)}</strong>
          <span>Matrícula ${escapeHtml(state.admin.login || "—")}${!isManager() && state.admin.unitId ? ` · ${escapeHtml(adminUnitName(state.admin.unitId))}` : ""}</span>
        </div>
        <button class="ghost-button" id="logoutButton">Sair</button>
      </div>
    </header>
  `;
}

function renderDashboard() {
  if (!state.admin) {
    renderLogin();
    return;
  }

  if (!isManager() && state.view !== "orders") {
    state.view = "orders";
  }

  const content = renderCurrentView();

  app.innerHTML = `
    <div class="admin-shell">
      ${renderHeader()}
      <div class="${isManager() ? "manager-layout" : ""}">
        ${renderManagerSidebar()}
        <main class="admin-content ${isManager() ? "manager-content" : ""}">
          ${isManager() && !["settings", "users"].includes(state.view) ? renderManagerOverview() : ""}
          ${content}
        </main>
      </div>
    </div>
    ${state.selectedOrder ? renderOrderModal(state.selectedOrder) : ""}
    ${state.selectedProduct ? renderProductModal(state.selectedProduct) : ""}
  `;

  bindCommonEvents();
  bindCurrentViewEvents();
  bindModalEvents();
}

function renderCurrentView() {
  switch (state.view) {
    case "products": return renderProductsView();
    case "stock": return renderStockView();
    case "categories": return renderCategoriesView();
    case "promotions": return renderPromotionsView();
    case "settings": return renderSettingsView();
    case "users": return renderUsersView();
    default: return renderOrdersView();
  }
}

function renderOrdersView() {
  const ordersHtml = state.loading
    ? `<div class="loading-state">Carregando pedidos...</div>`
    : state.orders.length
      ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th>Total</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${state.orders.map((order) => `
                <tr>
                  <td>
                    <span class="order-number">${escapeHtml(order.orderNumber)}</span>
                    <span class="cell-sub">${order.itemQuantity} item(ns)</span>
                    ${order.unitName ? `<span class="cell-sub">📍 ${escapeHtml(order.unitName)}</span>` : ""}
                  </td>
                  <td>
                    <span class="cell-main">${escapeHtml(order.customerName)}</span>
                    <span class="cell-sub">${escapeHtml(order.customerPhone)}</span>
                  </td>
                  <td>
                    ${statusBadge(order.paymentStatus, "payment")}
                    <span class="cell-sub">${escapeHtml(PAYMENT_METHOD_TEXT[order.paymentMethod] || order.paymentMethod)}</span>
                  </td>
                  <td>${statusBadge(order.orderStatus)}</td>
                  <td class="cell-main">${money(order.total)}</td>
                  <td>${dateTime(order.createdAt)}</td>
                  <td>
                    <button class="secondary-button" data-open-order="${escapeHtml(order.orderNumber)}">Ver pedido</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `
      : `<div class="empty-state">Nenhum pedido encontrado.</div>`;

  return `
    <div class="page-title-row">
      <div>
        <h1>Pedidos</h1>
        <p>${isManager()
          ? "Acompanhe e atualize os pedidos de todas as unidades."
          : state.admin.unitId
            ? `Exibindo somente pedidos de ${escapeHtml(adminUnitName(state.admin.unitId))}.`
            : "Operador sem unidade vinculada. Peça ao gerente para definir sua unidade."}</p>
      </div>
      <button class="secondary-button" id="refreshButton">Atualizar pedidos</button>
    </div>

    <section class="summary-grid">
      ${summaryCard("Hoje", state.summary.total)}
      ${summaryCard("Recebidos", state.summary.received)}
      ${summaryCard("Em separação", state.summary.preparing)}
      ${summaryCard("Em entrega", state.summary.out_for_delivery)}
      ${summaryCard("Entregues", state.summary.delivered)}
    </section>

    <section class="panel">
      <div class="toolbar">
        <input class="search-input" id="searchInput" placeholder="Buscar por pedido, cliente ou telefone" value="${escapeHtml(state.search)}">
        <select class="status-select" id="statusFilter">
          <option value="">Todos os status</option>
          ${Object.entries(ORDER_STATUS_TEXT).map(([value, label]) => `
            <option value="${value}" ${state.filterStatus === value ? "selected" : ""}>${label}</option>
          `).join("")}
        </select>
        <button class="primary-button" id="filterButton">Buscar</button>
      </div>
      ${ordersHtml}
    </section>
  `;
}

function filteredProducts() {
  const search = state.productSearch.trim().toLowerCase();
  return state.products.filter((product) => {
    const searchOk = !search || [product.name, product.description, product.category]
      .some((value) => String(value || "").toLowerCase().includes(search));
    const categoryOk = !state.productCategory || product.category === state.productCategory;
    return searchOk && categoryOk;
  });
}

function productImage(product, className = "product-thumb") {
  if (product.imageUrl) {
    return `<img class="${className}" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}">`;
  }
  return `<div class="${className} product-thumb-placeholder">🍹</div>`;
}

function promotionPriceHtml(product) {
  if (product.promotionRunning) {
    return `
      <span class="price-old">${money(product.price)}</span>
      <strong class="price-promo">${money(product.promotionPrice)}</strong>
    `;
  }

  if (product.promotionActive && product.promotionPrice != null) {
    return `
      <strong>${money(product.price)}</strong>
      <span class="cell-sub">Promoção agendada: ${money(product.promotionPrice)}</span>
    `;
  }

  return `<strong>${money(product.price)}</strong>`;
}

function renderCatalogToolbar(title, subtitle, actionText = "+ Novo produto") {
  return `
    <div class="page-title-row">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <button class="primary-button" id="newProductButton">${escapeHtml(actionText)}</button>
    </div>
  `;
}

function renderProductsView() {
  const products = filteredProducts();

  return `
    ${renderCatalogToolbar("Produtos", "Cadastre produtos, imagens, descrições, preços e disponibilidade.")}

    <section class="panel">
      <div class="catalog-toolbar">
        <input class="search-input" id="productSearch" placeholder="Buscar produto" value="${escapeHtml(state.productSearch)}">
        <select class="status-select" id="productCategoryFilter">
          <option value="">Todas as categorias</option>
          ${state.categories.map((category) => `
            <option value="${escapeHtml(category.name)}" ${state.productCategory === category.name ? "selected" : ""}>${escapeHtml(category.name)}</option>
          `).join("")}
        </select>
      </div>

      ${state.catalogLoading ? `<div class="loading-state">Carregando produtos...</div>` : products.length ? `
        <div class="table-wrap">
          <table class="products-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Lojas</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${products.map((product) => `
                <tr>
                  <td>
                    <div class="product-cell">
                      ${productImage(product)}
                      <div>
                        <span class="cell-main">${escapeHtml(product.name)}</span>
                        <span class="cell-sub">${escapeHtml(product.description || "Sem descrição")}</span>
                      </div>
                    </div>
                  </td>
                  <td>${escapeHtml(product.category)}</td>
                  <td>${promotionPriceHtml(product)}</td>
                  <td>
                    <span class="stock-badge">${productActiveUnitCount(product)}/3</span>
                    <span class="cell-sub">unidades com venda ativa</span>
                  </td>
                  <td><span class="badge ${product.active ? "approved" : "cancelled"}">${product.active ? "Ativo" : "Desativado"}</span></td>
                  <td><button class="secondary-button" data-edit-product="${product.id}">Editar</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">Nenhum produto encontrado.</div>`}
    </section>
  `;
}

function renderStockView() {
  const products = filteredProducts();
  const selectedUnit = ADMIN_UNITS.find((unit) => unit.id === state.stockUnit) || ADMIN_UNITS[0];

  return `
    <div class="page-title-row">
      <div>
        <h1>Estoque por unidade</h1>
        <p>Controle separadamente o que existe e o que é vendido em cada loja.</p>
      </div>
      <button class="secondary-button" id="reloadCatalogButton">Atualizar estoque</button>
    </div>

    <section class="panel">
      <div class="stock-unit-selector">
        <div>
          <strong>Unidade selecionada</strong>
          <span>As alterações abaixo afetam somente esta loja.</span>
        </div>
        <select class="status-select" id="stockUnitSelect">
          ${ADMIN_UNITS.map((unit) => `
            <option value="${unit.id}" ${state.stockUnit === unit.id ? "selected" : ""}>${escapeHtml(unit.name)}</option>
          `).join("")}
        </select>
      </div>

      <div class="catalog-toolbar">
        <input class="search-input" id="productSearch" placeholder="Buscar produto" value="${escapeHtml(state.productSearch)}">
        <select class="status-select" id="productCategoryFilter">
          <option value="">Todas as categorias</option>
          ${state.categories.map((category) => `
            <option value="${escapeHtml(category.name)}" ${state.productCategory === category.name ? "selected" : ""}>${escapeHtml(category.name)}</option>
          `).join("")}
        </select>
      </div>

      <div class="stock-unit-heading">
        <strong>${escapeHtml(selectedUnit.name)}</strong>
        <span>${products.length} produto(s) no catálogo</span>
      </div>

      <div class="stock-grid">
        ${products.map((product) => {
          const inventory = productUnitInventory(product, state.stockUnit);
          const low = inventory.active && inventory.stockQuantity <= 5;
          return `
            <article class="stock-card ${low ? "stock-card-low" : ""} ${!inventory.active ? "stock-card-disabled" : ""}">
              ${productImage(product, "stock-thumb")}
              <div class="stock-copy">
                <strong>${escapeHtml(product.name)}</strong>
                <span>${escapeHtml(product.category)}</span>
                <em class="store-product-status ${inventory.active ? "available" : "unavailable"}">
                  ${inventory.active ? "Vendido nesta unidade" : "Não vendido nesta unidade"}
                </em>
              </div>
              <label class="stock-available-toggle">
                <input type="checkbox" data-stock-active="${product.id}" ${inventory.active ? "checked" : ""}>
                Disponível
              </label>
              <label>
                Quantidade
                <input type="number" min="0" step="1" value="${inventory.stockQuantity}" data-stock-input="${product.id}">
              </label>
              <button class="primary-button" data-save-stock="${product.id}">Salvar</button>
            </article>
          `;
        }).join("") || `<div class="empty-state">Nenhum produto encontrado.</div>`}
      </div>
    </section>
  `;
}

function renderCategoriesView() {
  return `
    <div class="page-title-row">
      <div>
        <h1>Categorias</h1>
        <p>Crie novas categorias que aparecerão automaticamente no catálogo do cliente.</p>
      </div>
    </div>

    <section class="category-layout">
      <form class="panel category-create" id="categoryForm">
        <h2>Nova categoria</h2>
        <p class="cell-sub">Ex.: Combos, Snacks, Carvão, Sucos.</p>
        <div class="field">
          <label for="categoryName">Nome</label>
          <input id="categoryName" maxlength="100" placeholder="Nome da categoria" required>
        </div>

        <fieldset class="category-icon-picker">
          <legend>Ícone da categoria</legend>
          <p class="cell-sub">Escolha o símbolo que melhor representa a categoria no catálogo do cliente.</p>
          <div class="category-icon-options">
            ${CATEGORY_ICON_OPTIONS.map((option) => `
              <label class="category-icon-choice" title="${escapeHtml(option.label)}">
                <input type="radio" name="categoryIcon" value="${escapeHtml(option.key)}" required>
                <span class="category-icon-choice-symbol">${option.symbol}</span>
                <span class="category-icon-choice-label">${escapeHtml(option.label)}</span>
              </label>
            `).join("")}
          </div>
        </fieldset>

        <button class="primary-button" type="submit">Adicionar categoria</button>
        <p class="message" id="categoryMessage"></p>
      </form>

      <section class="panel category-list-panel">
        <div class="panel-heading">
          <h2>Categorias cadastradas</h2>
          <span>${state.categories.length}</span>
        </div>
        <div class="category-list">
          ${state.categories.map((category) => {
            const count = state.products.filter((product) => product.category === category.name).length;
            return `
              <div class="category-row">
                <div class="category-row-main">
                  <span class="category-row-icon" aria-hidden="true">${categoryIconSymbol(category.icon)}</span>
                  <div>
                    <strong>${escapeHtml(category.name)}</strong>
                    <span>${count} produto(s)</span>
                  </div>
                </div>
                <div class="category-row-actions">
                  <select class="category-icon-select" data-category-icon-select="${category.id}" aria-label="Ícone de ${escapeHtml(category.name)}">
                    ${CATEGORY_ICON_OPTIONS.map((option) => `
                      <option value="${escapeHtml(option.key)}" ${option.key === category.icon ? "selected" : ""}>${option.symbol} ${escapeHtml(option.label)}</option>
                    `).join("")}
                  </select>
                  <button class="secondary-button category-icon-save" type="button" data-save-category-icon="${category.id}">Salvar ícone</button>
                  <span class="badge approved">Ativa</span>
                </div>
              </div>
            `;
          }).join("") || `<div class="empty-state">Nenhuma categoria cadastrada.</div>`}
        </div>
      </section>
    </section>
  `;
}

function renderPromotionsView() {
  const promotions = state.products.filter((product) => product.promotionActive);
  const available = state.products.filter((product) => !product.promotionActive);

  return `
    <div class="page-title-row">
      <div>
        <h1>Promoções</h1>
        <p>Defina preço promocional e, se quiser, período de início e fim.</p>
      </div>
      <button class="primary-button" id="newPromotionButton">+ Criar promoção</button>
    </div>

    <section class="promo-grid">
      ${promotions.map((product) => `
        <article class="promo-card ${product.promotionRunning ? "running" : "scheduled"}">
          ${productImage(product, "promo-thumb")}
          <div class="promo-card-copy">
            <span class="badge ${product.promotionRunning ? "approved" : "preparing"}">${product.promotionRunning ? "Oferta ativa" : "Agendada"}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.category)}</p>
            <div class="promo-prices">
              <span>${money(product.price)}</span>
              <strong>${money(product.promotionPrice)}</strong>
            </div>
            <small>
              ${product.promotionStartsAt ? `Início: ${dateTime(product.promotionStartsAt)}` : "Início imediato"}<br>
              ${product.promotionEndsAt ? `Fim: ${dateTime(product.promotionEndsAt)}` : "Sem data final"}
            </small>
          </div>
          <button class="secondary-button" data-edit-product="${product.id}">Editar oferta</button>
        </article>
      `).join("") || `<div class="panel empty-state">Nenhuma promoção cadastrada.</div>`}
    </section>

    ${available.length ? `
      <section class="panel promotion-products-panel">
        <div class="panel-heading">
          <h2>Produtos sem promoção</h2>
          <span>${available.length}</span>
        </div>
        <div class="compact-product-list">
          ${available.map((product) => `
            <button type="button" data-edit-product="${product.id}">
              ${productImage(product, "compact-thumb")}
              <span><strong>${escapeHtml(product.name)}</strong><small>${money(product.price)}</small></span>
              <em>Configurar oferta</em>
            </button>
          `).join("")}
        </div>
      </section>
    ` : ""}
  `;
}


function renderSettingsView() {
  const settings = state.settings || {
    storeName: "Polo Norte Bebidas",
    whatsapp: "",
    deliveryLabel: "Entrega rápida",
    delivery: {
      pricePerKm: 1.5,
      minimumFee: 4,
      maxDistanceKm: 15,
      windowMinutes: 10,
      dispatchBufferMinutes: 5
    },
    units: {
      julio: { active: true },
      vila: { active: true },
      divino: { active: true }
    }
  };

  return `
    <div class="page-title-row">
      <div>
        <h1>Configurações</h1>
        <p>Controle os dados da loja, os valores de entrega e o funcionamento de cada unidade.</p>
      </div>
    </div>

    ${state.settingsLoading ? `<div class="loading-state">Carregando configurações...</div>` : `
      <form id="settingsForm" class="settings-grid">
        <section class="panel settings-card">
          <div class="settings-card-title">
            <span class="settings-icon">◉</span>
            <div>
              <h2>Informações da loja</h2>
              <p>Dados e textos exibidos ao cliente.</p>
            </div>
          </div>

          <div class="field">
            <label for="settingsStoreName">Nome da loja</label>
            <input id="settingsStoreName" maxlength="150" value="${escapeHtml(settings.storeName)}" required>
          </div>

          <div class="field">
            <label for="settingsWhatsapp">WhatsApp de contato</label>
            <input id="settingsWhatsapp" maxlength="30" value="${escapeHtml(settings.whatsapp || "")}" placeholder="Ex.: 15999999999">
          </div>

          <div class="field">
            <label for="settingsDeliveryLabel">Texto mostrado sobre a entrega</label>
            <input id="settingsDeliveryLabel" maxlength="80" value="${escapeHtml(settings.deliveryLabel)}" placeholder="Entrega rápida" required>
            <small class="field-help">Exemplo: “Entrega rápida”. Esse texto aparece na área do cliente.</small>
          </div>
        </section>

        <section class="panel settings-card">
          <div class="settings-card-title">
            <span class="settings-icon">↗</span>
            <div>
              <h2>Valores e alcance da entrega</h2>
              <p>Defina quanto cobrar, até onde entregar e como montar a previsão de chegada.</p>
            </div>
          </div>

          <div class="settings-number-grid">
            <div class="field">
              <label for="settingsPricePerKm">Valor cobrado por km (R$)</label>
              <input id="settingsPricePerKm" type="number" min="0" max="100" step="0.01" value="${Number(settings.delivery.pricePerKm)}" required>
              <small class="field-help">Ex.: 1,50 significa R$ 1,50 por km percorrido.</small>
            </div>
            <div class="field">
              <label for="settingsMinimumFee">Valor mínimo da entrega (R$)</label>
              <input id="settingsMinimumFee" type="number" min="0" max="500" step="0.01" value="${Number(settings.delivery.minimumFee)}" required>
              <small class="field-help">Menor valor cobrado mesmo quando o cálculo por km for mais baixo.</small>
            </div>
            <div class="field">
              <label for="settingsMaxDistance">Distância máxima para entrega (km)</label>
              <input id="settingsMaxDistance" type="number" min="0.5" max="200" step="0.1" value="${Number(settings.delivery.maxDistanceKm)}" required>
              <small class="field-help">Endereços acima desse limite não poderão finalizar a entrega.</small>
            </div>
            <div class="field">
              <label for="settingsWindowMinutes">Intervalo da previsão (min)</label>
              <input id="settingsWindowMinutes" type="number" min="5" max="180" step="1" value="${Number(settings.delivery.windowMinutes)}" required>
              <small class="field-help">Ex.: 5 gera uma previsão como 15–20 minutos.</small>
            </div>
            <div class="field">
              <label for="settingsDispatchBuffer">Tempo extra antes da saída (min)</label>
              <input id="settingsDispatchBuffer" type="number" min="0" max="180" step="1" value="${Number(settings.delivery.dispatchBufferMinutes)}" required>
              <small class="field-help">Minutos acrescentados ao tempo da rota antes de formar a previsão.</small>
            </div>
          </div>
        </section>

        <section class="panel settings-card settings-units-card">
          <div class="settings-card-title">
            <span class="settings-icon">⌂</span>
            <div>
              <h2>Status das unidades</h2>
              <p>Feche apenas a unidade desejada. As outras continuam recebendo pedidos normalmente.</p>
            </div>
          </div>

          <div class="unit-settings-list">
            ${[
              ["julio", "Júlio de Mesquita", "R. Lamartine Babo, 1092"],
              ["vila", "Vila Helena", "Av. Riusaku Kanizawa, 343"],
              ["divino", "Largo do Divino", "R. Dr. Luiz Mendes de Almeida, 777"]
            ].map(([id, name, address]) => {
              const opened = settings.units?.[id]?.active !== false;
              return `
                <label class="unit-setting-row ${opened ? "unit-open" : "unit-closed"}">
                  <span>
                    <strong>${escapeHtml(name)}</strong>
                    <small>${escapeHtml(address)}</small>
                  </span>
                  <span class="switch-control">
                    <input type="checkbox" data-unit-setting="${id}" ${opened ? "checked" : ""}>
                    <em>${opened ? "Aberta 24 horas" : "Fechada temporariamente"}</em>
                  </span>
                </label>
              `;
            }).join("")}
          </div>
          <p class="settings-help">Ao fechar uma unidade, ela continuará aparecendo para o cliente como “Fechada temporariamente”, mas não poderá ser selecionada para novos pedidos.</p>
        </section>

        <section class="panel settings-save-card">
          <div>
            <h2>Salvar configurações</h2>
            <p>As alterações de preço, alcance e status das unidades passam a valer para novos pedidos.</p>
          </div>
          <div class="settings-save-actions">
            <p class="message" id="settingsMessage"></p>
            <button class="primary-button" type="submit" id="saveSettingsButton">Salvar configurações</button>
          </div>
        </section>
      </form>
    `}
  `;
}

function renderUsersView() {
  return `
    <div class="page-title-row">
      <div>
        <h1>Usuários</h1>
        <p>Cadastre operadores e gerentes que poderão acessar o painel pela matrícula.</p>
      </div>
    </div>

    <section class="users-layout">
      <form class="panel user-create-card" id="userCreateForm">
        <div class="panel-heading">
          <div>
            <h2>Novo acesso</h2>
            <p class="cell-sub">O login no painel será feito com matrícula e senha.</p>
          </div>
        </div>

        <div class="field">
          <label for="newUserName">Nome</label>
          <input id="newUserName" maxlength="150" placeholder="Nome do usuário" required>
        </div>

        <div class="field">
          <label for="newUserLogin">Matrícula</label>
          <input id="newUserLogin" maxlength="30" placeholder="Ex.: 0002 ou CAIXA01" required>
        </div>

        <div class="field">
          <label for="newUserEmail">E-mail de contato <small>(opcional)</small></label>
          <input id="newUserEmail" type="email" maxlength="200" placeholder="usuario@email.com">
        </div>

        <div class="field">
          <label for="newUserRole">Perfil</label>
          <select id="newUserRole" class="status-select">
            <option value="operator">Operador — pedidos e status</option>
            <option value="manager">Gerente — acesso completo</option>
          </select>
        </div>

        <div class="field" id="newUserUnitField">
          <label for="newUserUnit">Unidade do operador</label>
          <select id="newUserUnit" class="status-select">
            <option value="">Selecione a unidade</option>
            ${ADMIN_UNITS.map((unit) => `<option value="${unit.id}">${escapeHtml(unit.name)}</option>`).join("")}
          </select>
          <small class="cell-sub">O operador verá somente os pedidos desta unidade.</small>
        </div>

        <div class="field">
          <label for="newUserPassword">Senha</label>
          <input id="newUserPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres" required>
        </div>

        <button class="primary-button" type="submit" id="createUserButton">Criar usuário</button>
        <p class="message" id="userCreateMessage"></p>
      </form>

      <section class="panel user-list-panel">
        <div class="panel-heading">
          <div>
            <h2>Acessos cadastrados</h2>
            <p class="cell-sub">Altere matrícula, perfil e situação de acesso.</p>
          </div>
          <span>${state.users.length}</span>
        </div>

        ${state.usersLoading ? `<div class="loading-state">Carregando usuários...</div>` : `
          <div class="admin-users-list">
            ${state.users.map((user) => `
              <article class="admin-user-card ${user.active ? "" : "inactive"}" data-user-card="${user.id}">
                <div class="admin-user-card-top">
                  <div>
                    <strong>${escapeHtml(user.name)}</strong>
                    <span class="role-pill ${user.role === "manager" ? "manager" : "operator"}">${escapeHtml(ROLE_TEXT[user.role] || user.role)}</span>
                  </div>
                  <span class="badge ${user.active ? "approved" : "cancelled"}">${user.active ? "Ativo" : "Desativado"}</span>
                </div>

                <div class="user-edit-grid">
                  <div class="field">
                    <label>Nome</label>
                    <input data-user-name="${user.id}" maxlength="150" value="${escapeHtml(user.name)}">
                  </div>
                  <div class="field">
                    <label>Matrícula</label>
                    <input data-user-login="${user.id}" maxlength="30" value="${escapeHtml(user.login)}">
                  </div>
                  <div class="field">
                    <label>E-mail <small>(opcional)</small></label>
                    <input data-user-email="${user.id}" type="email" maxlength="200" value="${escapeHtml(user.email || "")}">
                  </div>
                  <div class="field">
                    <label>Perfil</label>
                    <select class="status-select" data-user-role="${user.id}">
                      <option value="operator" ${user.role === "operator" ? "selected" : ""}>Operador</option>
                      <option value="manager" ${user.role === "manager" ? "selected" : ""}>Gerente</option>
                    </select>
                  </div>
                  <div class="field user-unit-field" data-user-unit-field="${user.id}">
                    <label>Unidade do operador</label>
                    <select class="status-select" data-user-unit="${user.id}" ${user.role === "manager" ? "disabled" : ""}>
                      <option value="">Selecione a unidade</option>
                      ${ADMIN_UNITS.map((unit) => `<option value="${unit.id}" ${user.unitId === unit.id ? "selected" : ""}>${escapeHtml(unit.name)}</option>`).join("")}
                    </select>
                    <small class="cell-sub">${user.role === "manager" ? "Gerentes visualizam todas as unidades." : "Este operador verá somente os pedidos desta unidade."}</small>
                  </div>
                </div>

                <div class="user-card-footer">
                  <div class="user-meta">
                    <span>Último acesso: ${dateTime(user.lastLoginAt)}</span>
                    <span>Criado em: ${dateTime(user.createdAt)}</span>
                  </div>
                  <label class="switch-line compact">
                    <input type="checkbox" data-user-active="${user.id}" ${user.active ? "checked" : ""} ${Number(user.id) === Number(state.admin.id) ? "disabled" : ""}>
                    <span>Acesso ativo</span>
                  </label>
                  <button class="secondary-button" type="button" data-reset-user-password="${user.id}">Redefinir senha</button>
                  <button class="primary-button" type="button" data-save-user="${user.id}">Salvar acesso</button>
                </div>
              </article>
            `).join("") || `<div class="empty-state">Nenhum usuário administrativo cadastrado.</div>`}
          </div>
        `}
      </section>
    </section>
  `;
}

function summaryCard(label, value) {
  return `
    <div class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${Number(value || 0)}</strong>
    </div>
  `;
}

function renderOrderModal(order) {
  return `
    <div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-label="Detalhes do pedido">
        <header class="modal-header">
          <div><span class="cell-sub">Pedido</span><h2>${escapeHtml(order.orderNumber)}</h2></div>
          <button class="ghost-button" id="closeOrderModal">Fechar</button>
        </header>
        <div class="modal-body">
          <div class="detail-grid">
            ${detailCard("Cliente", order.customerName)}
            ${detailCard("Unidade", order.unitName || "—")}
            ${detailCard("WhatsApp", order.customerPhone)}
            ${detailCard("Pagamento", `${PAYMENT_METHOD_TEXT[order.paymentMethod] || order.paymentMethod} · ${PAYMENT_STATUS_TEXT[order.paymentStatus] || order.paymentStatus}`)}
            ${detailCard("Criado em", dateTime(order.createdAt))}
            ${detailCard("Endereço", order.deliveryAddress)}
            ${detailCard("Referência", order.deliveryReference || "Não informada")}
          </div>
          <h3>Itens do pedido</h3>
          <div class="items-list">
            ${(order.items || []).map((item) => `
              <div class="item-row">
                <div><strong>${escapeHtml(item.quantity)}x ${escapeHtml(item.productName)}</strong><span>${money(item.unitPrice)} cada</span></div>
                <strong>${money(item.subtotal)}</strong>
              </div>
            `).join("")}
          </div>
          <div class="detail-grid" style="margin-top:20px">
            ${detailCard("Subtotal", money(order.subtotal))}
            ${detailCard("Taxa de entrega", money(order.deliveryFee))}
            ${detailCard("Total", money(order.total))}
            ${detailCard("Status atual", ORDER_STATUS_TEXT[order.orderStatus] || order.orderStatus)}
          </div>
          <div class="status-editor">
            <div class="field">
              <label for="orderStatusSelect">Atualizar status do pedido</label>
              <select class="status-select" id="orderStatusSelect">
                ${Object.entries(ORDER_STATUS_TEXT).map(([value, label]) => `
                  <option value="${value}" ${order.orderStatus === value ? "selected" : ""}>${label}</option>
                `).join("")}
              </select>
            </div>
            <button class="primary-button" id="saveStatusButton">Salvar status</button>
          </div>
          <p class="message" id="statusMessage"></p>
        </div>
      </section>
    </div>
  `;
}

function renderProductModal(product) {
  const isNew = product.id == null;
  const preview = state.pendingImageData || product.imageUrl || "";

  return `
    <div class="modal-backdrop">
      <section class="modal product-modal" role="dialog" aria-modal="true" aria-label="${isNew ? "Novo produto" : "Editar produto"}">
        <header class="modal-header">
          <div><span class="cell-sub">Catálogo</span><h2>${isNew ? "Novo produto" : "Editar produto"}</h2></div>
          <button class="ghost-button" id="closeProductModal">Fechar</button>
        </header>

        <form id="productForm">
          <div class="modal-body product-form-grid">
            <section class="product-image-editor">
              <div class="product-image-preview" id="productImagePreview">
                ${preview ? `<img src="${escapeHtml(preview)}" alt="Prévia do produto">` : `<span>🍹</span><small>Sem imagem</small>`}
              </div>
              <label class="secondary-button file-button">
                Escolher imagem
                <input id="productImage" type="file" accept="image/jpeg,image/png,image/webp">
              </label>
              ${product.imageUrl ? `
                <label class="check-line">
                  <input id="removeProductImage" type="checkbox" ${state.removeProductImage ? "checked" : ""}>
                  Remover imagem atual
                </label>
              ` : ""}
              <small>JPG, PNG ou WEBP. A imagem é otimizada antes do envio.</small>
            </section>

            <section>
              <div class="field">
                <label for="productName">Nome do produto</label>
                <input id="productName" maxlength="150" value="${escapeHtml(product.name || "")}" required>
              </div>
              <div class="field">
                <label for="productDescription">Descrição</label>
                <textarea id="productDescription" rows="3" maxlength="500" placeholder="Ex.: Long Neck 330ml">${escapeHtml(product.description || "")}</textarea>
              </div>
              <div class="form-row product-basic-row">
                <div class="field">
                  <label for="productCategory">Categoria</label>
                  <select id="productCategory" class="status-select" required>
                    <option value="">Selecione</option>
                    ${state.categories.map((category) => `
                      <option value="${escapeHtml(category.name)}" ${product.category === category.name ? "selected" : ""}>${escapeHtml(category.name)}</option>
                    `).join("")}
                  </select>
                </div>
                <div class="field">
                  <label for="productPrice">Preço normal</label>
                  <input id="productPrice" type="number" min="0" step="0.01" value="${product.price ?? ""}" required>
                </div>
              </div>
              <label class="switch-line">
                <input id="productActive" type="checkbox" ${product.active !== false ? "checked" : ""}>
                <span>Produto ativo no catálogo</span>
              </label>
            </section>

            <section class="unit-inventory-editor">
              <div class="promotion-heading">
                <div>
                  <strong>Disponibilidade e estoque por unidade</strong>
                  <span>Defina em quais lojas este produto é vendido e a quantidade de cada uma.</span>
                </div>
              </div>
              <div class="unit-inventory-grid">
                ${ADMIN_UNITS.map((unit) => {
                  const inventory = productUnitInventory(product, unit.id);
                  return `
                    <div class="unit-inventory-card">
                      <div>
                        <strong>${escapeHtml(unit.name)}</strong>
                        <label class="switch-line compact">
                          <input id="productUnitActive-${unit.id}" type="checkbox" ${inventory.active ? "checked" : ""}>
                          <span>Vender nesta unidade</span>
                        </label>
                      </div>
                      <label class="field">
                        <span>Quantidade em estoque</span>
                        <input id="productUnitStock-${unit.id}" type="number" min="0" step="1" value="${inventory.stockQuantity}" required>
                      </label>
                    </div>
                  `;
                }).join("")}
              </div>
              <small>Estoque zero deixa o produto indisponível para compra naquela unidade, mesmo que a opção “Vender nesta unidade” esteja marcada.</small>
            </section>

            <section class="promotion-editor">
              <div class="promotion-heading">
                <div><strong>Promoção / oferta</strong><span>Opcional</span></div>
                <label class="switch-line compact">
                  <input id="promotionActive" type="checkbox" ${product.promotionActive ? "checked" : ""}>
                  <span>Ativar promoção</span>
                </label>
              </div>
              <div class="form-row promo-fields">
                <div class="field">
                  <label for="promotionPrice">Preço promocional</label>
                  <input id="promotionPrice" type="number" min="0" step="0.01" value="${product.promotionPrice ?? ""}" placeholder="0,00">
                </div>
                <div class="field">
                  <label for="promotionStartsAt">Início</label>
                  <input id="promotionStartsAt" type="datetime-local" value="${dateTimeLocal(product.promotionStartsAt)}">
                </div>
                <div class="field">
                  <label for="promotionEndsAt">Fim</label>
                  <input id="promotionEndsAt" type="datetime-local" value="${dateTimeLocal(product.promotionEndsAt)}">
                </div>
              </div>
              <small>Sem data de início = começa imediatamente. Sem data final = fica ativa até o gerente desativar.</small>
            </section>
          </div>

          <footer class="modal-footer">
            <p class="message" id="productMessage"></p>
            <button class="ghost-button" type="button" id="cancelProductButton">Cancelar</button>
            <button class="primary-button" type="submit" id="saveProductButton">Salvar produto</button>
          </footer>
        </form>
      </section>
    </div>
  `;
}

function detailCard(label, value) {
  return `<div class="detail-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function bindCommonEvents() {
  document.getElementById("logoutButton")?.addEventListener("click", logout);

  document.querySelectorAll("[data-manager-view]").forEach((button) => {
    button.addEventListener("click", () => navigateManager(button.dataset.managerView));
  });

}

function bindCurrentViewEvents() {
  if (state.view === "orders") {
    document.getElementById("refreshButton")?.addEventListener("click", loadOrders);
    document.getElementById("filterButton")?.addEventListener("click", applyFilters);
    document.getElementById("searchInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") applyFilters();
    });
    document.getElementById("statusFilter")?.addEventListener("change", applyFilters);
    document.querySelectorAll("[data-open-order]").forEach((button) => {
      button.addEventListener("click", () => openOrder(button.dataset.openOrder));
    });
    return;
  }

  if (state.view === "settings") {
    document.getElementById("settingsForm")?.addEventListener("submit", saveSettings);
    document.querySelectorAll("[data-unit-setting]").forEach((input) => {
      input.addEventListener("change", () => {
        const label = input.closest(".switch-control")?.querySelector("em");
        const row = input.closest(".unit-setting-row");

        if (label) {
          label.textContent = input.checked
            ? "Aberta 24 horas"
            : "Fechada temporariamente";
        }

        if (row) {
          row.classList.toggle("unit-open", input.checked);
          row.classList.toggle("unit-closed", !input.checked);
        }
      });
    });
    return;
  }

  if (state.view === "users") {
    document.getElementById("userCreateForm")?.addEventListener("submit", createAdminUser);

    const newRole = document.getElementById("newUserRole");
    const newUnit = document.getElementById("newUserUnit");
    const syncNewUserUnit = () => {
      if (!newRole || !newUnit) return;
      const operator = newRole.value === "operator";
      newUnit.disabled = !operator;
      newUnit.required = operator;
      if (!operator) newUnit.value = "";
    };
    newRole?.addEventListener("change", syncNewUserUnit);
    syncNewUserUnit();

    document.querySelectorAll("[data-user-role]").forEach((roleSelect) => {
      const userId = Number(roleSelect.dataset.userRole);
      const unitSelect = document.querySelector(`[data-user-unit="${userId}"]`);
      const help = document.querySelector(`[data-user-unit-field="${userId}"] .cell-sub`);
      const sync = () => {
        if (!unitSelect) return;
        const operator = roleSelect.value === "operator";
        unitSelect.disabled = !operator;
        unitSelect.required = operator;
        if (!operator) unitSelect.value = "";
        if (help) help.textContent = operator
          ? "Este operador verá somente os pedidos desta unidade."
          : "Gerentes visualizam todas as unidades.";
      };
      roleSelect.addEventListener("change", sync);
      sync();
    });

    document.querySelectorAll("[data-save-user]").forEach((button) => {
      button.addEventListener("click", () => saveAdminUser(Number(button.dataset.saveUser), button));
    });

    document.querySelectorAll("[data-reset-user-password]").forEach((button) => {
      button.addEventListener("click", () => resetAdminUserPassword(Number(button.dataset.resetUserPassword)));
    });
    return;
  }

  document.getElementById("newProductButton")?.addEventListener("click", () => openProduct());
  document.getElementById("newPromotionButton")?.addEventListener("click", openPromotionChooser);
  document.getElementById("reloadCatalogButton")?.addEventListener("click", loadManagerCatalog);
  document.getElementById("stockUnitSelect")?.addEventListener("change", (event) => {
    state.stockUnit = event.target.value;
    renderDashboard();
  });

  const searchInput = document.getElementById("productSearch");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.productSearch = searchInput.value;
      renderDashboard();
      document.getElementById("productSearch")?.focus();
    });
  }

  document.getElementById("productCategoryFilter")?.addEventListener("change", (event) => {
    state.productCategory = event.target.value;
    renderDashboard();
  });

  document.querySelectorAll("[data-edit-product]").forEach((button) => {
    button.addEventListener("click", () => openProduct(Number(button.dataset.editProduct)));
  });

  document.querySelectorAll("[data-save-stock]").forEach((button) => {
    button.addEventListener("click", () => saveStock(Number(button.dataset.saveStock), button));
  });

  document.getElementById("categoryForm")?.addEventListener("submit", createCategory);

  document.querySelectorAll("[data-save-category-icon]").forEach((button) => {
    button.addEventListener("click", () => saveCategoryIcon(Number(button.dataset.saveCategoryIcon), button));
  });
}

function bindModalEvents() {
  document.getElementById("closeOrderModal")?.addEventListener("click", closeOrder);
  document.getElementById("saveStatusButton")?.addEventListener("click", updateOrderStatus);
  document.getElementById("closeProductModal")?.addEventListener("click", closeProduct);
  document.getElementById("cancelProductButton")?.addEventListener("click", closeProduct);
  document.getElementById("productForm")?.addEventListener("submit", saveProduct);
  document.getElementById("productImage")?.addEventListener("change", handleProductImage);
  document.getElementById("removeProductImage")?.addEventListener("change", (event) => {
    state.removeProductImage = event.target.checked;
  });

  // Se o gerente digitar um preço de oferta, ativa a promoção automaticamente.
  // Ele ainda pode desmarcar manualmente antes de salvar, se desejar.
  document.getElementById("promotionPrice")?.addEventListener("input", (event) => {
    const active = document.getElementById("promotionActive");
    if (active && String(event.target.value || "").trim() !== "") {
      active.checked = true;
    }
  });

  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target !== backdrop) return;
      if (state.selectedProduct) closeProduct();
      else if (state.selectedOrder) closeOrder();
    });
  });
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  let data = {};
  try { data = await response.json(); } catch (error) { data = {}; }

  if (!response.ok) {
    const requestError = new Error(data.message || "Não foi possível concluir a operação.");
    requestError.status = response.status;
    throw requestError;
  }

  return data;
}

async function login(event) {
  event.preventDefault();
  state.loginError = "";
  const login = document.getElementById("adminLogin").value.trim();
  const senha = document.getElementById("adminSenha").value;
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Entrando...";

  try {
    const data = await request("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, senha })
    });
    state.admin = data.admin;
    state.view = "orders";
    await loadDashboardData();
  } catch (error) {
    state.loginError = error.message;
    renderLogin();
  }
}

async function logout() {
  try { await request("/api/admin/auth/logout", { method: "POST" }); } catch (error) {}
  state.admin = null;
  state.orders = [];
  state.products = [];
  state.categories = [];
  state.users = [];
  state.settings = null;
  state.selectedOrder = null;
  state.selectedProduct = null;
  renderLogin();
}

async function loadManagerOverview() {
  if (!isManager()) return;
  try {
    const data = await request("/api/admin/manager/overview");
    state.managerOverview = data.overview || state.managerOverview;
  } catch (error) {
    if (error.status === 401) throw error;
    if (error.status === 403) {
      state.admin.role = "operator";
      state.view = "orders";
      return;
    }
    console.error("Resumo gerencial:", error);
  }
}

async function loadDashboardData() {
  if (!state.admin) return;
  await loadManagerOverview();
  await loadOrders();
  if (isManager()) await loadManagerCatalog(false);
}

async function loadOrders() {
  if (!state.admin) return;
  state.loading = true;
  if (state.view === "orders") renderDashboard();

  try {
    const params = new URLSearchParams();
    if (state.filterStatus) params.set("status", state.filterStatus);
    if (state.search) params.set("search", state.search);
    const data = await request(`/api/admin/orders?${params.toString()}`);
    state.orders = data.orders || [];
    state.summary = data.summary || state.summary;
    if (isManager()) await loadManagerOverview();
  } catch (error) {
    if (error.status === 401) {
      state.admin = null;
      renderLogin();
      return;
    }
    alert(error.message);
  } finally {
    state.loading = false;
    if (state.admin && state.view === "orders") renderDashboard();
  }
}

async function loadManagerCatalog(shouldRender = true) {
  if (!isManager()) return;
  state.catalogLoading = true;
  if (shouldRender) renderDashboard();

  try {
    const data = await request("/api/admin/manager/products");
    state.products = data.products || [];
    state.categories = data.categories || [];
    await loadManagerOverview();
  } catch (error) {
    if (error.status === 401) {
      state.admin = null;
      renderLogin();
      return;
    }
    alert(error.message);
  } finally {
    state.catalogLoading = false;
    if (shouldRender && state.admin) renderDashboard();
  }
}


async function loadSettings() {
  if (!isManager()) return;
  state.settingsLoading = true;
  renderDashboard();

  try {
    const data = await request("/api/admin/manager/settings");
    state.settings = data.settings || null;
  } catch (error) {
    if (error.status === 401) {
      state.admin = null;
      renderLogin();
      return;
    }
    alert(error.message);
  } finally {
    state.settingsLoading = false;
    if (state.admin && state.view === "settings") renderDashboard();
  }
}

async function saveSettings(event) {
  event.preventDefault();

  const button = document.getElementById("saveSettingsButton");
  const message = document.getElementById("settingsMessage");

  const unitActive = (id) =>
    document.querySelector(`[data-unit-setting="${id}"]`)?.checked !== false;

  const body = {
    storeName: document.getElementById("settingsStoreName").value.trim(),
    whatsapp: document.getElementById("settingsWhatsapp").value.trim(),
    storeOpen: true,
    deliveryLabel: document.getElementById("settingsDeliveryLabel").value.trim(),
    delivery: {
      pricePerKm: Number(document.getElementById("settingsPricePerKm").value),
      minimumFee: Number(document.getElementById("settingsMinimumFee").value),
      maxDistanceKm: Number(document.getElementById("settingsMaxDistance").value),
      windowMinutes: Number(document.getElementById("settingsWindowMinutes").value),
      dispatchBufferMinutes: Number(document.getElementById("settingsDispatchBuffer").value)
    },
    units: {
      julio: { active: unitActive("julio") },
      vila: { active: unitActive("vila") },
      divino: { active: unitActive("divino") }
    }
  };

  button.disabled = true;
  button.textContent = "Salvando...";
  message.className = "message";
  message.textContent = "";

  try {
    const data = await request("/api/admin/manager/settings", {
      method: "PUT",
      body: JSON.stringify(body)
    });

    state.settings = data.settings;
    message.className = "message success";
    message.textContent = "Configurações salvas com sucesso.";
  } catch (error) {
    message.className = "message error";
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Salvar configurações";
  }
}

async function loadAdminUsers() {
  if (!isManager()) return;
  state.usersLoading = true;
  renderDashboard();

  try {
    const data = await request("/api/admin/manager/users");
    state.users = data.users || [];
  } catch (error) {
    if (error.status === 401) {
      state.admin = null;
      renderLogin();
      return;
    }
    alert(error.message);
  } finally {
    state.usersLoading = false;
    if (state.admin && state.view === "users") renderDashboard();
  }
}

async function createAdminUser(event) {
  event.preventDefault();

  // event.currentTarget fica nulo depois de um await em alguns navegadores.
  // Guardamos a referência do formulário antes da requisição assíncrona.
  const form = event.currentTarget;
  const button = document.getElementById("createUserButton");
  const message = document.getElementById("userCreateMessage");

  const role = document.getElementById("newUserRole").value;
  const body = {
    name: document.getElementById("newUserName").value.trim(),
    login: document.getElementById("newUserLogin").value.trim(),
    email: document.getElementById("newUserEmail").value.trim(),
    role,
    unitId: role === "operator" ? document.getElementById("newUserUnit").value : null,
    senha: document.getElementById("newUserPassword").value
  };

  button.disabled = true;
  button.textContent = "Criando...";
  message.className = "message";
  message.textContent = "";

  try {
    await request("/api/admin/manager/users", {
      method: "POST",
      body: JSON.stringify(body)
    });

    form.reset();
    message.className = "message success";
    message.textContent = "Usuário criado com sucesso.";
    await loadAdminUsers();
  } catch (error) {
    message.className = "message error";
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = "Criar usuário";
  }
}

async function saveAdminUser(userId, button) {
  const name = document.querySelector(`[data-user-name="${userId}"]`)?.value.trim();
  const login = document.querySelector(`[data-user-login="${userId}"]`)?.value.trim();
  const email = document.querySelector(`[data-user-email="${userId}"]`)?.value.trim();
  const role = document.querySelector(`[data-user-role="${userId}"]`)?.value;
  const unitId = role === "operator"
    ? document.querySelector(`[data-user-unit="${userId}"]`)?.value
    : null;
  const activeInput = document.querySelector(`[data-user-active="${userId}"]`);
  const active = activeInput ? activeInput.checked : true;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Salvando...";

  try {
    const data = await request(`/api/admin/manager/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ name, login, email, role, unitId, active })
    });

    if (Number(userId) === Number(state.admin.id)) {
      state.admin = {
        ...state.admin,
        name: data.user.name,
        login: data.user.login,
        email: data.user.email,
        role: data.user.role,
        unitId: data.user.unitId || null
      };
    }

    await loadAdminUsers();
  } catch (error) {
    alert(error.message);
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function resetAdminUserPassword(userId) {
  const user = state.users.find((item) => Number(item.id) === Number(userId));
  if (!user) return;

  const senha = window.prompt(
    `Digite a nova senha para ${user.name} (mínimo 8 caracteres):`
  );

  if (senha === null) return;
  if (senha.length < 8) {
    alert("A nova senha deve ter pelo menos 8 caracteres.");
    return;
  }

  const confirmacao = window.prompt("Digite a nova senha novamente:");
  if (confirmacao === null) return;

  if (senha !== confirmacao) {
    alert("As senhas não coincidem.");
    return;
  }

  try {
    await request(`/api/admin/manager/users/${userId}/password`, {
      method: "PATCH",
      body: JSON.stringify({ senha })
    });
    alert("Senha redefinida com sucesso.");
  } catch (error) {
    alert(error.message);
  }
}

async function navigateManager(view) {
  if (!isManager()) return;
  state.view = view;
  state.selectedOrder = null;
  state.selectedProduct = null;
  state.productSearch = "";
  state.productCategory = "";

  if (["products", "stock", "categories", "promotions"].includes(view)) {
    await loadManagerCatalog();
  } else if (view === "settings") {
    await loadSettings();
  } else if (view === "users") {
    await loadAdminUsers();
  } else {
    renderDashboard();
  }
}

function applyFilters() {
  state.search = document.getElementById("searchInput").value.trim();
  state.filterStatus = document.getElementById("statusFilter").value;
  loadOrders();
}

async function openOrder(orderNumber) {
  try {
    const data = await request(`/api/admin/orders/${encodeURIComponent(orderNumber)}`);
    state.selectedOrder = data.order;
    renderDashboard();
  } catch (error) {
    alert(error.message);
  }
}

function closeOrder() {
  state.selectedOrder = null;
  renderDashboard();
}

async function updateOrderStatus() {
  if (!state.selectedOrder) return;
  const select = document.getElementById("orderStatusSelect");
  const button = document.getElementById("saveStatusButton");
  const message = document.getElementById("statusMessage");
  button.disabled = true;
  button.textContent = "Salvando...";
  message.className = "message";
  message.textContent = "";

  try {
    await request(`/api/admin/orders/${encodeURIComponent(state.selectedOrder.orderNumber)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ orderStatus: select.value })
    });
    state.selectedOrder.orderStatus = select.value;
    await loadOrders();
    await openOrder(state.selectedOrder.orderNumber);
  } catch (error) {
    message.className = "message error";
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = "Salvar status";
  }
}

function blankProduct() {
  return {
    id: null,
    name: "",
    description: "",
    category: state.categories[0]?.name || "",
    price: "",
    stockQuantity: 0,
    unitStock: Object.fromEntries(ADMIN_UNITS.map((unit) => [
      unit.id,
      { stockQuantity: 0, active: true }
    ])),
    imageUrl: null,
    active: true,
    promotionPrice: null,
    promotionActive: false,
    promotionStartsAt: null,
    promotionEndsAt: null
  };
}

function openProduct(id = null) {
  const product = id == null
    ? blankProduct()
    : state.products.find((item) => Number(item.id) === Number(id));

  if (!product) {
    alert("Produto não encontrado.");
    return;
  }

  state.selectedProduct = { ...product };
  state.pendingImageData = null;
  state.removeProductImage = false;
  renderDashboard();
}

function closeProduct() {
  state.selectedProduct = null;
  state.pendingImageData = null;
  state.removeProductImage = false;
  renderDashboard();
}

function openPromotionChooser() {
  const first = state.products.find((product) => !product.promotionActive) || state.products[0];
  if (!first) {
    alert("Cadastre um produto antes de criar uma promoção.");
    return;
  }

  openProduct(first.id);

  // Ao entrar por "Criar promoção", a oferta já começa habilitada.
  // Assim o gerente só informa o valor (e datas, se quiser).
  if (state.selectedProduct) {
    state.selectedProduct.promotionActive = true;
    renderDashboard();
  }

  requestAnimationFrame(() => document.getElementById("promotionPrice")?.focus());
}

async function resizeImageFile(file) {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
    throw new Error("Use uma imagem JPG, PNG ou WEBP.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("A imagem original deve ter no máximo 8 MB.");
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagem inválida."));
    img.src = dataUrl;
  });

  const maxSize = 1000;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/webp", 0.84);
}

async function handleProductImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    state.pendingImageData = await resizeImageFile(file);
    state.removeProductImage = false;
    const preview = document.getElementById("productImagePreview");
    if (preview) preview.innerHTML = `<img src="${state.pendingImageData}" alt="Prévia do produto">`;
    const remove = document.getElementById("removeProductImage");
    if (remove) remove.checked = false;
  } catch (error) {
    alert(error.message);
    event.target.value = "";
  }
}

function isoFromLocalInput(id) {
  const value = document.getElementById(id)?.value;
  return value ? new Date(value).toISOString() : null;
}

async function saveProduct(event) {
  event.preventDefault();
  if (!state.selectedProduct) return;

  const button = document.getElementById("saveProductButton");
  const message = document.getElementById("productMessage");
  button.disabled = true;
  button.textContent = "Salvando...";
  message.className = "message";
  message.textContent = "";

  const body = {
    name: document.getElementById("productName").value.trim(),
    description: document.getElementById("productDescription").value.trim(),
    category: document.getElementById("productCategory").value,
    price: Number(document.getElementById("productPrice").value),
    unitStock: Object.fromEntries(ADMIN_UNITS.map((unit) => [
      unit.id,
      {
        stockQuantity: Number(document.getElementById(`productUnitStock-${unit.id}`).value),
        active: document.getElementById(`productUnitActive-${unit.id}`).checked
      }
    ])),
    active: document.getElementById("productActive").checked,
    promotionActive: document.getElementById("promotionActive").checked,
    promotionPrice: document.getElementById("promotionPrice").value,
    promotionStartsAt: isoFromLocalInput("promotionStartsAt"),
    promotionEndsAt: isoFromLocalInput("promotionEndsAt"),
    imageData: state.pendingImageData,
    removeImage: state.removeProductImage
  };

  try {
    const isNew = state.selectedProduct.id == null;
    await request(
      isNew ? "/api/admin/manager/products" : `/api/admin/manager/products/${state.selectedProduct.id}`,
      {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(body)
      }
    );

    state.selectedProduct = null;
    state.pendingImageData = null;
    state.removeProductImage = false;
    await loadManagerCatalog();
  } catch (error) {
    message.className = "message error";
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = "Salvar produto";
  }
}

async function saveStock(productId, button) {
  const input = document.querySelector(`[data-stock-input="${productId}"]`);
  const activeInput = document.querySelector(`[data-stock-active="${productId}"]`);
  if (!input || !activeInput) return;

  button.disabled = true;
  button.textContent = "Salvando...";

  try {
    await request(`/api/admin/manager/products/${productId}/stock`, {
      method: "PATCH",
      body: JSON.stringify({
        unitId: state.stockUnit,
        stockQuantity: Number(input.value),
        active: activeInput.checked
      })
    });
    await loadManagerCatalog();
  } catch (error) {
    alert(error.message);
    button.disabled = false;
    button.textContent = "Salvar";
  }
}

async function createCategory(event) {
  event.preventDefault();
  const input = document.getElementById("categoryName");
  const iconInput = document.querySelector('input[name="categoryIcon"]:checked');
  const button = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
  const message = document.getElementById("categoryMessage");

  if (!iconInput) {
    message.className = "message error";
    message.textContent = "Escolha um ícone para a categoria.";
    return;
  }

  button.disabled = true;
  button.textContent = "Adicionando...";
  message.textContent = "";
  message.className = "message";

  try {
    await request("/api/admin/manager/categories", {
      method: "POST",
      body: JSON.stringify({
        name: input.value.trim(),
        icon: iconInput.value
      })
    });
    await loadManagerCatalog();
  } catch (error) {
    message.className = "message error";
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = "Adicionar categoria";
  }
}

async function saveCategoryIcon(categoryId, button) {
  const select = document.querySelector(`[data-category-icon-select="${categoryId}"]`);
  if (!select) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Salvando...";

  try {
    await request(`/api/admin/manager/categories/${categoryId}/icon`, {
      method: "PATCH",
      body: JSON.stringify({ icon: select.value })
    });
    await loadManagerCatalog();
  } catch (error) {
    alert(error.message);
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function bootstrap() {
  try {
    const data = await request("/api/admin/auth/me");
    state.admin = data.admin;
    state.view = "orders";
    await loadDashboardData();
  } catch (error) {
    state.admin = null;
    renderLogin();
  }
}

setInterval(() => {
  if (
    state.admin &&
    state.view === "orders" &&
    !state.selectedOrder &&
    !state.selectedProduct &&
    !state.loading
  ) {
    loadOrders();
  }
}, 30000);

// Estoque/preços/promoções podem mudar enquanto o gerente deixa a tela aberta.
// Atualiza o catálogo em segundo plano sem abrir tela de carregamento.
setInterval(async () => {
  const managerViews = ["products", "stock", "categories", "promotions"];

  if (
    state.admin &&
    isManager() &&
    managerViews.includes(state.view) &&
    !state.selectedProduct &&
    !state.selectedOrder &&
    !state.catalogLoading
  ) {
    await loadManagerCatalog(false);

    if (state.admin && managerViews.includes(state.view)) {
      renderDashboard();
    }
  }
}, 20000);

bootstrap();
