function home() {
    return `
        <section class="hero">

            <div class="logo">
                <img
                    src="LOGO-POLO-NORTE.png"
                    alt="Polo Norte Bebidas"
                    class="logo-img logo-img-hero"
                >
            </div>

            <h1>
                Bebidas geladas<br>
                <span>na sua porta!</span>
            </h1>

            <div class="beneficios">
                <div class="beneficio">
                    ${icon("relogio", 14)}
                    Entrega em até 60 min
                </div>

                <div class="beneficio">
                    ${icon("escudo", 14)}
                    Pagamento 100% seguro
                </div>

                <div class="beneficio">
                    ${icon("floco", 14)}
                    Bebidas sempre geladas
                </div>
            </div>

        </section>

        <main class="container">

            <h1 class="titulo">
                ${icon("pin", 22)}
                Escolha sua unidade
            </h1>

            <p class="subtitulo">
                Selecione a unidade mais próxima de você
            </p>

            <div class="unidades">

                ${unidades.map(unidade => `
                    <button
                        class="unidade"
                        onclick="escolherUnidade('${unidade.id}')"
                    >

                        <div class="unidade-img">
                            ${icon("loja", 30)}
                        </div>

                        <div class="unidade-info">

                            <h3>${unidade.nome}</h3>

                            <p>
                                ${icon("pin", 13)}
                                ${unidade.endereco}
                            </p>

                            <span class="aberto">
                                <span class="ponto"></span>
                                Aberto até 00:00
                            </span>

                        </div>

                        <span class="unidade-seta">
                            ${icon("seta", 18)}
                        </span>

                    </button>
                `).join("")}

            </div>

        </main>
    `;
}

function cardProduto(produto) {
    return `
        <article class="produto">

            ${
                produto.precoOriginal
                    ? `
                    <span class="badge-desconto">
                        -${Math.round(
                            (
                                1 -
                                produto.preco /
                                produto.precoOriginal
                            ) * 100
                        )}%
                    </span>
                    `
                    : ""
            }

            <button
                class="favorito
                ${
                    estado.favoritos.has(produto.id)
                        ? "ativo"
                        : ""
                }"
                onclick="alternarFavorito(event, ${produto.id})"
                aria-label="${
                    estado.favoritos.has(produto.id)
                        ? "Remover dos favoritos"
                        : "Adicionar aos favoritos"
                }"
            >
                ${icon("coracao", 14)}
            </button>

            <div
                class="produto-img ${classeCategoria(produto.categoria)}"
            >
                ${produto.emoji}
            </div>

            <h3>${produto.nome}</h3>

            <p>${produto.detalhe}</p>

            <div class="produto-preco">

                ${
                    produto.precoOriginal
                        ? `
                        <span class="preco-antigo">
                            ${dinheiro(produto.precoOriginal)}
                        </span>
                        `
                        : ""
                }

                <span class="preco">
                    ${dinheiro(produto.preco)}
                </span>

            </div>

            <button
                class="add"
                onclick="adicionar(${produto.id})"
                aria-label="Adicionar ${produto.nome} ao carrinho"
            >
                +
            </button>

        </article>
    `;
}

function carrinhoFlutuante() {
    if (quantidadeCarrinho() <= 0) {
        return "";
    }

    return `
        <div class="carrinho-flutuante">

            <div class="info">
                <small>
                    ${quantidadeCarrinho()} itens
                </small>

                <strong>
                    ${dinheiro(totalPedido())}
                </strong>
            </div>

            <button onclick="ir('carrinho')">
                Ver carrinho
                ${icon("seta", 15)}
            </button>

        </div>
    `;
}

function menu() {
    const categorias = Object.keys(categoriasInfo);

    const lista = produtos.filter(produto => {
        const categoriaOK =
            estado.categoria === "Todos" ||
            produto.categoria === estado.categoria;

        const buscaOK =
            produto.nome
                .toLowerCase()
                .includes(estado.busca.toLowerCase());

        return categoriaOK && buscaOK;
    });

    return `
        ${estado.voltarCatalogoPara ? header(null, "voltarCatalogo()") : header()}

        <main class="container">

            <button
                type="button"
                class="loja-header loja-header-botao"
                onclick="trocarUnidade()"
                aria-label="Trocar unidade"
            >

                <div class="loja-thumb">
                    ${icon("loja", 26)}
                </div>

                <div class="loja-header-info">

                    <small>
                        ${icon("pin", 12)}
                        Unidade selecionada
                    </small>

                    <h2>${estado.unidade.nome}</h2>

                    <span class="status">
                        ● Aberto até 00:00 · Entrega rápida
                    </span>

                </div>

                <div class="loja-trocar">
                    <span>Trocar</span>
                    ${icon("seta", 17)}
                </div>

            </button>

            <div class="busca">

                ${icon("busca", 18)}

                <input
                    placeholder="Buscar bebidas, marcas e mais..."
                    value="${estado.busca}"
                    oninput="
                        estado.busca=this.value;
                        render()
                    "
                >

                <button
                    class="filtro-btn"
                    onclick="emBreve()"
                >
                    ${icon("filtro", 18)}
                </button>

            </div>

            <div class="categorias">

                ${categorias.map(categoria => `
                    <button
                        class="categoria-item
                        ${estado.categoria === categoria ? "ativo" : ""}"

                        onclick="
                            estado.categoria='${categoria}';
                            render()
                        "
                    >

                        <span class="categoria-icone">
                            ${icon(
                                categoriasInfo[categoria].icone,
                                20
                            )}
                        </span>

                        ${categoria}

                    </button>
                `).join("")}

            </div>

            <section class="secao-produtos">

                <div class="secao-topo">

                    <h2>
                        ${
                            estado.categoria === "Todos"
                                ? "Mais pedidos"
                                : estado.categoria
                        }
                    </h2>

                </div>

                <div class="produtos">

                    ${lista.map(cardProduto).join("")}

                </div>

            </section>

        </main>

        ${carrinhoFlutuante()}

        ${bottomNav("home")}
    `;
}
