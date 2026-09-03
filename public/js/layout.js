function header(voltar = null, acaoVoltar = null) {
    const temVoltar = Boolean(voltar || acaoVoltar);
    const onclickVoltar = acaoVoltar || (voltar ? `ir('${voltar}')` : "");

    return `
        <header class="header">

            ${
                temVoltar
                    ? `
                        <button
                            class="header-btn"
                            onclick="${onclickVoltar}"
                            aria-label="Voltar"
                        >
                            ${icon("voltar", 20)}
                        </button>
                    `
                    : `
                        <div
                            class="header-placeholder"
                            aria-hidden="true"
                        ></div>
                    `
            }

            <div class="logo" onclick="irInicio()" style="cursor:pointer">
                <img
                    src="LOGO-POLO-NORTE.png"
                    alt="Polo Norte Bebidas"
                    class="logo-img logo-img-header"
                >
            </div>

            <button
                class="header-btn header-cart"
                onclick="ir('carrinho')"
                aria-label="Abrir carrinho"
            >
                ${icon("carrinho", 20)}

                ${quantidadeCarrinho()
                    ? `<span class="badge">
                        ${quantidadeCarrinho()}
                    </span>`
                    : ""
                }
            </button>

        </header>
    `;
}

function etapas(atual) {
    const lista = [
        "Carrinho",
        "Endereço",
        "Entrega",
        "Pagamento",
        "Confirmação"
    ];

    return `
        <div class="etapas">

            ${lista.map((item, index) => `
                <div class="
                    etapa
                    ${index === atual ? "ativa" : ""}
                    ${index < atual ? "feita" : ""}
                ">
                    <div class="etapa-bolha">
                        ${
                            index < atual
                                ? icon("check", 14)
                                : index + 1
                        }
                    </div>

                    <div class="etapa-nome">
                        ${item}
                    </div>
                </div>
            `).join("")}

        </div>
    `;
}

function bottomNav(ativo = "") {
    const itens = [
        {
            id: "home",
            nome: "Início",
            icone: "casa",
            tela: "home"
        },
        {
            id: "pedidos",
            nome: "Pedidos",
            icone: "caixa",
            tela: "pedidos"
        },
        {
            id: "favoritos",
            nome: "Favoritos",
            icone: "coracao",
            tela: "favoritos"
        },
        {
            id: "perfil",
            nome: "Perfil",
            icone: "usuario",
            tela: "perfil"
        }
    ];

    return `
        <nav class="bottom-nav">

            ${itens.map(item => `
                <button
                    class="nav-item
                    ${ativo === item.id ? "ativo" : ""}"

                    onclick="${
                        item.id === "home"
                            ? "irInicio()"
                            : item.id === "pedidos"
                                ? "abrirMeusPedidos()"
                                : item.tela
                                    ? `ir('${item.tela}')`
                                    : "emBreve()"
                    }"
                >
                    ${icon(item.icone, 23)}
                    ${item.nome}
                </button>
            `).join("")}

        </nav>
    `;
}
