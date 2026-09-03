function carrinho() {
    const itens = Object.entries(estado.carrinho);

    return `
        ${header("menu")}
        ${etapas(0)}

        <main class="container">

            <div class="carrinho-topo">

                <h1 class="titulo">
                    Seu carrinho
                </h1>

                ${
                    itens.length
                        ? `
                        <button
                            class="limpar-carrinho"
                            onclick="limparCarrinho()"
                        >
                            ${icon("lixo", 14)}
                            Limpar carrinho
                        </button>
                        `
                        : ""
                }

            </div>

            ${
                !itens.length
                    ? `
                    <div class="vazio">

                        <div class="icone-vazio">
                            ${icon("carrinho", 40)}
                        </div>

                        <p>
                            Seu carrinho está vazio.
                        </p>

                        <button
                            class="botao-principal"
                            onclick="ir('menu')"
                        >
                            Ver bebidas
                            ${icon("seta", 16)}
                        </button>

                    </div>
                    `
                    : itens.map(([id, quantidade]) => {
                        const produto = produtoPorId(id);

                        return `
                            <div class="item-carrinho">

                                <div class="
                                    item-img
                                    ${classeCategoria(
                                        produto.categoria
                                    )}
                                ">
                                    ${produto.emoji}
                                </div>

                                <div class="item-info">

                                    <h3>${produto.nome}</h3>

                                    <small>
                                        ${produto.detalhe}
                                        ·
                                        ${dinheiro(produto.preco)}
                                        cada
                                    </small>

                                    <div class="quantidade">

                                        <button
                                            onclick="remover(${produto.id})"
                                        >
                                            −
                                        </button>

                                        <span>
                                            ${quantidade}
                                        </span>

                                        <button
                                            onclick="adicionar(${produto.id})"
                                        >
                                            +
                                        </button>

                                    </div>

                                </div>

                                <div class="item-lado">

                                    <button
                                        class="item-excluir"
                                        onclick="
                                            excluirProduto(
                                                ${produto.id}
                                            )
                                        "
                                    >
                                        ${icon("lixo", 14)}
                                    </button>

                                    <strong>
                                        ${dinheiro(
                                            produto.preco * quantidade
                                        )}
                                    </strong>

                                </div>

                            </div>
                        `;
                    }).join("")
            }

            ${
                itens.length
                    ? `
                    ${resumoPedido()}

                    <div class="seguranca">

                        ${icon("escudo", 22)}

                        <div>

                            <strong>
                                Pagamento 100% seguro
                            </strong>

                            <small>
                                Seus dados protegidos
                                e criptografados.
                            </small>

                            <div class="metodos">
                                <span class="metodo-chip">Pix</span>
                                <span class="metodo-chip">Visa</span>
                                <span class="metodo-chip">Mastercard</span>
                                <span class="metodo-chip">Elo</span>
                            </div>

                        </div>

                    </div>
                    `
                    : ""
            }

            <button
                class="botao-principal"
                onclick="ir('endereco')"
                ${!itens.length ? "disabled" : ""}
            >
                Continuar para entrega
                ${icon("seta", 16)}
            </button>

        </main>

        ${bottomNav()}
    `;
}
