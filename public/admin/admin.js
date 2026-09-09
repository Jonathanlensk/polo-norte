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
  selectedOrder: null,
  selectedProduct: null,
  pendingImageData: null,
  removeProductImage: false,
  loading: false,
  catalogLoading: false,
  filterStatus: "",
  search: "",
  productSearch: "",
  productCategory: "",
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
            <label for="adminEmail">E-mail</label>
            <input id="adminEmail" type="email" autocomplete="username" required>
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

      ${MANAGER_MENU.map(([view, icon, name, description]) => {
        const implemented = !["settings", "users"].includes(view);
        return `
          <button
            class="manager-menu-item ${state.view === view ? "active" : ""}"
            type="button"
            ${implemented ? `data-manager-view="${view}"` : `data-manager-future="${escapeHtml(name)}"`}
          >
            <span class="menu-icon">${icon}</span>
            <span>
              <strong>${escapeHtml(name)}</strong>
              <small>${escapeHtml(description)}</small>
            </span>
            ${implemented ? "" : "<em>Próxima etapa</em>"}
          </button>
        `;
      }).join("")}
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
          <span>${escapeHtml(state.admin.email)}</span>
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
          ${isManager() ? renderManagerOverview() : ""}
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
        <p>Acompanhe e atualize os pedidos da loja.</p>
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
                <th>Estoque</th>
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
                  <td><span class="stock-badge ${product.stockQuantity <= 5 ? "low" : ""}">${product.stockQuantity}</span></td>
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

  return `
    <div class="page-title-row">
      <div>
        <h1>Estoque</h1>
        <p>Atualize rapidamente a quantidade disponível para venda.</p>
      </div>
      <button class="secondary-button" id="reloadCatalogButton">Atualizar estoque</button>
    </div>

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

      <div class="stock-grid">
        ${products.map((product) => `
          <article class="stock-card ${product.stockQuantity <= 5 ? "stock-card-low" : ""}">
            ${productImage(product, "stock-thumb")}
            <div class="stock-copy">
              <strong>${escapeHtml(product.name)}</strong>
              <span>${escapeHtml(product.category)}</span>
            </div>
            <label>
              Quantidade
              <input type="number" min="0" step="1" value="${product.stockQuantity}" data-stock-input="${product.id}">
            </label>
            <button class="primary-button" data-save-stock="${product.id}">Salvar</button>
          </article>
        `).join("") || `<div class="empty-state">Nenhum produto encontrado.</div>`}
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
                <div>
                  <strong>${escapeHtml(category.name)}</strong>
                  <span>${count} produto(s)</span>
                </div>
                <span class="badge approved">Ativa</span>
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
              <div class="form-row">
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
                <div class="field">
                  <label for="productStock">Estoque</label>
                  <input id="productStock" type="number" min="0" step="1" value="${product.stockQuantity ?? 0}" required>
                </div>
              </div>
              <label class="switch-line">
                <input id="productActive" type="checkbox" ${product.active !== false ? "checked" : ""}>
                <span>Produto ativo no catálogo</span>
              </label>
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

  document.querySelectorAll("[data-manager-future]").forEach((button) => {
    button.addEventListener("click", () => {
      alert(`${button.dataset.managerFuture}: vamos construir essa área depois do catálogo.`);
    });
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

  document.getElementById("newProductButton")?.addEventListener("click", () => openProduct());
  document.getElementById("newPromotionButton")?.addEventListener("click", openPromotionChooser);
  document.getElementById("reloadCatalogButton")?.addEventListener("click", loadManagerCatalog);

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
  const email = document.getElementById("adminEmail").value.trim();
  const senha = document.getElementById("adminSenha").value;
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Entrando...";

  try {
    const data = await request("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha })
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

async function navigateManager(view) {
  if (!isManager()) return;
  state.view = view;
  state.selectedOrder = null;
  state.selectedProduct = null;
  state.productSearch = "";
  state.productCategory = "";

  if (["products", "stock", "categories", "promotions"].includes(view)) {
    await loadManagerCatalog();
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
    stockQuantity: Number(document.getElementById("productStock").value),
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
  if (!input) return;
  button.disabled = true;
  button.textContent = "Salvando...";

  try {
    await request(`/api/admin/manager/products/${productId}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ stockQuantity: Number(input.value) })
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
  const button = event.submitter;
  const message = document.getElementById("categoryMessage");
  button.disabled = true;
  button.textContent = "Adicionando...";
  message.textContent = "";
  message.className = "message";

  try {
    await request("/api/admin/manager/categories", {
      method: "POST",
      body: JSON.stringify({ name: input.value.trim() })
    });
    await loadManagerCatalog();
  } catch (error) {
    message.className = "message error";
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = "Adicionar categoria";
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
