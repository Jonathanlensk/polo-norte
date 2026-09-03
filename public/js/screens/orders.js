function pedidosTela() {
    return `
        ${header(null, "irInicio()")}

        <main class="container pedidos-mobile">
            <div class="pedidos-cabecalho">
                <h1>Meus pedidos</h1>
                <p>Acompanhe seus pedidos da Polo Norte.</p>
            </div>

            ${conteudoPedidos()}
        </main>

        ${bottomNav("pedidos")}
    `;
}

function conteudoPedidos() {
    if (!estado.cliente) {
        return `
            <section class="pedidos-vazio">
                <div class="pedidos-vazio-icone">
                    ${icon("usuario", 28)}
                </div>

                <h2>Entre para ver seus pedidos</h2>

                <p>
                    Seus pedidos ficam salvos na sua conta
                    para você acompanhar quando quiser.
                </p>

                <button
                    class="botao-principal"
                    onclick="ir('perfil')"
                >
                    Entrar na minha conta
                </button>
            </section>
        `;
    }

    if (estado.carregandoPedidos) {
        return `
            <section class="pedidos-carregando">
                <div class="spinner"></div>
                <strong>Carregando seus pedidos...</strong>
            </section>
        `;
    }

    if (estado.erroPedidos) {
        return `
            <section class="pedidos-vazio">
                <div class="pedidos-vazio-icone erro">
                    ${icon("info", 28)}
                </div>

                <h2>Não conseguimos carregar</h2>
                <p>${estado.erroPedidos}</p>

                <button
                    class="botao-principal"
                    onclick="abrirMeusPedidos()"
                >
                    Tentar novamente
                </button>
            </section>
        `;
    }

    if (!estado.pedidos.length) {
        return `
            <section class="pedidos-vazio">
                <div class="pedidos-vazio-icone">
                    ${icon("caixa", 30)}
                </div>

                <h2>Nenhum pedido ainda</h2>

                <p>
                    Quando você fizer sua primeira compra,
                    ela vai aparecer aqui.
                </p>

                <button
                    class="botao-principal"
                    onclick="irInicio()"
                >
                    Fazer um pedido
                </button>
            </section>
        `;
    }

    return `
        <div class="pedidos-lista">
            ${estado.pedidos.map((pedido) => {
                const status = infoStatusPedido(pedido);

                return `
                    <button
                        class="pedido-lista-card"
                        onclick="abrirPedido('${pedido.orderNumber}')"
                    >
                        <div class="pedido-lista-topo">
                            <div>
                                <span class="pedido-lista-label">
                                    Pedido
                                </span>
                                <strong>${pedido.orderNumber}</strong>
                            </div>

                            <span class="pedido-status ${status.classe}">
                                ${status.texto}
                            </span>
                        </div>

                        <div class="pedido-lista-info">
                            <span>
                                ${formatarDataPedido(pedido.createdAt)}
                            </span>

                            <strong>${dinheiro(pedido.total)}</strong>
                        </div>

                        <div class="pedido-lista-acao">
                            Ver pedido
                            ${icon("seta", 16)}
                        </div>
                    </button>
                `;
            }).join("")}
        </div>
    `;
}

function pedidoTela() {
    const voltar = estado.cliente
        ? "abrirMeusPedidos()"
        : "ir('confirmacao')";

    return `
        ${header(null, voltar)}

        <main class="container pedido-detalhe-mobile">
            ${conteudoPedidoDetalhe()}
        </main>

        ${estado.cliente ? bottomNav("pedidos") : ""}
    `;
}

function conteudoPedidoDetalhe() {
    if (estado.carregandoPedido) {
        return `
            <section class="pedidos-carregando">
                <div class="spinner"></div>
                <strong>Carregando pedido...</strong>
            </section>
        `;
    }

    if (estado.erroPedido) {
        return `
            <section class="pedidos-vazio">
                <div class="pedidos-vazio-icone erro">
                    ${icon("info", 28)}
                </div>

                <h2>Pedido não encontrado</h2>
                <p>${estado.erroPedido}</p>

                <button
                    class="botao-principal"
                    onclick="abrirMeusPedidos()"
                >
                    Voltar para meus pedidos
                </button>
            </section>
        `;
    }

    const pedido = estado.pedidoSelecionado;

    if (!pedido) {
        return "";
    }

    const status = infoStatusPedido(pedido);
    const timeline = etapasAcompanhamento(pedido);

    return `
        <section class="pedido-detalhe-cabecalho">
            <span>Pedido</span>
            <h1>${pedido.orderNumber}</h1>

            <div class="pedido-detalhe-data">
                ${formatarDataPedido(pedido.createdAt)}
            </div>

            <span class="pedido-status grande ${status.classe}">
                ${status.texto}
            </span>
        </section>

        <section class="pedido-bloco">
            <h2>Acompanhe seu pedido</h2>

            <div class="pedido-timeline">
                ${timeline.map((etapa, index) => `
                    <div class="timeline-item ${etapa.estado}">
                        <div class="timeline-coluna">
                            <div class="timeline-bolha">
                                ${etapa.estado === "concluida"
                                    ? icon("check", 14)
                                    : index + 1}
                            </div>

                            ${index < timeline.length - 1
                                ? '<div class="timeline-linha"></div>'
                                : ''}
                        </div>

                        <div class="timeline-texto">
                            <strong>${etapa.titulo}</strong>
                            <span>${etapa.descricao}</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        </section>

        <section class="pedido-bloco">
            <h2>Itens do pedido</h2>

            <div class="pedido-itens">
                ${(pedido.items || []).map((item) => `
                    <div class="pedido-item-linha">
                        <div>
                            <strong>${item.quantity}x</strong>
                            <span>${item.productName}</span>
                        </div>

                        <strong>${dinheiro(item.subtotal)}</strong>
                    </div>
                `).join("")}
            </div>

            <div class="pedido-resumo-linha">
                <span>Subtotal</span>
                <strong>${dinheiro(pedido.subtotal)}</strong>
            </div>

            <div class="pedido-resumo-linha">
                <span>Entrega</span>
                <strong>
                    ${Number(pedido.deliveryFee) === 0
                        ? "Grátis"
                        : dinheiro(pedido.deliveryFee)}
                </strong>
            </div>

            <div class="pedido-resumo-linha total">
                <span>Total</span>
                <strong>${dinheiro(pedido.total)}</strong>
            </div>
        </section>

        <section class="pedido-bloco">
            <h2>Entrega</h2>

            <div class="pedido-info-com-icone">
                <div class="pedido-info-icone">
                    ${icon("pin", 19)}
                </div>

                <div>
                    <strong>Endereço de entrega</strong>
                    <span>${pedido.deliveryAddress}</span>

                    ${pedido.deliveryReference
                        ? `<small>Referência: ${pedido.deliveryReference}</small>`
                        : ""}
                </div>
            </div>
        </section>

        <section class="pedido-bloco">
            <h2>Pagamento</h2>

            <div class="pedido-info-com-icone">
                <div class="pedido-info-icone">
                    ${icon("cartao", 19)}
                </div>

                <div>
                    <strong>${textoMetodoPagamento(pedido.paymentMethod)}</strong>
                    <span>
                        ${pedido.paymentStatus === "approved"
                            ? "Pagamento aprovado"
                            : pedido.paymentStatus === "pending"
                                ? "Aguardando pagamento"
                                : "Pagamento não aprovado"}
                    </span>
                </div>
            </div>
        </section>
    `;
}
